import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExtractedResult {
  tipo_pergunta: string;
  pergunta: string;
  cenario_descricao?: string;
  respostas: {
    opcao: string;
    percentual: number;
    votos_absolutos?: number;
  }[];
}

interface ExtractedCrosstab {
  pergunta: string;
  segmento_tipo: string;
  segmento_valor: string;
  opcao: string;
  percentual: number;
}

interface ExtractedData {
  metadata: {
    titulo?: string;
    instituto?: string;
    data_campo_inicio?: string;
    data_campo_fim?: string;
    data_publicacao?: string;
    registro_tse?: string;
    universo?: string;
    amostra_total?: number;
    margem_erro?: number;
    nivel_confianca?: number;
    metodologia?: string;
  };
  resultados: ExtractedResult[];
  cruzamentos: ExtractedCrosstab[];
  qualitativo?: {
    tema: string;
    insight: string;
    verbatim?: string;
    sentimento?: string;
  }[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pesquisa_id, file_url, content_text } = await req.json();

    if (!pesquisa_id) {
      return new Response(
        JSON.stringify({ error: "pesquisa_id é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Update status to processing
    await supabase
      .from("pesquisas_eleitorais")
      .update({ status: "processando" })
      .eq("id", pesquisa_id);

    // Priority: content_text > database content > file content
    let textContent = "";

    // First, try to use provided content_text
    if (content_text && content_text.trim().length > 50) {
      console.log("Using provided content_text, length:", content_text.length);
      textContent = content_text.trim();
    } 
    // If no content_text, try to get from database
    else {
      const { data: pesquisaData } = await supabase
        .from("pesquisas_eleitorais")
        .select("content")
        .eq("id", pesquisa_id)
        .single();

      if (pesquisaData?.content && pesquisaData.content.trim().length > 50) {
        console.log("Using database content, length:", pesquisaData.content.length);
        textContent = pesquisaData.content.trim();
      }
    }

    // If still no content and we have a file_url, try to download
    if (!textContent && file_url) {
      console.log("Attempting to download file from:", file_url);
      
      try {
        // Extract file path from URL
        const urlObj = new URL(file_url);
        const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/public\/pesquisas-eleitorais\/(.+)/);
        
        if (pathMatch) {
          const filePath = decodeURIComponent(pathMatch[1]);
          console.log("Extracted file path:", filePath);
          
          // Generate signed URL for private bucket access
          const { data: signedUrlData, error: signedUrlError } = await supabase
            .storage
            .from('pesquisas-eleitorais')
            .createSignedUrl(filePath, 3600);

          if (signedUrlError) {
            console.error("Error creating signed URL:", signedUrlError);
          } else if (signedUrlData?.signedUrl) {
            console.log("Signed URL created successfully");
            
            const fileResponse = await fetch(signedUrlData.signedUrl);
            
            if (fileResponse.ok) {
              const contentType = fileResponse.headers.get("content-type") || "";
              console.log("File content type:", contentType);
              
              // Only try to read text from text-based files
              if (contentType.includes("text") || contentType.includes("csv")) {
                textContent = await fileResponse.text();
                console.log("Text content extracted, length:", textContent.length);
              } else {
                console.log("Binary file detected (PDF/Excel). Cannot extract text directly.");
                // For PDF/Excel, we cannot extract text in edge function
                // User must provide content manually
              }
            } else {
              console.error("Failed to download file, status:", fileResponse.status);
            }
          }
        } else {
          console.error("Could not extract file path from URL:", file_url);
        }
      } catch (fileError) {
        console.error("Error fetching file:", fileError);
      }
    }

    // CRITICAL: If we don't have enough text content, fail early
    if (!textContent || textContent.length < 100) {
      console.error("Insufficient content. Length:", textContent?.length || 0);
      
      await supabase
        .from("pesquisas_eleitorais")
        .update({ status: "rascunho" })
        .eq("id", pesquisa_id);

      return new Response(
        JSON.stringify({ 
          error: "Conteúdo insuficiente para processamento. Por favor, cole o texto da pesquisa no campo 'Dados Manuais' antes de processar.",
          hint: "Para arquivos PDF/Excel, copie e cole o conteúdo textual no campo apropriado."
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Processing content with AI. First 300 chars:", textContent.substring(0, 300));
    console.log("Total content length:", textContent.length);

    const systemPrompt = `Você é um especialista em análise de pesquisas eleitorais brasileiras.
Sua tarefa é extrair dados estruturados EXCLUSIVAMENTE do documento fornecido.

REGRAS CRÍTICAS - OBRIGATÓRIO:
1. EXTRAIA APENAS dados que estão EXPLICITAMENTE no documento fornecido
2. NÃO INVENTE, NÃO PREENCHA, NÃO COMPLETE com dados de outras fontes
3. Se um dado não estiver no documento, NÃO inclua - deixe vazio ou omita
4. NÃO use conhecimento prévio sobre pesquisas eleitorais de outros estados ou períodos
5. Se o documento for do Paraná, extraia APENAS candidatos e dados do Paraná
6. Se não conseguir identificar claramente um dado, NÃO inclua

INSTRUÇÕES DE EXTRAÇÃO:
1. Extraia metadados: título, instituto, datas, registro TSE, amostra, margem de erro
2. Extraia resultados: intenção de voto (espontânea/estimulada), rejeição, avaliação de governo
3. Extraia cruzamentos: dados por sexo, idade, escolaridade, renda, região
4. Para pesquisas qualitativas: extraia insights e verbatims

FORMATOS DE DADOS COMUNS:
- Intenção de voto estimulada: lista de candidatos com percentuais
- Rejeição: "em quem não votaria de jeito nenhum"
- Avaliação: ótimo/bom, regular, ruim/péssimo
- Cruzamentos: segmentação por demografia

Use a função extract_pesquisa_data para retornar APENAS os dados encontrados no documento.`;

    const userPrompt = `ATENÇÃO: Extraia dados APENAS do documento abaixo. Não invente dados, não use conhecimento externo.
Se um candidato ou percentual não estiver explícito no texto, NÃO inclua.

DOCUMENTO PARA ANÁLISE:
---
${textContent}
---

Extraia SOMENTE o que está no documento acima:
1. Metadados (título, instituto, datas, amostra, margem de erro, etc.)
2. Resultados de intenção de voto (APENAS candidatos mencionados no documento)
3. Resultados de rejeição (se houver no documento)
4. Avaliação de governo (se houver no documento)
5. Cruzamentos por segmento demográfico (se houver no documento)
6. Insights qualitativos (se for pesquisa qualitativa)

LEMBRE-SE: Retorne APENAS dados explícitos do documento. Dados não encontrados devem ser omitidos.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_pesquisa_data",
              description: "Extrai dados estruturados de uma pesquisa eleitoral",
              parameters: {
                type: "object",
                properties: {
                  metadata: {
                    type: "object",
                    properties: {
                      titulo: { type: "string", description: "Título da pesquisa" },
                      instituto: { type: "string", description: "Nome do instituto" },
                      data_campo_inicio: { type: "string", description: "Data início do campo (YYYY-MM-DD)" },
                      data_campo_fim: { type: "string", description: "Data fim do campo (YYYY-MM-DD)" },
                      data_publicacao: { type: "string", description: "Data de publicação (YYYY-MM-DD)" },
                      registro_tse: { type: "string", description: "Número de registro no TSE" },
                      universo: { type: "string", description: "Descrição do universo pesquisado" },
                      amostra_total: { type: "number", description: "Tamanho total da amostra" },
                      margem_erro: { type: "number", description: "Margem de erro percentual" },
                      nivel_confianca: { type: "number", description: "Nível de confiança percentual" },
                      metodologia: { type: "string", description: "Descrição da metodologia" },
                    },
                  },
                  resultados: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        tipo_pergunta: {
                          type: "string",
                          enum: ["intencao_espontanea", "intencao_estimulada", "rejeicao", "avaliacao_governo", "cenario", "outro"],
                        },
                        pergunta: { type: "string", description: "Texto da pergunta" },
                        cenario_descricao: { type: "string", description: "Descrição do cenário (se aplicável)" },
                        respostas: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              opcao: { type: "string", description: "Nome do candidato ou opção" },
                              percentual: { type: "number", description: "Valor percentual" },
                              votos_absolutos: { type: "number", description: "Número absoluto de votos" },
                            },
                            required: ["opcao", "percentual"],
                          },
                        },
                      },
                      required: ["tipo_pergunta", "pergunta", "respostas"],
                    },
                  },
                  cruzamentos: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        pergunta: { type: "string", description: "Pergunta relacionada" },
                        segmento_tipo: { type: "string", description: "Tipo do segmento (sexo, idade, escolaridade, renda, regiao)" },
                        segmento_valor: { type: "string", description: "Valor do segmento (masculino, 25-34, etc)" },
                        opcao: { type: "string", description: "Candidato ou opção" },
                        percentual: { type: "number", description: "Valor percentual" },
                      },
                      required: ["pergunta", "segmento_tipo", "segmento_valor", "opcao", "percentual"],
                    },
                  },
                  qualitativo: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        tema: { type: "string", description: "Tema discutido" },
                        insight: { type: "string", description: "Insight identificado" },
                        verbatim: { type: "string", description: "Citação direta dos participantes" },
                        sentimento: { type: "string", enum: ["positivo", "negativo", "neutro", "misto"] },
                      },
                      required: ["tema", "insight"],
                    },
                  },
                },
                required: ["metadata", "resultados"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_pesquisa_data" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        await supabase
          .from("pesquisas_eleitorais")
          .update({ status: "rascunho" })
          .eq("id", pesquisa_id);
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente mais tarde." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        await supabase
          .from("pesquisas_eleitorais")
          .update({ status: "rascunho" })
          .eq("id", pesquisa_id);
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    
    let extractedData: ExtractedData | null = null;

    // Parse tool call response
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        extractedData = JSON.parse(toolCall.function.arguments);
      } catch (e) {
        console.error("Failed to parse tool arguments:", e);
      }
    }

    if (!extractedData) {
      await supabase
        .from("pesquisas_eleitorais")
        .update({ status: "rascunho" })
        .eq("id", pesquisa_id);
      return new Response(
        JSON.stringify({ error: "Não foi possível extrair dados da pesquisa" }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update pesquisa metadata if extracted
    if (extractedData.metadata) {
      const updateData: Record<string, any> = {};
      const meta = extractedData.metadata;
      
      if (meta.titulo) updateData.titulo = meta.titulo;
      if (meta.instituto) updateData.instituto = meta.instituto;
      if (meta.data_campo_inicio) updateData.data_campo_inicio = meta.data_campo_inicio;
      if (meta.data_campo_fim) updateData.data_campo_fim = meta.data_campo_fim;
      if (meta.data_publicacao) updateData.data_publicacao = meta.data_publicacao;
      if (meta.registro_tse) updateData.registro_tse = meta.registro_tse;
      if (meta.universo) updateData.universo = meta.universo;
      if (meta.amostra_total) updateData.amostra_total = meta.amostra_total;
      if (meta.margem_erro) updateData.margem_erro = meta.margem_erro;
      if (meta.nivel_confianca) updateData.nivel_confianca = meta.nivel_confianca;
      if (meta.metodologia) updateData.metodologia = { descricao: meta.metodologia };

      if (Object.keys(updateData).length > 0) {
        await supabase
          .from("pesquisas_eleitorais")
          .update(updateData)
          .eq("id", pesquisa_id);
      }
    }

    // Insert results
    if (extractedData.resultados && extractedData.resultados.length > 0) {
      for (let i = 0; i < extractedData.resultados.length; i++) {
        const resultado = extractedData.resultados[i];
        
        const { data: resultadoData, error: resultadoError } = await supabase
          .from("pesquisa_resultados")
          .insert({
            pesquisa_id,
            tipo_pergunta: resultado.tipo_pergunta,
            pergunta: resultado.pergunta,
            cenario_descricao: resultado.cenario_descricao || null,
            ordem: i,
          })
          .select()
          .single();

        if (resultadoError) {
          console.error("Error inserting resultado:", resultadoError);
          continue;
        }

        // Insert responses
        if (resultado.respostas && resultado.respostas.length > 0) {
          const respostasToInsert = resultado.respostas.map((r, idx) => ({
            resultado_id: resultadoData.id,
            opcao: r.opcao,
            percentual: r.percentual,
            votos_absolutos: r.votos_absolutos || null,
            ordem: idx,
          }));

          const { error: respostasError } = await supabase
            .from("pesquisa_respostas")
            .insert(respostasToInsert);

          if (respostasError) {
            console.error("Error inserting respostas:", respostasError);
          }
        }
      }
    }

    // Insert crosstabs
    if (extractedData.cruzamentos && extractedData.cruzamentos.length > 0) {
      // Match cruzamentos to resultados by pergunta
      const { data: resultados } = await supabase
        .from("pesquisa_resultados")
        .select("id, pergunta")
        .eq("pesquisa_id", pesquisa_id);

      if (resultados) {
        for (const cruz of extractedData.cruzamentos) {
          // Find matching resultado
          const matchedResultado = resultados.find(r => 
            r.pergunta.toLowerCase().includes(cruz.pergunta.toLowerCase().substring(0, 20))
          );

          if (matchedResultado) {
            await supabase
              .from("pesquisa_cruzamentos")
              .insert({
                resultado_id: matchedResultado.id,
                segmento_tipo: cruz.segmento_tipo,
                segmento_valor: cruz.segmento_valor,
                opcao: cruz.opcao,
                percentual: cruz.percentual,
              });
          }
        }
      }
    }

    // Insert qualitative data
    if (extractedData.qualitativo && extractedData.qualitativo.length > 0) {
      const qualiToInsert = extractedData.qualitativo.map(q => ({
        pesquisa_id,
        tema: q.tema,
        insight: q.insight,
        verbatim: q.verbatim || null,
        sentimento: q.sentimento || null,
      }));

      await supabase
        .from("pesquisa_qualitativa")
        .insert(qualiToInsert);
    }

    // Update status to active
    await supabase
      .from("pesquisas_eleitorais")
      .update({ status: "ativa" })
      .eq("id", pesquisa_id);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Pesquisa processada com sucesso",
        data: {
          resultados_count: extractedData.resultados?.length || 0,
          cruzamentos_count: extractedData.cruzamentos?.length || 0,
          qualitativo_count: extractedData.qualitativo?.length || 0,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("process-pesquisa error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
