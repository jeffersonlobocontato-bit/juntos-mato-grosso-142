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
    const { agent_id, messages } = await req.json();

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

    // Fetch linked documents for context
    const { data: linkedDocs } = await supabase
      .from("ai_agent_documents")
      .select("document_id")
      .eq("agent_id", agent_id);

    let knowledgeContext = "";

    if (linkedDocs && linkedDocs.length > 0) {
      const docIds = linkedDocs.map((d) => d.document_id);
      
      const { data: documents } = await supabase
        .from("ai_documents")
        .select("title, content, doc_category")
        .in("id", docIds)
        .eq("is_active", true);

      if (documents && documents.length > 0) {
        knowledgeContext = "\n\n--- BASE DE CONHECIMENTO DO AGENTE ---\n" +
          documents.map((doc) => 
            `### ${doc.title} (${doc.doc_category})\n${doc.content}`
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
          .in("status", ["aprovada", "consolidada", "validada"])
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

        // Filter by specific IDs if provided
        if (extendedSearch.pesquisa_ids && extendedSearch.pesquisa_ids.length > 0) {
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
              }
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

    // Build system prompt
    const systemPrompt = `${agent.system_prompt}${knowledgeContext}

INSTRUÇÕES ADICIONAIS:
- Responda sempre em português brasileiro
- Seja claro, objetivo e profissional
- Use a base de conhecimento fornecida quando relevante
- Se não souber algo, admita em vez de inventar`;

    // Call Lovable AI Gateway
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
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
