import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Configuration for chunking - reduced to avoid timeouts
const CHUNK_SIZE = 12000;
const CHUNK_OVERLAP = 1500;
const MAX_CHUNKS = 10;

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

interface ExtractedQualitativo {
  tema: string;
  insight: string;
  verbatim?: string;
  sentimento?: string;
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
  qualitativo?: ExtractedQualitativo[];
}

interface ProcessingState {
  total_chunks: number;
  processed_chunks: number;
  current_chunk: number;
  content_length: number;
  partial_metadata?: ExtractedData['metadata'];
  partial_resultados?: ExtractedResult[];
  partial_cruzamentos?: ExtractedCrosstab[];
  partial_qualitativo?: ExtractedQualitativo[];
  error?: string;
}

function splitIntoChunks(content: string): string[] {
  if (content.length <= CHUNK_SIZE) {
    return [content];
  }

  const chunks: string[] = [];
  let start = 0;
  
  while (start < content.length && chunks.length < MAX_CHUNKS) {
    const end = Math.min(start + CHUNK_SIZE, content.length);
    chunks.push(content.substring(start, end));
    start = end - CHUNK_OVERLAP;
  }

  console.log(`Split content into ${chunks.length} chunks. Sizes: ${chunks.map(c => c.length).join(', ')}`);
  return chunks;
}

function mergeMetadata(metadataArray: ExtractedData['metadata'][]): ExtractedData['metadata'] {
  const merged: ExtractedData['metadata'] = {};
  
  for (const meta of metadataArray) {
    if (!meta) continue;
    if (meta.titulo && !merged.titulo) merged.titulo = meta.titulo;
    if (meta.instituto && !merged.instituto) merged.instituto = meta.instituto;
    if (meta.data_campo_inicio && !merged.data_campo_inicio) merged.data_campo_inicio = meta.data_campo_inicio;
    if (meta.data_campo_fim && !merged.data_campo_fim) merged.data_campo_fim = meta.data_campo_fim;
    if (meta.data_publicacao && !merged.data_publicacao) merged.data_publicacao = meta.data_publicacao;
    if (meta.registro_tse && !merged.registro_tse) merged.registro_tse = meta.registro_tse;
    if (meta.universo && !merged.universo) merged.universo = meta.universo;
    if (meta.amostra_total && !merged.amostra_total) merged.amostra_total = meta.amostra_total;
    if (meta.margem_erro && !merged.margem_erro) merged.margem_erro = meta.margem_erro;
    if (meta.nivel_confianca && !merged.nivel_confianca) merged.nivel_confianca = meta.nivel_confianca;
    if (meta.metodologia && !merged.metodologia) merged.metodologia = meta.metodologia;
  }
  
  return merged;
}

function mergeResultados(resultsArrays: ExtractedResult[][]): ExtractedResult[] {
  const merged: ExtractedResult[] = [];
  const seen = new Set<string>();
  
  for (const results of resultsArrays) {
    if (!results) continue;
    for (const result of results) {
      const key = `${result.tipo_pergunta}|${result.pergunta?.substring(0, 50)}|${result.cenario_descricao || ''}`;
      
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(result);
      }
    }
  }
  
  return merged;
}

function mergeCruzamentos(cruzsArrays: ExtractedCrosstab[][]): ExtractedCrosstab[] {
  const merged: ExtractedCrosstab[] = [];
  const seen = new Set<string>();
  
  for (const cruzs of cruzsArrays) {
    if (!cruzs) continue;
    for (const cruz of cruzs) {
      const key = `${cruz.pergunta?.substring(0, 30)}|${cruz.segmento_tipo}|${cruz.segmento_valor}|${cruz.opcao}`;
      
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(cruz);
      }
    }
  }
  
  return merged;
}

function mergeQualitativo(qualiArrays: (ExtractedQualitativo[] | undefined)[]): ExtractedQualitativo[] {
  const merged: ExtractedQualitativo[] = [];
  const seen = new Set<string>();
  
  for (const qualis of qualiArrays) {
    if (!qualis) continue;
    for (const quali of qualis) {
      const key = `${quali.tema}|${quali.insight?.substring(0, 50)}`;
      
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(quali);
      }
    }
  }
  
  return merged;
}

