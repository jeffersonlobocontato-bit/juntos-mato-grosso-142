import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExtendedSearchConfig {
  enabled: boolean;
  sources: {
    ai_documents: boolean;
    propostas_tecnicas: boolean;
    sugestoes_populares: boolean;
    pesquisas_eleitorais: boolean;
  };
  doc_categories: string[];
  temporal_status: string[];
  pesquisa_ids: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { agent_id, messages, selected_pesquisa_ids } = await req.json();

    if (!agent_id) {
      return new Response(
        JSON.stringify({ error: "agent_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch agent configuration
    const { data: agent, error: agentError } = await supabase
      .from("ai_agent_config")
      .select("*")
      .eq("id", agent_id)
      .eq("is_active", true)
      .single();

    if (agentError || !agent) {
      console.error("Agent not found:", agentError);
      return new Response(
        JSON.stringify({ error: "Agent not found or inactive" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch linked document IDs for this agent
    const { data: linkedDocs } = await supabase
      .from("ai_agent_documents")
      .select("document_id")
      .eq("agent_id", agent_id);

    // Also fetch global document IDs
    const { data: globalDocs } = await supabase
      .from("ai_documents")
      .select("id")
      .eq("is_active", true)
      .eq("scope", "global");

    const allDocIds = [
      ...(linkedDocs?.map(d => d.document_id) || []),
      ...(globalDocs?.map(d => d.id) || []),
    ];
    const uniqueDocIds = [...new Set(allDocIds)];

    let knowledgeContext = "";

    // Try RAG-based retrieval first
    const lastUserMessage = messages.filter((m: any) => m.role === "user").pop();
    let usedRag = false;

    if (lastUserMessage && uniqueDocIds.length > 0) {
      try {
        // Generate embedding for the user query using the AI gateway
        const embeddingResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-lite",
            messages: [
              {
                role: "system",
                content: "You are an embedding generator. Given the input text, output ONLY a JSON array of exactly 768 floating point numbers representing a semantic embedding vector. No other text.",
              },
              { role: "user", content: `Generate a 768-dimensional embedding vector for: ${lastUserMessage.content.substring(0, 1000)}` },
            ],
            stream: false,
          }),
        });

        if (embeddingResponse.ok) {
          const embData = await embeddingResponse.json();
          const embContent = embData.choices?.[0]?.message?.content || "";
          const match = embContent.match(/\[[\s\S]*\]/);
          
          if (match) {
            const queryEmbedding = JSON.parse(match[0]);
            if (Array.isArray(queryEmbedding) && queryEmbedding.length === 768) {
              // Call match_document_chunks RPC
              const { data: chunks, error: chunkError } = await supabase.rpc("match_document_chunks", {
                query_embedding: JSON.stringify(queryEmbedding),
                match_threshold: 0.3,
                match_count: 15,
                filter_doc_ids: uniqueDocIds,
              });

              if (!chunkError && chunks && chunks.length > 0) {
                usedRag = true;
                knowledgeContext = "\n\n--- CONTEXTO RELEVANTE (RAG) ---\n" +
                  chunks.map((c: any, i: number) => 
                    `[Trecho ${i + 1} | Relevância: ${(c.similarity * 100).toFixed(0)}%]\n${c.content}`
                  ).join("\n\n---\n\n");
              }
            }
          }
        }
      } catch (ragError) {
        console.error("RAG retrieval failed, falling back:", ragError);
      }
    }

    // Fallback: if RAG didn't work, use traditional document stuffing (limited)
    if (!usedRag && uniqueDocIds.length > 0) {
      const { data: documents } = await supabase
        .from("ai_documents")
        .select("title, content, doc_category")
        .in("id", uniqueDocIds)
        .eq("is_active", true)
        .limit(20);

      if (documents && documents.length > 0) {
        knowledgeContext = "\n\n--- BASE DE CONHECIMENTO DO AGENTE ---\n" +
          documents.map((doc) => 
            `### ${doc.title} (${doc.doc_category})\n${doc.content?.substring(0, 2000) || ''}`
          ).join("\n\n");
      }
    }

    // Handle extended search if enabled
    const extendedSearch = agent.config?.extended_search as ExtendedSearchConfig | undefined;
    
    if (extendedSearch?.enabled) {
      let extendedContext = "\n\n--- BASES DE DADOS EXPANDIDAS ---\n";
      
      // Fetch from ai_documents (all active, with optional filters)
      if (extendedSearch.sources.ai_documents) {
        let query = supabase
          .from("ai_documents")
          .select("title, content, doc_category, temporal_status")
          .eq("is_active", true)
          .limit(50);

        // Apply category filter if specified
        if (extendedSearch.doc_categories && extendedSearch.doc_categories.length > 0) {
          query = query.in("doc_category", extendedSearch.doc_categories);
        }

        // Apply temporal status filter if specified
        if (extendedSearch.temporal_status && extendedSearch.temporal_status.length > 0) {
          query = query.in("temporal_status", extendedSearch.temporal_status);
        }

        const { data: allDocs } = await query;

        if (allDocs && allDocs.length > 0) {
          // Exclude already linked documents to avoid duplication
          const linkedIds = linkedDocs?.map(d => d.document_id) || [];
          const newDocs = allDocs.filter(doc => !linkedIds.some(id => 
            // Since we don't have IDs in the select, we check by title
            allDocs.some(d => d.title === doc.title)
          ));

          if (newDocs.length > 0) {
            extendedContext += "\n## Documentos Técnicos\n" +
              newDocs.slice(0, 30).map((doc) => 
                `### ${doc.title} (${doc.doc_category}${doc.temporal_status ? ` - ${doc.temporal_status}` : ''})\n${doc.content?.substring(0, 2000) || 'Sem conteúdo'}`
              ).join("\n\n");
          }
        }
      }

      // Fetch from propostas_tecnicas
      if (extendedSearch.sources.propostas_tecnicas) {
        const { data: propostas } = await supabase
          .from("propostas_tecnicas")
          .select("titulo, descricao, problema, solucao, status")
          .in("status", ["aprovada", "em_analise"])
          .limit(30);

        if (propostas && propostas.length > 0) {
          extendedContext += "\n\n## Propostas Técnicas\n" +
            propostas.map((p) => {
              return `### ${p.titulo} (${p.status})\n**Problema:** ${p.problema || 'Não especificado'}\n**Solução:** ${p.solucao || p.descricao || 'Não especificada'}`;
            }).join("\n\n");
        }
      }

      // Fetch from sugestoes_populares
      if (extendedSearch.sources.sugestoes_populares) {
        const { data: sugestoes } = await supabase
          .from("sugestoes_populares")
          .select("titulo, descricao, categoria, municipio, created_at")
          .order("created_at", { ascending: false })
          .limit(50);

        if (sugestoes && sugestoes.length > 0) {
          extendedContext += "\n\n## Sugestões Populares (Cidadãos)\n" +
            sugestoes.map((s) => 
              `- **${s.titulo || 'Sugestão'}** (${s.categoria || 'Geral'}) - ${s.municipio || 'PR'}\n  ${s.descricao?.substring(0, 300) || ''}`
            ).join("\n");
        }
      }

      // Fetch from pesquisas_eleitorais
      if (extendedSearch.sources.pesquisas_eleitorais) {
        let pesquisaQuery = supabase
          .from("pesquisas_eleitorais")
          .select("id, titulo, instituto, tipo_pesquisa, data_publicacao, amostra_total, margem_erro, universo, content")
          .eq("is_active", true)
          .in("status", ["ativa"]);

        // PRIORITY: User selection from frontend takes precedence
        if (selected_pesquisa_ids && Array.isArray(selected_pesquisa_ids) && selected_pesquisa_ids.length > 0) {
          pesquisaQuery = pesquisaQuery.in("id", selected_pesquisa_ids);
        } else if (extendedSearch.pesquisa_ids && extendedSearch.pesquisa_ids.length > 0) {
          // Fall back to agent config
          pesquisaQuery = pesquisaQuery.in("id", extendedSearch.pesquisa_ids);
        } else {
          pesquisaQuery = pesquisaQuery.limit(10);
        }

        const { data: pesquisas } = await pesquisaQuery;

        if (pesquisas && pesquisas.length > 0) {
          extendedContext += "\n\n## Pesquisas Eleitorais\n";
          
          for (const pesq of pesquisas) {
            extendedContext += `\n### ${pesq.titulo} (${pesq.instituto})\n`;
            extendedContext += `- Tipo: ${pesq.tipo_pesquisa}\n`;
            if (pesq.data_publicacao) extendedContext += `- Publicação: ${pesq.data_publicacao}\n`;
            if (pesq.amostra_total) extendedContext += `- Amostra: ${pesq.amostra_total} entrevistados\n`;
            if (pesq.margem_erro) extendedContext += `- Margem de erro: ±${pesq.margem_erro}%\n`;
            if (pesq.universo) extendedContext += `- Universo: ${pesq.universo}\n`;
            
            // Fetch resultados for this pesquisa
            const { data: resultados } = await supabase
              .from("pesquisa_resultados")
              .select("id, tipo_pergunta, pergunta, cenario_descricao")
              .eq("pesquisa_id", pesq.id)
              .order("ordem")
              .limit(10);

            if (resultados && resultados.length > 0) {
              for (const res of resultados) {
                extendedContext += `\n#### ${res.pergunta}`;
                if (res.cenario_descricao) extendedContext += ` (${res.cenario_descricao})`;
                extendedContext += `\nTipo: ${res.tipo_pergunta}\n`;

                // Fetch respostas
                const { data: respostas } = await supabase
                  .from("pesquisa_respostas")
                  .select("opcao, percentual, votos_absolutos")
                  .eq("resultado_id", res.id)
                  .order("ordem");

                if (respostas && respostas.length > 0) {
                  respostas.forEach(resp => {
                    extendedContext += `- ${resp.opcao}: ${resp.percentual}%`;
                    if (resp.votos_absolutos) extendedContext += ` (${resp.votos_absolutos} votos)`;
                    extendedContext += "\n";
                  });
                }

                // Fetch cruzamentos demográficos
                const { data: cruzamentos } = await supabase
                  .from("pesquisa_cruzamentos")
                  .select("segmento_tipo, segmento_valor, opcao, percentual")
                  .eq("resultado_id", res.id)
                  .limit(50);

                if (cruzamentos && cruzamentos.length > 0) {
                  extendedContext += "\n**Cruzamentos Demográficos:**\n";
                  
                  // Agrupar por segmento_tipo
                  const grouped = cruzamentos.reduce((acc: Record<string, typeof cruzamentos>, cruz) => {
                    if (!acc[cruz.segmento_tipo]) acc[cruz.segmento_tipo] = [];
                    acc[cruz.segmento_tipo].push(cruz);
                    return acc;
                  }, {});
                  
                  for (const [tipo, items] of Object.entries(grouped)) {
                    extendedContext += `\n*${tipo}:*\n`;
                    (items as typeof cruzamentos).forEach(item => {
                      extendedContext += `- ${item.segmento_valor} → ${item.opcao}: ${item.percentual}%\n`;
                    });
                  }
                }
              }
            }

            // Fetch insights qualitativos
            const { data: qualitativos } = await supabase
              .from("pesquisa_qualitativa")
              .select("tema, insight, sentimento, relevancia")
              .eq("pesquisa_id", pesq.id)
              .order("relevancia", { ascending: false })
              .limit(10);

            if (qualitativos && qualitativos.length > 0) {
              extendedContext += "\n**Insights Qualitativos:**\n";
              qualitativos.forEach(q => {
                extendedContext += `- [${q.sentimento || 'neutro'}] ${q.tema}: ${q.insight || 'Sem insight'}\n`;
              });
            }

            // Include raw content if available
            if (pesq.content) {
              extendedContext += `\n**Dados adicionais:**\n${pesq.content.substring(0, 2000)}\n`;
            }
          }
        }
      }

      knowledgeContext += extendedContext;
    }

    // Check if this is a presentation generation request
    const lastMessage = messages[messages.length - 1];
    const isPresentationRequest = lastMessage?.content?.includes('[[GENERATE_PRESENTATION]]');

    // Build system prompt
    let systemPrompt = `${agent.system_prompt}${knowledgeContext}

INSTRUÇÕES ADICIONAIS:
- Responda sempre em português brasileiro
- Seja claro, objetivo e profissional
- Use a base de conhecimento fornecida quando relevante
- Se não souber algo, admita em vez de inventar`;

    // Add specific instructions for presentation generation
    if (isPresentationRequest) {
      systemPrompt += `

MODO DE GERAÇÃO DE APRESENTAÇÃO EXECUTIVA:
Você está no modo de geração de apresentação profissional. Analise toda a conversa e gere uma apresentação no estilo de consultoria estratégica.

⚠️ REGRAS CRÍTICAS - SIGA EXATAMENTE:
1. Retorne SOMENTE o objeto JSON, nada mais
2. NÃO use blocos de código
3. NÃO escreva texto antes ou depois do JSON
4. Comece diretamente com { e termine com }
5. NUNCA use as palavras "exaustiva", "exaustivo", "completa", "detalhada" nos títulos dos slides

TIPOS DE SLIDES DISPONÍVEIS:

1. "cover" - Capa com título impactante e direto (sem adjetivos como "exaustiva" ou "completa")
   {"id": "1", "type": "cover", "title": "O mapa invisível da eleição", "subtitle": "O que os números revelam"}

2. "methodology" - Ficha técnica com cards de métricas
   {"id": "2", "type": "methodology", "title": "Metodologia", "methodology": [
     {"label": "Amostra", "value": "1.300", "description": "Eleitores entrevistados"},
     {"label": "Margem de Erro", "value": "±2,8%", "description": "Pontos percentuais"},
     {"label": "Municípios", "value": "54", "description": "Do Paraná"},
     {"label": "Confiança", "value": "95%", "description": "Intervalo de confiança"}
   ]}

3. "highlight" - Dado em destaque grande
   {"id": "3", "type": "highlight", "title": "Antes de qualquer liderança", "highlight": {"primary": "74,2%", "primaryLabel": "Eleitores indefinidos"}}

4. "comparison" - Comparação dramática antes/depois
   {"id": "4", "type": "comparison", "title": "Queda na indefinição", "highlight": {"comparison": {"from": "74,2%", "to": "5,5%", "label": "Espontânea vs Estimulada"}}, "bullets": ["Espontânea", "Estimulada"]}

5. "crosstable" - Tabela de cruzamento por segmento
   {"id": "5", "type": "crosstable", "title": "Intenção de Voto por Gênero", "crossTable": {
     "headers": ["Candidato A", "Candidato B", "Candidato C"],
     "rows": [
       {"label": "Masculino", "values": [48, 15, 17]},
       {"label": "Feminino", "values": [36, 24, 22]}
     ]
   }, "content": "Destaque: Candidato A lidera entre homens com 48%"}

6. "horizontal_bars" - Barras horizontais para ranking/rejeição
   {"id": "6", "type": "horizontal_bars", "title": "Índice de Rejeição", "horizontalBars": [
     {"label": "Candidato A", "value": 30.2, "highlight": true},
     {"label": "Candidato B", "value": 20.2},
     {"label": "Candidato C", "value": 16.8}
   ], "content": "Candidato A (30,2%)"}

7. "chart" - Gráficos dinâmicos
   {"id": "7", "type": "chart", "title": "Cenários de Primeiro Turno", "chart": {"type": "bar", "title": "Intenção de Voto", "data": [{"name": "Candidato A", "valor": 41.6}, {"name": "Candidato B", "valor": 19.7}], "keys": ["valor"]}}

8. "numbered_insights" - Insights numerados (como conclusões)
   {"id": "8", "type": "numbered_insights", "title": "O que esta pesquisa aponta", "insights": [
     {"number": "01", "title": "A Solidez do Líder", "description": "Candidato possui piso eleitoral alto e rejeição controlada"},
     {"number": "02", "title": "O Vácuo da Oposição", "description": "Fragmentação impede consolidação de alternativa viável"},
     {"number": "03", "title": "O Gigante Adormecido", "description": "Aprovação do governo pode ser fator decisivo"}
   ], "quote": {"text": "A eleição é uma fotografia do momento"}}

9. "alert" - Slide de alerta/volatilidade
   {"id": "9", "type": "alert", "title": "⚠ Alta Volatilidade", "alert": {"type": "warning", "title": "Cenário Consolidado", "description": "O eleitorado está disponível para ser conquistado"}}

10. "quote" - Citação em destaque
    {"id": "10", "type": "quote", "title": "Conclusão", "quote": {"text": "A estrutura do cenário sugere um filme com protagonistas já definidos"}}

11. "content" - Conteúdo com bullets
    {"id": "11", "type": "content", "title": "Análise Detalhada", "bullets": ["Ponto 1", "Ponto 2", "Ponto 3"]}

12. "conclusion" - Slide de conclusão
    {"id": "12", "type": "conclusion", "title": "Próximos Passos", "bullets": ["Ação 1", "Ação 2"]}

ESTRUTURA DO JSON:
{
  "title": "Título da Apresentação",
  "theme": "default",
  "slides": [array de slides]
}

FORMATAÇÃO DE TEXTO NOS BULLETS:
- Use **texto** para negrito (será renderizado automaticamente como HTML)
- NÃO numere os bullets manualmente (ex: "1. Item", "2. Item") - a numeração é automática
- NÃO coloque números antes do texto nos bullets
- Separe conceitos diferentes em bullets diferentes
- Use linguagem analítica e impactante
- Exemplo CORRETO: ["**Forças:** Liderança sólida", "**Fraquezas:** Baixa penetração"]
- Exemplo ERRADO: ["1**Forças:** Liderança sólida", "2**Fraquezas:** Baixa penetração"]

DIRETRIZES DE EXPANSÃO DINÂMICA:

1. PRESERVAÇÃO INTEGRAL DO CONTEÚDO:
   - Transforme 100% do relatório/análise da conversa em slides
   - NÃO resuma nem omita dados - cada insight vira um slide
   - Cada pergunta de pesquisa = mínimo 1 slide dedicado
   - Cada cenário eleitoral = 1 slide de chart + 1 slide de análise
   - Cada cruzamento demográfico importante = 1 slide crosstable
   - COPIE OS TEXTOS INTEGRALMENTE da análise para os slides

2. REGRAS DE EXPANSÃO:
   - Relatório curto (até 500 palavras): 6-10 slides
   - Relatório médio (500-1500 palavras): 10-20 slides
   - Relatório extenso (1500-3000 palavras): 20-35 slides
   - Relatório completo (3000+ palavras): 35-50 slides
   - NÃO HÁ LIMITE MÁXIMO - expanda conforme necessário

3. ESTRUTURA OBRIGATÓRIA:
   - Slide 1: cover (título da análise)
   - Slide 2: methodology (ficha técnica da pesquisa)
   - Slides 3-N: conteúdo completo organizado por tema
   - Últimos 2-3 slides: numbered_insights + quote/alert

4. ORGANIZAÇÃO POR SEÇÕES:
   - Agrupe slides por tema (intenção de voto, rejeição, perfil, etc.)
   - Use slide "content" para introduzir cada nova seção
   - Use "highlight" para dados mais impactantes de cada seção
   - Use "crosstable" para TODOS os cruzamentos demográficos mencionados

5. MAPEAMENTO DE CONTEÚDO:
   - Percentuais de intenção de voto → chart (bar) + highlight
   - Comparação espontânea vs estimulada → comparison
   - Rankings e rejeição → horizontal_bars
   - Cruzamentos por gênero/idade/região → crosstable (um para cada)
   - Análises qualitativas → content com bullets
   - Alertas estratégicos → alert
   - Conclusões numeradas → numbered_insights
   - Citações importantes → quote

6. QUALIDADE > ECONOMIA:
   - Prefira mais slides bem organizados do que menos slides sobrecarregados
   - Cada slide deve ter UM foco principal
   - Títulos devem ser analíticos e impactantes

7. ⚠️ CAMPOS OBRIGATÓRIOS POR TIPO DE SLIDE (NUNCA OMITA!):
   - cover: title (obrigatório), subtitle (opcional)
   - methodology: methodology[] array com {label, value, description} - SEMPRE inclua pelo menos 4 itens
   - highlight: highlight{} com primary OU comparison - NUNCA use este tipo sem o campo highlight
   - comparison: highlight{comparison{from, to}} - SEMPRE inclua o campo comparison
   - crosstable: crossTable{headers[], rows[{label, values[]}]} - SEMPRE inclua headers e rows
   - horizontal_bars: horizontalBars[] array com {label, value} - SEMPRE inclua pelo menos 3 barras
   - chart: chart{type, title, data} - SEMPRE inclua type e data válidos
   - numbered_insights: insights[] array com {number, title, description} - SEMPRE inclua pelo menos 2 insights
   - alert: alert{type, title, description} - SEMPRE preencha todos os 3 campos
   - quote: quote{text} OU content (pelo menos um obrigatório)
   - content: bullets[] OU content string (pelo menos um obrigatório)

   ⚠️ REGRA DE OURO: NUNCA gere um slide com type especializado sem seu campo de dados principal!
   Se não houver dados suficientes para um tipo especializado, use "content" com bullets.
   Exemplo: Se não tem dados para crosstable, use {"type": "content", "title": "...", "bullets": [...]}`;
    }

    // Call Lovable AI Gateway
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: isPresentationRequest ? "google/gemini-2.5-flash" : "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.map((m: { role: string; content: string }) => ({
            role: m.role,
            content: m.content,
          })),
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("ai-hub-chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
