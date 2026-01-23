import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Configuration for chunking
const CHUNK_SIZE = 25000; // ~25k chars per chunk
const CHUNK_OVERLAP = 2000; // 2k overlap between chunks
const MAX_CHUNKS = 5; // Maximum chunks to process (125k chars total coverage)

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
  last_processed_at: string;
  partial_metadata?: ExtractedData['metadata'];
  partial_resultados?: ExtractedResult[];
  partial_cruzamentos?: ExtractedCrosstab[];
  partial_qualitativo?: ExtractedQualitativo[];
  error?: string;
}

// Split content into overlapping chunks
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

// Merge metadata from multiple chunks (first valid value wins)
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

// Deduplicate results by question + scenario
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
  
  console.log(`Merged ${merged.length} unique results from chunks`);
  return merged;
}

// Deduplicate crosstabs
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
  
  console.log(`Merged ${merged.length} unique crosstabs from chunks`);
  return merged;
}

// Deduplicate qualitative data
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

// Process a single chunk with AI
async function processChunk(
  chunk: string, 
  chunkIndex: number, 
  totalChunks: number,
  apiKey: string
): Promise<ExtractedData | null> {
  console.log(`Processing chunk ${chunkIndex + 1}/${totalChunks}, length: ${chunk.length}`);

  const systemPrompt = `Você é um especialista em análise de pesquisas eleitorais brasileiras, especialmente do Estado do Paraná.
Sua tarefa é extrair dados estruturados EXCLUSIVAMENTE do documento fornecido.

REGRAS CRÍTICAS - OBRIGATÓRIO:
1. EXTRAIA APENAS dados que estão EXPLICITAMENTE no documento fornecido
2. NÃO INVENTE, NÃO PREENCHA, NÃO COMPLETE com dados de outras fontes
3. Se um dado não estiver no documento, NÃO inclua - deixe vazio ou omita
4. NÃO use conhecimento prévio sobre pesquisas eleitorais de outros estados ou períodos
5. Se o documento for do Paraná, extraia APENAS candidatos e dados do Paraná
6. Se não conseguir identificar claramente um dado, NÃO inclua

${totalChunks > 1 ? `IMPORTANTE: Este é o chunk ${chunkIndex + 1} de ${totalChunks} de um documento grande. Extraia apenas os dados presentes neste trecho.` : ''}

INSTITUTOS CONHECIDOS NO PARANÁ:
- Ágili Pesquisas
- Neokemp 
- Real Time Big Data
- Paraná Pesquisas
- Atlas Intel
- Instituto Mapa
- IPEC
- Datafolha
- Quaest
- Veritá

TIPOS DE PERGUNTAS A IDENTIFICAR:
1. "intencao_estimulada": Quando mostra lista de candidatos para o eleitor escolher
2. "intencao_espontanea": Quando pergunta "em quem votaria" sem mostrar opções
3. "rejeicao": Perguntas como "em quem não votaria de jeito nenhum"
4. "avaliacao_governo": Avaliação de governos (federal, estadual, municipal) - ótimo/bom, regular, ruim/péssimo
5. "cenario": Cenários eleitorais com combinações específicas de candidatos
6. "outro": Outras perguntas de opinião

CRUZAMENTOS DEMOGRÁFICOS A EXTRAIR:
- Sexo: masculino, feminino
- Idade: 16-24, 25-34, 35-44, 45-59, 60+
- Escolaridade: fundamental, médio, superior
- Renda: até 2 SM, 2-5 SM, acima 5 SM
- Região: Curitiba, RMC, Norte, Oeste, Sudoeste, Litoral, Campos Gerais, etc.

FORMATO DE DATAS:
- Sempre retorne datas no formato YYYY-MM-DD
- Se a pesquisa foi realizada "de 05 a 08 de janeiro de 2025", retorne:
  - data_campo_inicio: "2025-01-05"
  - data_campo_fim: "2025-01-08"

MÚLTIPLOS CENÁRIOS:
- Se houver diferentes cenários de votação (ex: "Cenário 1", "Cenário 2"), extraia cada um como um resultado separado
- Use cenario_descricao para descrever qual cenário é (ex: "Cenário com Candidato X", "Cenário sem Candidato Y")

Use a função extract_pesquisa_data para retornar APENAS os dados encontrados no documento.`;

  const userPrompt = `ATENÇÃO: Extraia dados APENAS do documento abaixo. Não invente dados, não use conhecimento externo.
Se um candidato ou percentual não estiver explícito no texto, NÃO inclua.

${totalChunks > 1 ? `[CHUNK ${chunkIndex + 1}/${totalChunks}]` : ''}
DOCUMENTO PARA ANÁLISE:
---
${chunk}
---

INSTRUÇÕES DE EXTRAÇÃO:

1. METADADOS (se presentes no documento):
   - Título da pesquisa
   - Nome do instituto
   - Datas de campo (formato YYYY-MM-DD)
   - Registro TSE (ex: "PR-00123/2026")
   - Tamanho da amostra (número de entrevistados)
   - Margem de erro (em pontos percentuais)
   - Nível de confiança (geralmente 95%)
   - Universo pesquisado (ex: "Eleitores do Paraná com 16 anos ou mais")
   - Metodologia (telefone, presencial, online)

2. RESULTADOS (APENAS candidatos/opções mencionados):
   - Intenção de voto estimulada (com lista de candidatos)
   - Intenção de voto espontânea (se houver)
   - Rejeição de candidatos (se houver)
   - Avaliação de governo (federal, estadual - se houver)
   - Diferentes cenários eleitorais (se houver múltiplos cenários)

3. CRUZAMENTOS (se disponíveis):
   - Dados por sexo, idade, escolaridade, renda, região

LEMBRE-SE: Retorne APENAS dados explícitos do documento. Dados não encontrados devem ser omitidos.`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
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
    console.error(`Chunk ${chunkIndex + 1} failed with status:`, response.status);
    if (response.status === 429 || response.status === 402) {
      throw new Error(response.status === 429 
        ? "Limite de requisições excedido. Tente novamente mais tarde."
        : "Créditos insuficientes. Adicione créditos ao workspace.");
    }
    return null;
  }

  const aiResponse = await response.json();
  const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
  
  if (toolCall?.function?.arguments) {
    try {
      const data = JSON.parse(toolCall.function.arguments);
      console.log(`Chunk ${chunkIndex + 1} extracted: ${data.resultados?.length || 0} results, ${data.cruzamentos?.length || 0} crosstabs`);
      return data;
    } catch (e) {
      console.error(`Failed to parse chunk ${chunkIndex + 1} response:`, e);
      return null;
    }
  }
  
  return null;
}

