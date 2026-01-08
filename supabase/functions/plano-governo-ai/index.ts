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

type AnalysisMode = "plano" | "brainstorm" | "cruzamento" | "balanco" | "conteudo" | "coerencia";

interface RequestBody {
  messages: ChatMessage[];
  mode: AnalysisMode;
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
    // Document specific
    docCategory?: string;
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
    const { messages, mode, filters, contentType } = body;

    // Validate input
    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "Mensagens inválidas" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch custom agent config and legacy knowledge base
    const [configResult, legacyKnowledgeResult] = await Promise.all([
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

    const customPrompt = configResult.data?.system_prompt || null;
    const legacyKnowledgeDocs = legacyKnowledgeResult.data || [];

    // Build context data based on filters and mode
    let contextData = "";
    
    // Get municipalities for region filtering
    let municipioNames: string[] = [];
    if (filters.regiao) {
      const { data: municipiosRegiao } = await supabase
        .from("municipios")
        .select("nome")
        .eq("regiao", filters.regiao);
      municipioNames = municipiosRegiao?.map(m => m.nome) || [];
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

      if (suggestions && suggestions.length > 0) {
        contextData += "\n\n=== SUGESTÕES POPULARES ===\n";
        suggestions.forEach((s, i) => {
          contextData += `${i + 1}. [${s.municipio}] ${s.eixo}: ${s.descricao}\n`;
        });
      }
    }

    // 2. Fetch technical proposals if enabled
    if (filters.includePropostas !== false) {
      let proposalsQuery = supabase
        .from("propostas_tecnicas")
        .select(`
          titulo,
          descricao,
          status,
          etapa,
          indicadores,
          metas,
          municipios(nome, regiao),
          eixos_tematicos(nome)
        `)
        .limit(30);

      if (filters.cidade) {
        proposalsQuery = proposalsQuery.eq("municipios.nome", filters.cidade);
      } else if (filters.regiao) {
        proposalsQuery = proposalsQuery.eq("municipios.regiao", filters.regiao);
      }

      if (filters.eixo) {
        proposalsQuery = proposalsQuery.eq("eixos_tematicos.nome", filters.eixo);
      }

      const { data: proposals } = await proposalsQuery;

      if (proposals && proposals.length > 0) {
        contextData += "\n\n=== PROPOSTAS TÉCNICAS ===\n";
        proposals.forEach((p: any, i: number) => {
          const eixoNome = p.eixos_tematicos?.nome || 'N/A';
          const municipioNome = p.municipios?.nome || 'Estadual';
          contextData += `${i + 1}. [${p.status}] ${p.titulo}\n`;
          contextData += `   Eixo: ${eixoNome} | Município: ${municipioNome} | Etapa: ${p.etapa}\n`;
          contextData += `   Descrição: ${p.descricao?.substring(0, 300)}${p.descricao?.length > 300 ? '...' : ''}\n`;
          if (p.metas) contextData += `   Metas: ${p.metas.substring(0, 150)}...\n`;
          if (p.indicadores) contextData += `   Indicadores: ${p.indicadores.substring(0, 150)}...\n`;
          contextData += '\n';
        });
      }
    }

    // 3. Fetch AI documents if enabled
    if (filters.includeDocumentos !== false) {
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

      if (filters.docCategory) {
        docsQuery = docsQuery.eq("doc_category", filters.docCategory);
      }

      if (filters.temporalStatus) {
        docsQuery = docsQuery.eq("temporal_status", filters.temporalStatus);
      }

      if (filters.regiao) {
        docsQuery = docsQuery.eq("regiao", filters.regiao);
      }

      if (filters.eixo) {
        // Need to filter by eixo name - get eixo id first
        const { data: eixoData } = await supabase
          .from("eixos_tematicos")
          .select("id")
          .eq("nome", filters.eixo)
          .maybeSingle();
        
        if (eixoData?.id) {
          docsQuery = docsQuery.eq("eixo_id", eixoData.id);
        }
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
4. Considerar os 8 eixos temáticos: Agricultura e Meio Ambiente, Desenvolvimento Social, Economia e Turismo, Educação, Infraestrutura, Saúde, Segurança Pública, Tecnologia e Inovação

IMPORTANTE: Crie conteúdo técnico e institucional, com linguagem apropriada para documentos oficiais.`,

      brainstorm: `Você é um especialista em políticas públicas e comunicação política, focado em ajudar na criação de propostas e discursos para o Estado do Paraná.

Seu papel é:
1. Analisar as sugestões populares e propostas técnicas disponíveis
2. Sugerir ideias de propostas baseadas nas demandas reais da população
3. Criar pontos de discurso que conectem as necessidades populares com soluções técnicas
4. Ser criativo e inspiracional, mas fundamentado nos dados reais

IMPORTANTE: Use os dados fornecidos como base para suas sugestões. Cite exemplos concretos quando disponíveis.`,

      cruzamento: `Você é um analista de políticas públicas especializado em cruzamento e análise comparativa de dados para o Estado do Paraná.

Seu papel é:
1. CRUZAR dados de diferentes fontes: sugestões populares, propostas técnicas e documentos oficiais
2. Identificar CONVERGÊNCIAS (onde diferentes fontes concordam)
3. Identificar DIVERGÊNCIAS (onde há conflitos ou contradições)
4. Identificar LACUNAS (áreas não cobertas pelas propostas atuais)
5. Identificar OPORTUNIDADES (potenciais inovações)

FORMATO DE RESPOSTA OBRIGATÓRIO:
Sempre que realizar uma análise de cruzamento, inclua um bloco JSON no final da sua resposta com as descobertas estruturadas no seguinte formato:

\`\`\`json
{
  "discoveries": [
    {
      "type": "convergence",
      "title": "Título curto da descoberta",
      "description": "Descrição detalhada da convergência identificada",
      "sources": ["Sugestão Popular", "Proposta Técnica X"],
      "relevance": "high"
    },
    {
      "type": "divergence",
      "title": "Título do conflito",
      "description": "Descrição da divergência encontrada",
      "sources": ["Documento Y", "Proposta Z"],
      "relevance": "medium"
    },
    {
      "type": "gap",
      "title": "Título da lacuna",
      "description": "Área não coberta identificada",
      "sources": ["Sugestões de Município X"],
      "relevance": "high"
    },
    {
      "type": "opportunity",
      "title": "Título da oportunidade",
      "description": "Potencial inovação identificada",
      "sources": ["Cruzamento de dados"],
      "relevance": "low"
    }
  ]
}
\`\`\`

Tipos válidos: "convergence", "divergence", "gap", "opportunity"
Relevância válida: "high", "medium", "low"

IMPORTANTE: Sempre que fizer uma análise comparativa, cite explicitamente as fontes. Use tabelas comparativas quando apropriado. Inclua SEMPRE o bloco JSON ao final.`,

      balanco: `Você é um analista especializado em avaliação de políticas públicas e balanço de governo para o Estado do Paraná.

Seu papel é:
1. Analisar o que foi REALIZADO vs. o que foi PROMETIDO
2. Classificar ações por status: Realizado, Em Andamento, Prometido, Não Iniciado
3. Calcular percentuais de cumprimento por eixo temático
4. Identificar LACUNAS entre promessas e entregas
5. Sugerir PRIORIDADES com base no que ainda precisa ser feito

IMPORTANTE: Seja objetivo e factual. Use os dados dos documentos classificados por status temporal para embasar sua análise. Apresente estatísticas claras.`,

      conteudo: `Você é um especialista em comunicação governamental e redação de conteúdo institucional para o Estado do Paraná.

Seu papel é GERAR CONTEÚDO específico:
- RELEASES DE IMPRENSA: Notícias jornalísticas sobre realizações
- DISCURSOS POLÍTICOS: Textos para pronunciamentos com tom apropriado
- NOTAS TÉCNICAS: Documentos técnicos para embasamento de decisões
- PROPOSTAS CONSOLIDADAS: Sínteses de propostas para apresentação
- RELATÓRIOS EXECUTIVOS: Resumos gerenciais para tomadores de decisão

IMPORTANTE: Adapte o tom e formato ao tipo de conteúdo solicitado. Use dados reais disponíveis para fundamentar o conteúdo. Seja profissional e institucional.`,

      coerencia: `Você é um analista especializado em avaliação de coerência e exequibilidade de políticas públicas para o Estado do Paraná.

Seu papel é:
1. AVALIAR a coerência entre propostas e documentos formais (planos, leis, diretrizes)
2. CLASSIFICAR propostas por nível de alinhamento: Alto, Médio, Baixo
3. Identificar PROPOSTAS DESALINHADAS que podem precisar de revisão
4. Avaliar a EXEQUIBILIDADE técnica e orçamentária das propostas
5. Atribuir PESOS/SCORES de prioridade baseados em coerência e viabilidade
6. Sugerir AJUSTES para propostas que precisam de alinhamento

IMPORTANTE: Seja específico nas avaliações. Cite qual documento de referência está sendo usado para avaliar cada proposta. Use escalas claras (ex: 0-100% de coerência).`
    };

    // Use custom prompt if available, otherwise use default for mode
    const basePrompt = customPrompt || systemPrompts[mode] || systemPrompts.plano;
    
    // Add formatting instructions
    const formattingInstructions = `

Use formatação limpa e profissional:
- Use títulos claros com ## ou ###
- Use listas com bullets (- ou •) ou números
- Use **negrito** para destacar pontos importantes
- Estruture respostas de forma organizada e fácil de ler
- Use tabelas quando apropriado para comparações

Responda em português brasileiro.`;

    // Build final system prompt with context
    const systemPrompt = `${basePrompt}${formattingInstructions}
${contextData ? `\n\nDADOS DISPONÍVEIS PARA ANÁLISE:${contextData}` : ''}`;

    // Prepare messages for API
    const apiMessages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...messages.map(m => ({ role: m.role, content: m.content }))
    ];

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
        model: "google/gemini-2.5-flash",
        messages: apiMessages,
        stream: true,
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
