import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

type AnalysisMode = "plano" | "cruzamento" | "balanco";

interface RequestBody {
  messages: ChatMessage[];
  mode: AnalysisMode;
  attachments?: Array<{
    name: string;
    mime: string;
    dataUrl: string;
    kind: "image" | "file";
  }>;
  filters: {
    // Data sources
    includeSugestoes?: boolean;
    includePropostas?: boolean;
    includeDocumentos?: boolean;
    // Location
    regiao?: string;
    cidade?: string;
    // Thematic
    eixo?: string;
    tema?: string;
    subtema?: string;
    // Thematic IDs (preferred when provided)
    eixoId?: string;
    temaId?: string;
    subtemaId?: string;
    // Document specific
    documentIds?: string[];
    docCategory?: string[];
    temporalStatus?: string;
  };
  // For content generation mode
  contentType?: "release" | "discurso" | "nota_tecnica" | "proposta" | "relatorio";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error("Auth error:", userError);
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check user roles
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const userRoles = roles?.map(r => r.role) || [];
    const isAuthorized = userRoles.includes("admin") || userRoles.includes("lider_tematico");

    if (!isAuthorized) {
      console.log("User not authorized:", user.id, userRoles);
      return new Response(JSON.stringify({ error: "Acesso não autorizado" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: RequestBody = await req.json();
    const { messages, mode, filters, contentType, attachments } = body;

    // Validate input
    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "Mensagens inválidas" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch custom agent config: prefer mode-specific, fallback to generic
    const modeAgentType = `plano_governo_${mode}`;
    const [modeConfigResult, genericConfigResult, legacyKnowledgeResult] = await Promise.all([
      supabase
        .from("ai_agent_config")
        .select("system_prompt, config")
        .eq("agent_type", modeAgentType)
        .eq("is_active", true)
        .maybeSingle(),
      supabase
        .from("ai_agent_config")
        .select("system_prompt, config")
        .eq("agent_type", "plano_governo")
        .eq("is_active", true)
        .maybeSingle(),
      supabase
        .from("ai_knowledge_base")
        .select("title, content")
        .eq("is_active", true)
        .order("priority", { ascending: false })
    ]);

    const customPrompt = modeConfigResult.data?.system_prompt || genericConfigResult.data?.system_prompt || null;
    const legacyKnowledgeDocs = legacyKnowledgeResult.data || [];

    // Build context data based on filters and mode
    let contextData = "";
    
    // Get eixo_id first if eixo filter is active (reuse for all queries)
    let eixoId: string | null = filters.eixoId || null;
    if (!eixoId && filters.eixo) {
      const { data: eixoData } = await supabase
        .from("eixos_tematicos")
        .select("id")
        .eq("nome", filters.eixo)
        .maybeSingle();
      eixoId = eixoData?.id || null;
    }
    if (eixoId) console.log("Eixo filter active:", filters.eixo, "-> ID:", eixoId);

    // Resolve tema/subtema IDs
    let temaId: string | null = filters.temaId || null;
    if (!temaId && filters.tema) {
      let q = supabase.from("temas").select("id").eq("nome", filters.tema);
      if (eixoId) q = q.eq("eixo_id", eixoId);
      const { data: temaData } = await q.maybeSingle();
      temaId = temaData?.id || null;
    }
    if (temaId) console.log("Tema filter:", filters.tema, "->", temaId);
    let subtemaId: string | null = filters.subtemaId || null;
    if (!subtemaId && filters.subtema) {
      let q = supabase.from("subtemas").select("id").eq("nome", filters.subtema);
      if (temaId) q = q.eq("tema_id", temaId);
      const { data: sData } = await q.maybeSingle();
      subtemaId = sData?.id || null;
    }
    if (subtemaId) console.log("Subtema filter:", filters.subtema, "->", subtemaId);

    // Strict scope flag — quando há tema/subtema, restringimos drasticamente o contexto
    const hasNarrowScope = !!(temaId || subtemaId);
    
    // Get municipalities for region filtering
    let municipioNames: string[] = [];
    if (filters.regiao) {
      const { data: municipiosRegiao } = await supabase
        .from("municipios")
        .select("nome")
        .eq("regiao", filters.regiao);
      municipioNames = municipiosRegiao?.map(m => m.nome) || [];
    }

    // Get municipio_id if cidade filter is active
    let municipioId: string | null = null;
    if (filters.cidade) {
      const { data: municipioData } = await supabase
        .from("municipios")
        .select("id")
        .eq("nome", filters.cidade)
        .maybeSingle();
      municipioId = municipioData?.id || null;
    }

    // 1. Fetch suggestions if enabled
    if (filters.includeSugestoes !== false) {
      let suggestionsQuery = supabase
        .from("sugestoes_populares")
        .select("descricao, municipio, eixo")
        .limit(50);

      if (filters.cidade) {
        suggestionsQuery = suggestionsQuery.eq("municipio", filters.cidade);
      } else if (municipioNames.length > 0) {
        suggestionsQuery = suggestionsQuery.in("municipio", municipioNames);
      }

      if (filters.eixo) {
        suggestionsQuery = suggestionsQuery.eq("eixo", filters.eixo);
      }

      const { data: suggestions } = await suggestionsQuery;
      console.log("Suggestions fetched:", suggestions?.length || 0);

      if (suggestions && suggestions.length > 0) {
        contextData += "\n\n=== SUGESTÕES POPULARES ===\n";
        suggestions.forEach((s, i) => {
          contextData += `${i + 1}. [${s.municipio}] ${s.eixo}: ${s.descricao}\n`;
        });
      }
    }

    // 2. Fetch technical proposals if enabled
    if (filters.includePropostas !== false) {
      // Estratégia: buscar TODAS as propostas correspondentes ao tema/subtema/eixo,
      // detalhar até 200 e, se exceder, resumir as demais agregadamente para
      // garantir que nenhum técnico ouvido seja omitido.
      const PROPOSAL_DETAIL_LIMIT = 200;

      let proposalsQuery = supabase
        .from("propostas_tecnicas")
        .select(`
          titulo,
          descricao,
          status,
          etapa,
          indicadores,
          metas,
          municipio_id,
          eixo_id,
          tema_id,
          subtema_id,
          entrevistado,
          representante_nome,
          representante_cargo,
          instituicao_nome,
          tipo_proposta,
          municipios(nome, regiao),
          eixos_tematicos(nome),
          temas(nome),
          subtemas(nome)
        `, { count: "exact" })
        .order("updated_at", { ascending: false });

      // Filtros temáticos hierárquicos
      if (subtemaId) {
        proposalsQuery = proposalsQuery.eq("subtema_id", subtemaId);
      } else if (temaId) {
        proposalsQuery = proposalsQuery.eq("tema_id", temaId);
      } else if (eixoId) {
        proposalsQuery = proposalsQuery.eq("eixo_id", eixoId);
      }

      // Filtro opcional por status temporal (espelha mapeamento usado para documentos).
      // REGRA: se NENHUM status for selecionado pelo usuário, incluímos TODAS as
      // propostas (rascunho, em_analise e aprovada). Só restringimos quando o
      // usuário escolher explicitamente um status no setup.
      const temporalToProposalStatus: Record<string, string> = {
        realizado: 'aprovada',
        em_andamento: 'em_analise',
        nao_iniciado: 'rascunho',
      };
      const proposalStatusFilter = filters.temporalStatus
        ? temporalToProposalStatus[filters.temporalStatus]
        : null;
      if (proposalStatusFilter) {
        proposalsQuery = proposalsQuery.eq('status', proposalStatusFilter);
      }

      // Filtros de localização
      if (municipioId) {
        proposalsQuery = proposalsQuery.eq("municipio_id", municipioId);
      } else if (filters.regiao && municipioNames.length > 0) {
        const { data: municipiosIds } = await supabase
          .from("municipios")
          .select("id")
          .eq("regiao", filters.regiao);
        if (municipiosIds && municipiosIds.length > 0) {
          proposalsQuery = proposalsQuery.in("municipio_id", municipiosIds.map(m => m.id));
        }
      }

      // Aplica limite de detalhamento (mas usamos `count` para ver o total real)
      proposalsQuery = proposalsQuery.limit(PROPOSAL_DETAIL_LIMIT);

      const { data: proposals, count: totalProposals } = await proposalsQuery;
      console.log(`Proposals fetched: ${proposals?.length || 0} of ${totalProposals ?? '?'} total matching`);

      if (proposals && proposals.length > 0) {
        const headerLine = `\n\n=== PROPOSTAS TÉCNICAS DOS ESPECIALISTAS (${proposals.length}${
          totalProposals && totalProposals > proposals.length ? ` de ${totalProposals}` : ''
        }) ===\n`;
        contextData += headerLine;
        contextData += proposalStatusFilter
          ? `OBRIGATÓRIO: O usuário restringiu o status para "${filters.temporalStatus}". Considere CADA UMA das ${proposals.length} propostas abaixo (já filtradas por status). Cite os técnicos/entrevistados pelo nome quando relevante.\n\n`
          : `OBRIGATÓRIO: NENHUM filtro de status foi aplicado — você DEVE considerar TODAS as ${proposals.length} propostas abaixo (rascunho, em análise e aprovadas), sem distinção. Cite os técnicos/entrevistados pelo nome quando relevante.\n\n`;

        proposals.forEach((p: any, i: number) => {
          const eixoNome = p.eixos_tematicos?.nome || 'N/A';
          const temaNome = p.temas?.nome || '';
          const subNome = p.subtemas?.nome || '';
          const municipioNome = p.municipios?.nome || 'Estadual';
          const autor = p.entrevistado
            || p.representante_nome
            || p.instituicao_nome
            || 'Técnico/entrevistado';
          const cargo = p.representante_cargo ? ` (${p.representante_cargo})` : '';

          contextData += `${i + 1}. [${p.status}] ${p.titulo}\n`;
          contextData += `   Autor/Entrevistado: ${autor}${cargo}\n`;
          contextData += `   Eixo: ${eixoNome}`;
          if (temaNome) contextData += ` | Tema: ${temaNome}`;
          if (subNome) contextData += ` | Subtema: ${subNome}`;
          contextData += ` | Município: ${municipioNome} | Etapa: ${p.etapa}\n`;
          if (p.descricao) {
            contextData += `   Descrição: ${p.descricao.substring(0, 400)}${p.descricao.length > 400 ? '...' : ''}\n`;
          }
          if (p.metas) contextData += `   Metas: ${p.metas.substring(0, 200)}${p.metas.length > 200 ? '...' : ''}\n`;
          if (p.indicadores) contextData += `   Indicadores: ${p.indicadores.substring(0, 200)}${p.indicadores.length > 200 ? '...' : ''}\n`;
          contextData += '\n';
        });

        // Se excedeu o limite, traz um sumário agregado das demais
        if (totalProposals && totalProposals > proposals.length) {
          let extraQuery = supabase
            .from("propostas_tecnicas")
            .select("titulo, entrevistado, representante_nome, instituicao_nome, status")
            .order("updated_at", { ascending: false })
            .range(proposals.length, Math.min(totalProposals, proposals.length + 500) - 1);
          if (subtemaId) extraQuery = extraQuery.eq("subtema_id", subtemaId);
          else if (temaId) extraQuery = extraQuery.eq("tema_id", temaId);
          else if (eixoId) extraQuery = extraQuery.eq("eixo_id", eixoId);
          if (municipioId) extraQuery = extraQuery.eq("municipio_id", municipioId);
          if (proposalStatusFilter) extraQuery = extraQuery.eq('status', proposalStatusFilter);
          const { data: extras } = await extraQuery;

          if (extras && extras.length > 0) {
            contextData += `--- PROPOSTAS ADICIONAIS DO MESMO TEMA (resumo, ${extras.length}) ---\n`;
            contextData += `As propostas abaixo também devem ser consideradas no plano. Citação resumida por limite de espaço — todas pertencem ao mesmo tema/eixo selecionado:\n`;
            extras.forEach((e: any, i: number) => {
              const autor = e.entrevistado || e.representante_nome || e.instituicao_nome || '—';
              contextData += `${proposals.length + i + 1}. [${e.status}] ${e.titulo} — Autor: ${autor}\n`;
            });
            contextData += '\n';
          }
        }
      } else if (temaId || subtemaId) {
        contextData += `\n\n=== PROPOSTAS TÉCNICAS ===\nNenhuma proposta técnica encontrada para o tema/subtema selecionado. Avise o usuário antes de inventar conteúdo.\n`;
      }
    }

    // 3. Fetch AI documents if enabled
    if (filters.includeDocumentos !== false) {
      // Quando o usuário restringe por tema/subtema, NÃO injetamos documentos amplos
      // automaticamente (eles podem trazer outros subtemas, ex: PELTi com telecom).
      // Só carregamos documentos se o usuário tiver SELECIONADO explicitamente
      // documentos por ID na lista.
      const hasExplicitDocs = !!(filters.documentIds && filters.documentIds.length > 0);
      if (hasNarrowScope && !hasExplicitDocs) {
        console.log("Narrow scope ativo (tema/subtema) sem documentos explícitos — pulando documentos amplos");
      } else {
      let docsQuery = supabase
        .from("ai_documents")
        .select(`
          title,
          description,
          content,
          doc_category,
          temporal_status,
          regiao,
          eixos_tematicos(nome),
          municipios(nome)
        `)
        .eq("is_active", true)
        .order("priority", { ascending: false })
        .limit(20);

      if (filters.documentIds && filters.documentIds.length > 0) {
        // Seleção explícita de documentos por ID tem prioridade
        docsQuery = docsQuery.in("id", filters.documentIds);
      } else if (filters.docCategory && filters.docCategory.length > 0) {
        docsQuery = docsQuery.in("doc_category", filters.docCategory);
      }

      if (filters.temporalStatus) {
        docsQuery = docsQuery.eq("temporal_status", filters.temporalStatus);
      }

      if (filters.regiao) {
        docsQuery = docsQuery.eq("regiao", filters.regiao);
      }

      if (eixoId) {
        docsQuery = docsQuery.eq("eixo_id", eixoId);
      }

      const { data: documents } = await docsQuery;

      if (documents && documents.length > 0) {
        const categoryLabels: Record<string, string> = {
          plano_governo: "Plano de Governo",
          documento_tecnico: "Documento Técnico",
          noticia: "Notícia",
          comprovacao: "Comprovação",
          investimento: "Investimento",
          promessa: "Promessa",
          legislacao: "Legislação",
          outro: "Outro"
        };

        const statusLabels: Record<string, string> = {
          realizado: "✅ Realizado",
          em_andamento: "🔄 Em Andamento",
          prometido: "⏳ Prometido",
          nao_iniciado: "○ Não Iniciado"
        };

        contextData += "\n\n=== DOCUMENTOS DA BASE DE CONHECIMENTO ===\n";
        documents.forEach((doc: any, i: number) => {
          const categoria = categoryLabels[doc.doc_category] || doc.doc_category;
          const status = doc.temporal_status ? statusLabels[doc.temporal_status] || doc.temporal_status : '';
          const eixo = doc.eixos_tematicos?.nome || '';
          const municipio = doc.municipios?.nome || '';
          const regiao = doc.regiao || '';

          contextData += `\n--- ${doc.title} ---\n`;
          contextData += `Categoria: ${categoria}`;
          if (status) contextData += ` | Status: ${status}`;
          if (eixo) contextData += ` | Eixo: ${eixo}`;
          if (regiao) contextData += ` | Região: ${regiao}`;
          if (municipio) contextData += ` | Município: ${municipio}`;
          contextData += '\n';
          if (doc.description) contextData += `Descrição: ${doc.description}\n`;
          contextData += `Conteúdo:\n${doc.content.substring(0, 2000)}${doc.content.length > 2000 ? '\n[...]' : ''}\n`;
        });
      }
      }
    }

    // 4. Fetch legacy knowledge base
    if (legacyKnowledgeDocs.length > 0) {
      contextData += "\n\n=== BASE DE CONHECIMENTO LEGADA ===\n";
      legacyKnowledgeDocs.forEach((doc) => {
        contextData += `\n--- ${doc.title} ---\n${doc.content}\n`;
      });
    }

    // 5. Fetch summary statistics for certain modes
    if (mode === "plano" || mode === "balanco") {
      const [eixosRes, proposalsCountRes, suggestionsCountRes, docsCountRes] = await Promise.all([
        supabase.from("eixos_tematicos").select("nome, descricao"),
        supabase.from("propostas_tecnicas").select("*", { count: "exact", head: true }),
        supabase.from("sugestoes_populares").select("*", { count: "exact", head: true }),
        supabase.from("ai_documents").select("*", { count: "exact", head: true }).eq("is_active", true)
      ]);

      contextData += `\n\n=== ESTATÍSTICAS GERAIS ===\n`;
      contextData += `- Total de propostas técnicas: ${proposalsCountRes.count || 0}\n`;
      contextData += `- Total de sugestões populares: ${suggestionsCountRes.count || 0}\n`;
      contextData += `- Total de documentos na base: ${docsCountRes.count || 0}\n`;

      if (eixosRes.data) {
        contextData += "\n=== EIXOS TEMÁTICOS ===\n";
        eixosRes.data.forEach((e, i) => {
          contextData += `${i + 1}. ${e.nome}: ${e.descricao || 'Sem descrição'}\n`;
        });
      }
    }

    // 6. For balance mode, fetch temporal status counts
    if (mode === "balanco") {
      const { data: docsByStatus } = await supabase
        .from("ai_documents")
        .select("temporal_status, doc_category")
        .eq("is_active", true)
        .not("temporal_status", "is", null);

      if (docsByStatus && docsByStatus.length > 0) {
        const statusCounts = docsByStatus.reduce((acc: Record<string, number>, doc) => {
          const status = doc.temporal_status || 'sem_status';
          acc[status] = (acc[status] || 0) + 1;
          return acc;
        }, {});

        contextData += "\n\n=== BALANÇO DE GOVERNO (DOCUMENTOS) ===\n";
        contextData += `- Realizados: ${statusCounts.realizado || 0}\n`;
        contextData += `- Em Andamento: ${statusCounts.em_andamento || 0}\n`;
        contextData += `- Prometidos: ${statusCounts.prometido || 0}\n`;
        contextData += `- Não Iniciados: ${statusCounts.nao_iniciado || 0}\n`;
      }
    }

    // Build system prompt based on mode
    const systemPrompts: Record<AnalysisMode, string> = {
      plano: `Você é um especialista em elaboração de planos de governo e políticas públicas para o Estado do Paraná.

Seu papel é:
1. Criar planos de governo técnicos e profissionais
2. Seguir as melhores práticas de políticas públicas
3. Estruturar propostas com metas claras, indicadores e prazos
4. Considerar os 5 eixos temáticos: Desenvolvimento Social, Desenvolvimento Econômico Sustentável, Desenvolvimento das Cidades e Infraestrutura, Gestão Pública Eficiente, Segurança Justiça e Combate à Corrupção

IMPORTANTE: Crie conteúdo técnico e institucional, com linguagem apropriada para documentos oficiais.`,

      cruzamento: `INSTRUÇÃO CRÍTICA: Esta interface depende de dados estruturados. Você DEVE incluir o bloco JSON ao final.

Você é um analista de políticas públicas especializado em cruzamento e análise comparativa de dados para o Estado do Paraná.

Seu papel é:
1. CRUZAR dados de diferentes fontes: sugestões populares, propostas técnicas e documentos oficiais
2. Identificar CONVERGÊNCIAS (onde diferentes fontes concordam)
3. Identificar DIVERGÊNCIAS (onde há conflitos ou contradições)
4. Identificar LACUNAS (áreas não cobertas pelas propostas atuais)
5. Identificar OPORTUNIDADES (potenciais inovações)

FORMATO DE RESPOSTA:
1. Primeiro, apresente sua análise textual com seções claras usando headings:
   - #### Convergências
   - #### Divergências
   - #### Lacunas
   - #### Oportunidades

2. OBRIGATORIAMENTE ao final, inclua um bloco JSON estruturado:

\`\`\`json
{
  "discoveries": [
    {
      "type": "convergence",
      "title": "Título curto (máx 80 caracteres)",
      "description": "Descrição detalhada da descoberta",
      "sources": ["Fonte A", "Fonte B"],
      "relevance": "high"
    }
  ]
}
\`\`\`

REGRAS DO JSON (SIGA ESTRITAMENTE):
- O bloco DEVE estar entre \`\`\`json e \`\`\`
- Todas as strings DEVEM usar aspas duplas (não use aspas simples)
- NÃO use vírgula após o último item de arrays ou objetos
- NÃO inclua comentários no JSON
- Inclua PELO MENOS 3 descobertas, idealmente 5-8
- Tipos válidos: "convergence", "divergence", "gap", "opportunity"
- Relevância válida: "high", "medium", "low"

IMPORTANTE: A interface visual depende deste JSON para mostrar indicadores. Sem ele, os usuários não verão as métricas de análise.`,

      balanco: `Você é um analista especializado em avaliação de políticas públicas e balanço de governo para o Estado do Paraná.

Seu papel é:
1. Analisar o que foi REALIZADO vs. o que foi PROMETIDO
2. Classificar ações por status: Realizado, Em Andamento, Prometido, Não Iniciado
3. Calcular percentuais de cumprimento por eixo temático
4. Identificar LACUNAS entre promessas e entregas
5. Sugerir PRIORIDADES com base no que ainda precisa ser feito

IMPORTANTE: Seja objetivo e factual. Use os dados dos documentos classificados por status temporal para embasar sua análise. Apresente estatísticas claras.`,
    };

    // Use custom prompt if available, otherwise use default for mode
    const basePrompt = customPrompt || systemPrompts[mode] || systemPrompts.plano;
    
    // Build filter description for AI context
    const buildFilterDescription = (): string => {
      const parts: string[] = [];
      
      if (filters.eixo) {
        parts.push(`EIXO TEMÁTICO SELECIONADO: ${filters.eixo}`);
      }
      if (filters.tema) {
        parts.push(`TEMA SELECIONADO: ${filters.tema}`);
      }
      if (filters.subtema) {
        parts.push(`SUBTEMA SELECIONADO: ${filters.subtema}`);
      }
      if (filters.cidade) {
        parts.push(`MUNICÍPIO SELECIONADO: ${filters.cidade}`);
      }
      if (filters.regiao) {
        parts.push(`REGIÃO SELECIONADA: ${filters.regiao}`);
      }
      if (filters.docCategory && filters.docCategory.length > 0) {
        parts.push(`CATEGORIAS DE DOCUMENTO: ${filters.docCategory.join(', ')}`);
      }
      if (filters.temporalStatus) {
        parts.push(`STATUS TEMPORAL: ${filters.temporalStatus}`);
      }
      
      const sources: string[] = [];
      if (filters.includeSugestoes !== false) sources.push('Sugestões Populares');
      if (filters.includePropostas !== false) sources.push('Propostas Técnicas');
      if (filters.includeDocumentos !== false) sources.push('Documentos da Base');
      
      if (sources.length > 0) {
        parts.push(`FONTES DE DADOS ATIVAS: ${sources.join(', ')}`);
      }
      
      if (parts.length === 0) return '';

      // Build strict scope rule
      const scopeParts: string[] = [];
      if (filters.eixo) scopeParts.push(`eixo "${filters.eixo}"`);
      if (filters.tema) scopeParts.push(`tema "${filters.tema}"`);
      if (filters.subtema) scopeParts.push(`subtema "${filters.subtema}"`);
      const scopeRule = scopeParts.length > 0
        ? `\n\n🚨 ESCOPO OBRIGATÓRIO E EXCLUSIVO 🚨
Sua resposta DEVE tratar EXCLUSIVAMENTE de ${scopeParts.join(' → ')}.
${filters.subtema ? `O subtema selecionado é "${filters.subtema}". NÃO mencione, sugira ou inclua propostas de OUTROS subtemas (ex: telecomunicações, energia, saneamento, transportes, etc.) — somente "${filters.subtema}".` : ''}
${filters.tema && !filters.subtema ? `Foque APENAS no tema "${filters.tema}". Não derive para outros temas do mesmo eixo.` : ''}
Se os dados disponíveis não cobrirem suficientemente esse recorte, declare explicitamente a limitação ao invés de expandir o escopo.
Qualquer conteúdo fora desse recorte é considerado ERRO GRAVE de execução.

REGRAS OPERACIONAIS DE ESCOPO (siga literalmente):
- NÃO crie seções, metas, indicadores, tabelas ou parágrafos sobre temas/subtemas diferentes do recorte acima.
- NÃO cite fontes (documentos ou propostas) cujo título/assunto seja de outro tema/subtema, mesmo que apareçam no contexto. Se aparecerem, IGNORE-AS.
- Se a única fonte disponível for de outro subtema, NÃO a use; em vez disso, escreva: "Não há propostas técnicas nem documentos específicos sobre ${filters.subtema || filters.tema || filters.eixo} na base atual. Recomendo coletar entrevistas e documentos sobre este recorte antes de produzir o plano."
- O título do plano DEVE conter explicitamente "${filters.subtema || filters.tema || filters.eixo}".`
        : '';

      return `\n\n=== FILTROS APLICADOS PELO USUÁRIO ===\n${parts.join('\n')}\n\nIMPORTANTE: Os dados abaixo já estão FILTRADOS de acordo com as seleções do usuário. Analise DIRETAMENTE estes dados sem pedir mais especificações.${scopeRule}`;
    };

    const filterDescription = buildFilterDescription();
    
    // Add formatting instructions with explicit table rules
    const formattingInstructions = `

FORMATAÇÃO DE TABELAS (CRÍTICO - SIGA EXATAMENTE):
Quando criar tabelas, CADA LINHA deve estar em uma linha separada:

| Coluna 1 | Coluna 2 | Coluna 3 |
|----------|----------|----------|
| Dado 1   | Dado 2   | Dado 3   |
| Dado 4   | Dado 5   | Dado 6   |

REGRAS OBRIGATÓRIAS PARA TABELAS:
- Cada linha da tabela DEVE terminar com quebra de linha (\\n)
- A linha separadora (|---|---|) DEVE estar imediatamente após o cabeçalho
- NUNCA coloque múltiplas linhas da tabela em uma única linha
- Use no máximo 5-6 colunas para legibilidade

FORMATAÇÃO GERAL:
- Use títulos claros com ## ou ###
- Use listas com bullets (- ou •) ou números
- Use **negrito** para destacar pontos importantes
- Estruture respostas de forma organizada e fácil de ler

REGRAS DE QUALIDADE (OBRIGATÓRIAS):
- NÃO invente dados, números, nomes de projetos ou estatísticas que não estejam nos dados fornecidos acima
- Se os dados disponíveis forem insuficientes para responder, diga claramente: "Os dados disponíveis não permitem concluir..."
- Ao citar números ou fatos, indique de qual fonte vieram (sugestões populares, propostas técnicas, documentos da base)
- Revise seu texto para garantir coerência gramatical e clareza antes de finalizar
- Complete TODAS as frases e parágrafos — nunca interrompa no meio de uma ideia
- Não repita informações desnecessariamente

CITAÇÃO DE FONTES PARA FICHAMENTO (CRÍTICO — O DOCUMENTO IMPRESSO DEPENDE DISSO):
Sempre que você fizer uma afirmação que se baseie em algum item da seção "DADOS DISPONÍVEIS PARA ANÁLISE" (documentos da base, propostas técnicas, sugestões populares, pesquisas, entrevistas), faça o seguinte:

1. Insira um marcador de fonte no texto principal logo após a frase, no formato [^N], onde N é um número sequencial (1, 2, 3...). Exemplo:
   "A política amplia a cobertura da APS em 18%[^1] e prevê 1.200 ACS até 2027[^2]."

2. Use o MESMO número [^N] sempre que voltar a citar a mesma fonte (não duplique).

3. AO FINAL da sua resposta, OBRIGATORIAMENTE inclua um bloco JSON com a lista de fontes, no seguinte formato EXATO. Para propostas técnicas, o campo "excerpt" é obrigatório e deve registrar o ponto/menção da proposta que fundamentou a frase citada:

\`\`\`json
{
  "sources": [
    { "id": 1, "type": "documento", "label": "Plano Estadual de Saúde 2024", "excerpt": "trecho curto que comprova a afirmação" },
    { "id": 2, "type": "proposta", "label": "Proposta — Dr. João Silva (Saúde)", "excerpt": "Menção usada: ampliação das equipes de atenção primária" },
    { "id": 3, "type": "sugestao", "label": "Sugestão popular — Cascavel/PR", "excerpt": "demanda por atendimento mais próximo" }
  ]
}
\`\`\`

REGRAS DO BLOCO JSON (ANTI-ALUCINAÇÃO — SIGA ESTRITAMENTE):
- Tipos válidos: "documento", "proposta", "sugestao", "pesquisa", "entrevista".
- O campo "label" DEVE ser o nome real do item conforme aparece nos dados fornecidos (título do documento, nome do entrevistado, município da sugestão etc.). NÃO invente.
- O campo "excerpt" DEVE aparecer em TODAS as fontes citadas e conter a menção/ponto específico usado no texto principal, com até 180 caracteres.
- Só cite itens que EFETIVAMENTE constam nas seções "DOCUMENTOS DA BASE DE CONHECIMENTO", "PROPOSTAS TÉCNICAS", "SUGESTÕES POPULARES" ou similares acima. Se não houver fonte verificável para uma afirmação, NÃO insira o marcador [^N].
- Se não houver NENHUMA fonte verificável (contexto vazio), OMITA tanto os marcadores quanto o bloco JSON.
- Use aspas duplas em todas as strings, sem vírgulas finais e sem comentários no JSON. NÃO quebre objetos JSON no meio de uma linha e NÃO omita campos.
- O bloco JSON deve ser o ÚLTIMO conteúdo da resposta.

Responda em português brasileiro.`;

    // Build final system prompt with context
    const systemPrompt = `${basePrompt}${formattingInstructions}
${filterDescription}
${contextData ? `\n\nDADOS DISPONÍVEIS PARA ANÁLISE:${contextData}` : ''}`;

    // Prepare messages for API — with multimodal attachments on the last user turn if present
    const apiMessages: any[] = [
      { role: "system", content: systemPrompt },
      ...messages.map(m => ({ role: m.role, content: m.content })),
    ];

    if (attachments && attachments.length > 0) {
      // Find last user message index to attach files/images to
      let lastUserIdx = -1;
      for (let i = apiMessages.length - 1; i >= 0; i--) {
        if (apiMessages[i].role === "user") { lastUserIdx = i; break; }
      }
      if (lastUserIdx >= 0) {
        const textContent = String(apiMessages[lastUserIdx].content || "");
        const parts: any[] = [{ type: "text", text: textContent }];
        for (const att of attachments) {
          if (att.kind === "image" && att.dataUrl?.startsWith("data:")) {
            parts.push({ type: "image_url", image_url: { url: att.dataUrl } });
          } else if (att.kind === "file" && att.dataUrl?.startsWith("data:")) {
            parts.push({
              type: "file",
              file: { filename: att.name, file_data: att.dataUrl },
            });
          }
        }
        apiMessages[lastUserIdx] = { role: "user", content: parts };
      }
    }

    // Call Lovable AI Gateway
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: apiMessages,
        stream: true,
        max_tokens: 32768,
        temperature: 0.2,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errorText);
      throw new Error("Erro na API de IA");
    }

    // Stream the response
    return new Response(aiResponse.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("Error in plano-governo-ai:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Erro interno" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