// Update processing state in database
async function updateProcessingState(
  supabase: SupabaseClient,
  pesquisaId: string,
  state: ProcessingState
) {
  await (supabase
    .from("pesquisas_eleitorais") as any)
    .update({ ai_processing_state: state })
    .eq("id", pesquisaId);
}

// Save final results to database
async function saveFinalResults(
  supabase: SupabaseClient,
  pesquisaId: string,
  extractedData: ExtractedData
) {
  console.log(`Saving final results: ${extractedData.resultados?.length || 0} results, ${extractedData.cruzamentos?.length || 0} crosstabs`);

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
      await (supabase
        .from("pesquisas_eleitorais") as any)
        .update(updateData)
        .eq("id", pesquisaId);
    }
  }

  // Insert results
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

      // Insert responses
      if (resultado.respostas && resultado.respostas.length > 0) {
        const respostasToInsert = resultado.respostas.map((r, idx) => ({
          resultado_id: resultadoData.id,
          opcao: r.opcao,
          percentual: r.percentual,
          votos_absolutos: r.votos_absolutos || null,
          ordem: idx,
        }));

        const { error: respostasError } = await (supabase
          .from("pesquisa_respostas") as any)
          .insert(respostasToInsert);

        if (respostasError) {
          console.error("Error inserting respostas:", respostasError);
        }
      }
    }
  }

  // Insert crosstabs
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
          await (supabase
            .from("pesquisa_cruzamentos") as any)
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
      pesquisa_id: pesquisaId,
      tema: q.tema,
      insight: q.insight,
      verbatim: q.verbatim || null,
      sentimento: q.sentimento || null,
    }));

    await (supabase
      .from("pesquisa_qualitativa") as any)
      .insert(qualiToInsert);
  }

  // Update status to active and clear processing state
  await (supabase
    .from("pesquisas_eleitorais") as any)
    .update({ 
      status: "ativa",
      ai_processing_state: null 
    })
    .eq("id", pesquisaId);

  console.log("Final results saved successfully");
}