async function processChunk(
  chunk: string, 
  chunkIndex: number, 
  totalChunks: number,
  apiKey: string
): Promise<ExtractedData | null> {
  console.log(`Processing chunk ${chunkIndex + 1}/${totalChunks}, length: ${chunk.length}`);

  const systemPrompt = `Você é um especialista em análise de pesquisas eleitorais brasileiras.
Sua tarefa é extrair dados estruturados EXCLUSIVAMENTE do documento fornecido.

REGRAS CRÍTICAS:
1. EXTRAIA APENAS dados que estão EXPLICITAMENTE no documento
2. NÃO INVENTE, NÃO PREENCHA com dados externos
3. Se um dado não estiver no documento, NÃO inclua
4. IGNORE textos residuais de templates antigos (ex: marcas d'água, cabeçalhos de outras pesquisas)
5. Se o documento mencionar uma pesquisa principal (ex: "Estado do Paraná 2026") e textos de outras pesquisas antigas (ex: "Piraquara 2018"), FOQUE APENAS na pesquisa principal mais recente
6. Identifique a pesquisa principal pelo registro TSE, data mais recente, e objetivo declarado

${totalChunks > 1 ? `IMPORTANTE: Este é o chunk ${chunkIndex + 1} de ${totalChunks}. Extraia apenas os dados presentes neste trecho.` : ''}

TIPOS DE PERGUNTAS:
- "intencao_estimulada", "intencao_espontanea", "rejeicao", "avaliacao_governo", "cenario", "outro"

FORMATO DE DATAS: YYYY-MM-DD`;

  const userPrompt = `Extraia dados APENAS do documento abaixo:

${totalChunks > 1 ? `[CHUNK ${chunkIndex + 1}/${totalChunks}]` : ''}
---
${chunk}
---`;

  // Add timeout controller to prevent gateway timeout (55s to leave margin for 60s gateway limit)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 55000);

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
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
                    titulo: { type: "string" },
                    instituto: { type: "string" },
                    data_campo_inicio: { type: "string" },
                    data_campo_fim: { type: "string" },
                    data_publicacao: { type: "string" },
                    registro_tse: { type: "string" },
                    universo: { type: "string" },
                    amostra_total: { type: "number" },
                    margem_erro: { type: "number" },
                    nivel_confianca: { type: "number" },
                    metodologia: { type: "string" },
                  },
                },
                resultados: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      tipo_pergunta: { type: "string", enum: ["intencao_espontanea", "intencao_estimulada", "rejeicao", "avaliacao_governo", "cenario", "outro"] },
                      pergunta: { type: "string" },
                      cenario_descricao: { type: "string" },
                      respostas: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            opcao: { type: "string" },
                            percentual: { type: "number" },
                            votos_absolutos: { type: "number" },
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
                      pergunta: { type: "string" },
                      segmento_tipo: { type: "string" },
                      segmento_valor: { type: "string" },
                      opcao: { type: "string" },
                      percentual: { type: "number" },
                    },
                    required: ["pergunta", "segmento_tipo", "segmento_valor", "opcao", "percentual"],
                  },
                },
                qualitativo: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      tema: { type: "string" },
                      insight: { type: "string" },
                      verbatim: { type: "string" },
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

    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.error(`Chunk ${chunkIndex + 1} failed with status:`, response.status);
      if (response.status === 429 || response.status === 402) {
        throw new Error(response.status === 429 
          ? "Limite de requisições excedido. Tente novamente mais tarde."
          : "Créditos insuficientes.");
      }
      return null;
    }

    const aiResponse = await response.json();
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    
    if (toolCall?.function?.arguments) {
      try {
        const data = JSON.parse(toolCall.function.arguments);
        console.log(`Chunk ${chunkIndex + 1} extracted: ${data.resultados?.length || 0} results`);
        return data;
      } catch (e) {
        console.error(`Failed to parse chunk ${chunkIndex + 1}:`, e);
        return null;
      }
    }
    
    return null;
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    
    // Check if it's an abort error (timeout)
    if (error instanceof Error && error.name === 'AbortError') {
      console.error(`Chunk ${chunkIndex + 1} timeout after 55 seconds - will retry on next request`);
      return null;
    }
    
    throw error;
  }
}