// Background processing function
async function processInBackground(
  pesquisaId: string,
  chunks: string[],
  apiKey: string,
  supabaseUrl: string,
  supabaseKey: string
) {
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  const chunkResults: (ExtractedData | null)[] = [];
  
  try {
    for (let i = 0; i < chunks.length; i++) {
      // Update progress
      const state: ProcessingState = {
        total_chunks: chunks.length,
        processed_chunks: i,
        current_chunk: i + 1,
        last_processed_at: new Date().toISOString(),
        partial_metadata: chunkResults.length > 0 
          ? mergeMetadata(chunkResults.filter(r => r !== null).map(r => r!.metadata))
          : undefined,
        partial_resultados: chunkResults.length > 0
          ? mergeResultados(chunkResults.filter(r => r !== null).map(r => r!.resultados))
          : undefined,
      };
      
      await updateProcessingState(supabase, pesquisaId, state);

      // Add delay between chunks to avoid rate limiting
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
      
      try {
        const result = await processChunk(chunks[i], i, chunks.length, apiKey);
        chunkResults.push(result);
        console.log(`Background: Chunk ${i + 1}/${chunks.length} completed`);
      } catch (error) {
        console.error(`Background: Error processing chunk ${i + 1}:`, error);
        
        if (error instanceof Error && (error.message.includes("Limite") || error.message.includes("Créditos"))) {
          // Update state with error
          await updateProcessingState(supabase, pesquisaId, {
            ...state,
            error: error.message,
          });
          
          await (supabase
            .from("pesquisas_eleitorais") as any)
            .update({ status: "erro" })
            .eq("id", pesquisaId);
          return;
        }
        
        chunkResults.push(null);
      }
    }

    // Filter out null results
    const validResults = chunkResults.filter((r): r is ExtractedData => r !== null);
    
    if (validResults.length === 0) {
      await updateProcessingState(supabase, pesquisaId, {
        total_chunks: chunks.length,
        processed_chunks: chunks.length,
        current_chunk: chunks.length,
        last_processed_at: new Date().toISOString(),
        error: "Não foi possível extrair dados da pesquisa",
      });
      
      await (supabase
        .from("pesquisas_eleitorais") as any)
        .update({ status: "erro" })
        .eq("id", pesquisaId);
      return;
    }

    // Merge results from all chunks
    const extractedData: ExtractedData = {
      metadata: mergeMetadata(validResults.map(r => r.metadata)),
      resultados: mergeResultados(validResults.map(r => r.resultados)),
      cruzamentos: mergeCruzamentos(validResults.map(r => r.cruzamentos)),
      qualitativo: mergeQualitativo(validResults.map(r => r.qualitativo)),
    };

    console.log(`Background: All chunks processed. Saving final results...`);
    
    // Save final results
    await saveFinalResults(supabase, pesquisaId, extractedData);
    
  } catch (error) {
    console.error("Background processing error:", error);
    
    await (supabase
      .from("pesquisas_eleitorais") as any)
      .update({ 
        status: "erro",
        ai_processing_state: {
          total_chunks: chunks.length,
          processed_chunks: chunkResults.length,
          current_chunk: chunkResults.length,
          last_processed_at: new Date().toISOString(),
          error: error instanceof Error ? error.message : "Erro desconhecido",
        }
      })
      .eq("id", pesquisaId);
  }
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
    await (supabase
      .from("pesquisas_eleitorais") as any)
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
      const { data: pesquisaData } = await (supabase
        .from("pesquisas_eleitorais") as any)
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
        const urlObj = new URL(file_url);
        const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/public\/pesquisas-eleitorais\/(.+)/);
        
        if (pathMatch) {
          const filePath = decodeURIComponent(pathMatch[1]);
          console.log("Extracted file path:", filePath);
          
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
              
              if (contentType.includes("text") || contentType.includes("csv")) {
                textContent = await fileResponse.text();
                console.log("Text content extracted, length:", textContent.length);
              } else {
                console.log("Binary file detected (PDF/Excel). Cannot extract text directly.");
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
      
      await (supabase
        .from("pesquisas_eleitorais") as any)
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

    console.log("Total content length:", textContent.length);

    // Split content into chunks
    const chunks = splitIntoChunks(textContent);
    console.log(`Will process ${chunks.length} chunk(s) in background`);

    // Initialize processing state
    const initialState: ProcessingState = {
      total_chunks: chunks.length,
      processed_chunks: 0,
      current_chunk: 1,
      last_processed_at: new Date().toISOString(),
    };
    
    await updateProcessingState(supabase, pesquisa_id, initialState);

    // Start background processing using EdgeRuntime.waitUntil
    // @ts-ignore - EdgeRuntime is a Deno Deploy specific API
    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
      console.log("Starting background processing with EdgeRuntime.waitUntil");
      // @ts-ignore
      EdgeRuntime.waitUntil(
        processInBackground(pesquisa_id, chunks, LOVABLE_API_KEY, supabaseUrl, supabaseKey)
      );
    } else {
      // Fallback: process synchronously (for local testing)
      console.log("EdgeRuntime not available, processing synchronously");
      await processInBackground(pesquisa_id, chunks, LOVABLE_API_KEY, supabaseUrl, supabaseKey);
    }

    // Return immediately with accepted status
    return new Response(
      JSON.stringify({
        success: true,
        status: "accepted",
        message: `Processamento iniciado. ${chunks.length} parte(s) serão processadas em segundo plano.`,
        data: {
          pesquisa_id,
          total_chunks: chunks.length,
        },
      }),
      { 
        status: 202, // Accepted - processing in background
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    console.error("process-pesquisa error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