async function saveFinalResults(
  supabase: SupabaseClient,
  pesquisaId: string,
  extractedData: ExtractedData
) {
  console.log(`Saving final results: ${extractedData.resultados?.length || 0} results`);

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
      await (supabase.from("pesquisas_eleitorais") as any)
        .update(updateData)
        .eq("id", pesquisaId);
    }
  }

  if (extractedData.resultados && extractedData.resultados.length > 0) {
    for (let i = 0; i < extractedData.resultados.length; i++) {
      const resultado = extractedData.resultados[i];
      
      const { data: resultadoData, error: resultadoError } = await (supabase
        .from("pesquisa_resultados") as any)
        .insert({
          pesquisa_id: pesquisaId,
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

      if (resultado.respostas && resultado.respostas.length > 0) {
        const respostasToInsert = resultado.respostas.map((r, idx) => ({
          resultado_id: resultadoData.id,
          opcao: r.opcao,
          percentual: r.percentual,
          votos_absolutos: r.votos_absolutos || null,
          ordem: idx,
        }));

        await (supabase.from("pesquisa_respostas") as any).insert(respostasToInsert);
      }
    }
  }

  if (extractedData.cruzamentos && extractedData.cruzamentos.length > 0) {
    const { data: resultados } = await (supabase
      .from("pesquisa_resultados") as any)
      .select("id, pergunta")
      .eq("pesquisa_id", pesquisaId);

    if (resultados) {
      for (const cruz of extractedData.cruzamentos) {
        const matchedResultado = resultados.find((r: any) => 
          r.pergunta.toLowerCase().includes(cruz.pergunta.toLowerCase().substring(0, 20))
        );

        if (matchedResultado) {
          await (supabase.from("pesquisa_cruzamentos") as any)
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

  if (extractedData.qualitativo && extractedData.qualitativo.length > 0) {
    const qualiToInsert = extractedData.qualitativo.map(q => ({
      pesquisa_id: pesquisaId,
      tema: q.tema,
      insight: q.insight,
      verbatim: q.verbatim || null,
      sentimento: q.sentimento || null,
    }));

    await (supabase.from("pesquisa_qualitativa") as any).insert(qualiToInsert);
  }

  await (supabase.from("pesquisas_eleitorais") as any)
    .update({ status: "ativa", ai_processing_state: null })
    .eq("id", pesquisaId);

  console.log("Final results saved successfully");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pesquisa_id, file_url, content_text, process_next_chunk } = await req.json();

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

    // Check if we're continuing from a previous state
    const { data: pesquisaData } = await (supabase
      .from("pesquisas_eleitorais") as any)
      .select("ai_processing_state, content")
      .eq("id", pesquisa_id)
      .single();

    let state: ProcessingState | null = pesquisaData?.ai_processing_state as ProcessingState | null;

    // If process_next_chunk is true, we're continuing an existing process
    if (process_next_chunk && state && state.content_length && state.processed_chunks < state.total_chunks) {
      // Regenerate chunks from saved content
      const savedContent = pesquisaData?.content?.trim() || "";
      const chunks = splitIntoChunks(savedContent);
      
      const chunkIndex = state.processed_chunks;
      const chunk = chunks[chunkIndex];

      console.log(`Continuing: Processing chunk ${chunkIndex + 1}/${state.total_chunks}`);

      try {
        const result = await processChunk(chunk, chunkIndex, state.total_chunks, LOVABLE_API_KEY);
        
        // Update state with new result
        const newState: ProcessingState = {
          ...state,
          processed_chunks: chunkIndex + 1,
          current_chunk: chunkIndex + 2,
          partial_metadata: result?.metadata 
            ? mergeMetadata([state.partial_metadata || {}, result.metadata])
            : state.partial_metadata,
          partial_resultados: result?.resultados
            ? mergeResultados([state.partial_resultados || [], result.resultados])
            : state.partial_resultados,
          partial_cruzamentos: result?.cruzamentos
            ? mergeCruzamentos([state.partial_cruzamentos || [], result.cruzamentos])
            : state.partial_cruzamentos,
          partial_qualitativo: result?.qualitativo
            ? mergeQualitativo([state.partial_qualitativo, result.qualitativo])
            : state.partial_qualitativo,
        };

        // Check if we're done
        if (newState.processed_chunks >= newState.total_chunks) {
          console.log("All chunks processed, saving final results...");
          
          const finalData: ExtractedData = {
            metadata: newState.partial_metadata || {},
            resultados: newState.partial_resultados || [],
            cruzamentos: newState.partial_cruzamentos || [],
            qualitativo: newState.partial_qualitativo,
          };

          await saveFinalResults(supabase, pesquisa_id, finalData);

          return new Response(
            JSON.stringify({
              success: true,
              status: "completed",
              message: "Processamento concluído!",
              data: {
                total_chunks: newState.total_chunks,
                resultados_count: finalData.resultados.length,
                cruzamentos_count: finalData.cruzamentos.length,
              },
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Save state and return for next chunk
        await (supabase.from("pesquisas_eleitorais") as any)
          .update({ ai_processing_state: newState })
          .eq("id", pesquisa_id);

        return new Response(
          JSON.stringify({
            success: true,
            status: "processing",
            message: `Chunk ${chunkIndex + 1}/${state.total_chunks} processado`,
            data: {
              total_chunks: newState.total_chunks,
              processed_chunks: newState.processed_chunks,
              needs_more: true,
            },
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

      } catch (error) {
        console.error("Error processing chunk:", error);
        
        await (supabase.from("pesquisas_eleitorais") as any)
          .update({ 
            status: "erro",
            ai_processing_state: { ...state, error: error instanceof Error ? error.message : "Erro desconhecido" }
          })
          .eq("id", pesquisa_id);

        return new Response(
          JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Initial processing - set up chunks
    await (supabase.from("pesquisas_eleitorais") as any)
      .update({ status: "processando" })
      .eq("id", pesquisa_id);

    let textContent = "";

    if (content_text && content_text.trim().length > 50) {
      console.log("Using provided content_text, length:", content_text.length);
      textContent = content_text.trim();
    } else if (pesquisaData?.content && pesquisaData.content.trim().length > 50) {
      console.log("Using database content, length:", pesquisaData.content.length);
      textContent = pesquisaData.content.trim();
    }

    if (!textContent && file_url) {
      console.log("Attempting to download file from:", file_url);
      
      try {
        const urlObj = new URL(file_url);
        const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/public\/pesquisas-eleitorais\/(.+)/);
        
        if (pathMatch) {
          const filePath = decodeURIComponent(pathMatch[1]);
          
          const { data: signedUrlData } = await supabase
            .storage
            .from('pesquisas-eleitorais')
            .createSignedUrl(filePath, 3600);

          if (signedUrlData?.signedUrl) {
            const fileResponse = await fetch(signedUrlData.signedUrl);
            
            if (fileResponse.ok) {
              const contentType = fileResponse.headers.get("content-type") || "";
              if (contentType.includes("text") || contentType.includes("csv")) {
                textContent = await fileResponse.text();
              }
            }
          }
        }
      } catch (fileError) {
        console.error("Error fetching file:", fileError);
      }
    }

    if (!textContent || textContent.length < 100) {
      console.error("Insufficient content. Length:", textContent?.length || 0);
      
      await (supabase.from("pesquisas_eleitorais") as any)
        .update({ status: "rascunho" })
        .eq("id", pesquisa_id);

      return new Response(
        JSON.stringify({ 
          error: "Conteúdo insuficiente. Cole o texto na aba 'Dados Manuais'.",
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const chunks = splitIntoChunks(textContent);
    console.log(`Will process ${chunks.length} chunk(s)`);

    // For single chunk, process immediately
    if (chunks.length === 1) {
      console.log("Single chunk - processing immediately");
      
      const result = await processChunk(chunks[0], 0, 1, LOVABLE_API_KEY);
      
      if (!result) {
        await (supabase.from("pesquisas_eleitorais") as any)
          .update({ status: "rascunho" })
          .eq("id", pesquisa_id);

        return new Response(
          JSON.stringify({ error: "Não foi possível extrair dados" }),
          { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await saveFinalResults(supabase, pesquisa_id, result);

      return new Response(
        JSON.stringify({
          success: true,
          status: "completed",
          message: "Processamento concluído!",
          data: {
            total_chunks: 1,
            resultados_count: result.resultados?.length || 0,
            cruzamentos_count: result.cruzamentos?.length || 0,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Multiple chunks - process first chunk and save state
    console.log("Multiple chunks - processing first chunk");
    
    const result = await processChunk(chunks[0], 0, chunks.length, LOVABLE_API_KEY);

    const initialState: ProcessingState = {
      total_chunks: chunks.length,
      processed_chunks: 1,
      current_chunk: 2,
      content_length: textContent.length,
      partial_metadata: result?.metadata,
      partial_resultados: result?.resultados || [],
      partial_cruzamentos: result?.cruzamentos || [],
      partial_qualitativo: result?.qualitativo,
    };

    await (supabase.from("pesquisas_eleitorais") as any)
      .update({ ai_processing_state: initialState })
      .eq("id", pesquisa_id);

    return new Response(
      JSON.stringify({
        success: true,
        status: "processing",
        message: `Chunk 1/${chunks.length} processado`,
        data: {
          total_chunks: chunks.length,
          processed_chunks: 1,
          needs_more: true,
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
