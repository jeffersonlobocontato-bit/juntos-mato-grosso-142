import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Parse CSV line considering quoted fields and semicolon delimiter
function parseCSVLine(line: string, delimiter = ";"): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim().replace(/^"|"$/g, ""));
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim().replace(/^"|"$/g, ""));
  return result;
}

// Map TSE column names to our structure
const COLUMN_MAPPINGS: Record<string, string> = {
  "ANO_ELEICAO": "ano_eleicao",
  "NR_TURNO": "turno",
  "DS_ELEICAO": "descricao_eleicao",
  "DT_ELEICAO": "data_eleicao",
  "SG_UF": "uf",
  "CD_MUNICIPIO": "codigo_municipio",
  "NM_MUNICIPIO": "nome_municipio",
  "NR_ZONA": "zona",
  "NR_SECAO": "secao",
  "CD_CARGO": "codigo_cargo",
  "DS_CARGO": "nome_cargo",
  "NR_VOTAVEL": "numero_urna",
  "NM_VOTAVEL": "nome_urna",
  "QT_VOTOS": "quantidade_votos",
  "SQ_CANDIDATO": "sequencial_candidato",
  "NR_LOCAL_VOTACAO": "codigo_local",
  "NM_LOCAL_VOTACAO": "local_nome",
  "DS_LOCAL_VOTACAO_ENDERECO": "endereco",
};

// Configuration
const MAX_PROCESSING_TIME_MS = 25000; // 25 seconds (leave margin for 60s timeout)
const BATCH_SIZE = 500;
const PROGRESS_UPDATE_INTERVAL = 5; // Update every 5 batches

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { ano, uf, filePath, resumeFromByte = 0, resumeFromLine = 0 } = await req.json();

    if (!ano || !uf || !filePath) {
      throw new Error("Parâmetros 'ano', 'uf' e 'filePath' são obrigatórios");
    }

    const startTime = Date.now();
    console.log(`[TSE Process] Starting for ${uf} ${ano}, resumeFromByte=${resumeFromByte}, resumeFromLine=${resumeFromLine}`);

    // Get or update import status
    const { data: existingImport } = await supabase
      .from("tse_importacoes")
      .select("*")
      .eq("ano", ano)
      .eq("uf", uf)
      .eq("tipo_arquivo", "votacao_secao")
      .single();

    const previousVotesInserted = existingImport?.registros_importados || 0;
    const previousRowsProcessed = existingImport?.total_registros || 0;

    // Detect migration mode: has line progress but no byte offset
    const isMigrationMode = resumeFromByte === 0 && resumeFromLine > 0;
    console.log(`[TSE Process] Migration mode: ${isMigrationMode}`);

    await supabase
      .from("tse_importacoes")
      .upsert({
        ano,
        uf,
        tipo_arquivo: "votacao_secao",
        status: "processando",
        file_path: filePath,
        registros_importados: previousVotesInserted,
        total_registros: previousRowsProcessed,
        current_batch: resumeFromLine,
        current_byte_offset: resumeFromByte,
      }, {
        onConflict: "ano,uf,tipo_arquivo",
      });

    // Get signed URL for the file
    const { data: signedUrl, error: signError } = await supabase.storage
      .from("tse-csv")
      .createSignedUrl(filePath, 3600);

    if (signError || !signedUrl?.signedUrl) {
      throw new Error(`Erro ao criar URL assinada: ${signError?.message}`);
    }

    // Use Range Request for efficient resumption (skip already processed bytes)
    const fetchHeaders: Record<string, string> = {};
    if (resumeFromByte > 0) {
      fetchHeaders["Range"] = `bytes=${resumeFromByte}-`;
      console.log(`[TSE Process] Using Range Request: bytes=${resumeFromByte}-`);
    }

    console.log(`[TSE Process] Fetching file via signed URL with Range: ${fetchHeaders["Range"] || "none"}`);
    
    const response = await fetch(signedUrl.signedUrl, { headers: fetchHeaders });
    
    // Get total file size from Content-Range header or Content-Length
    let totalFileSize = 0;
    const contentRange = response.headers.get("Content-Range");
    if (contentRange) {
      // Format: bytes 1000-2000/5000 (start-end/total)
      const match = contentRange.match(/\/(\d+)$/);
      if (match) {
        totalFileSize = parseInt(match[1], 10);
        console.log(`[TSE Process] Total file size from Content-Range: ${totalFileSize}`);
      }
    } else {
      const contentLength = response.headers.get("Content-Length");
      if (contentLength) {
        totalFileSize = parseInt(contentLength, 10) + resumeFromByte;
        console.log(`[TSE Process] Estimated total file size: ${totalFileSize}`);
      }
    }

    // Update total file size in DB if we got it
    if (totalFileSize > 0) {
      await supabase
        .from("tse_importacoes")
        .update({ total_file_size: totalFileSize })
        .eq("ano", ano)
        .eq("uf", uf)
        .eq("tipo_arquivo", "votacao_secao");
    }

    if (!response.ok || !response.body) {
      // 416 Range Not Satisfiable means we've processed the whole file
      if (response.status === 416) {
        console.log(`[TSE Process] File fully processed (416 Range Not Satisfiable)`);
        await supabase
          .from("tse_importacoes")
          .update({
            status: "concluido",
            updated_at: new Date().toISOString(),
          })
          .eq("ano", ano)
          .eq("uf", uf)
          .eq("tipo_arquivo", "votacao_secao");

        return new Response(
          JSON.stringify({
            success: true,
            shouldContinue: false,
            lastByteOffset: resumeFromByte,
            totalVotesInserted: previousVotesInserted,
            totalRowsProcessed: previousRowsProcessed,
            message: `Arquivo completamente processado! ${previousVotesInserted.toLocaleString()} votos importados.`,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }
      throw new Error(`Erro ao baixar arquivo: ${response.statusText} (${response.status})`);
    }

    // Get or create election record
    const tipoEleicao = ano % 4 === 0 ? "municipal" : "federal";
    const { data: eleicao, error: eleicaoError } = await supabase
      .from("tse_eleicoes")
      .upsert({
        ano,
        turno: 1,
        tipo: tipoEleicao,
        descricao: tipoEleicao === "municipal" 
          ? `Eleições Municipais ${ano}` 
          : `Eleições Gerais ${ano}`,
      }, {
        onConflict: "ano,turno,tipo",
      })
      .select()
      .single();

    if (eleicaoError) {
      throw new Error(`Erro ao criar eleição: ${eleicaoError.message}`);
    }

    // Get existing cargos
    const { data: existingCargos } = await supabase
      .from("tse_cargos")
      .select("id, codigo_tse");

    const cargoMap: Record<number, string> = {};
    existingCargos?.forEach(c => {
      cargoMap[c.codigo_tse] = c.id;
    });

    // Pre-load existing candidates and locations to avoid duplicates
    console.log(`[TSE Process] Loading existing candidates and locations cache...`);
    const candidatoIdCache: Record<string, string> = {};
    const localIdCache: Record<string, string> = {};

    const { data: existingCandidatos } = await supabase
      .from("tse_candidatos")
      .select("id, numero_urna, uf, cargo_id")
      .eq("eleicao_id", eleicao.id)
      .eq("uf", uf);
    
    existingCandidatos?.forEach(c => {
      const cargoCode = Object.entries(cargoMap).find(([_, v]) => v === c.cargo_id)?.[0];
      if (cargoCode) {
        candidatoIdCache[`${c.numero_urna}_${uf}_${cargoCode}`] = c.id;
      }
      candidatoIdCache[`${c.numero_urna}_${uf}`] = c.id;
    });

    const { data: existingLocais } = await supabase
      .from("tse_locais_votacao")
      .select("id, uf, zona, secao")
      .eq("uf", uf);
    
    existingLocais?.forEach(l => {
      localIdCache[`${l.uf}_${l.zona}_${l.secao}`] = l.id;
    });
    
    console.log(`[TSE Process] Cached ${Object.keys(candidatoIdCache).length} candidates, ${Object.keys(localIdCache).length} locations`);

    // Stream processing with line-by-line reading
    const reader = response.body.getReader();
    const decoder = new TextDecoder("latin1");
    let buffer = "";
    let headers: string[] = [];
    let columnIndices: Record<string, number> = {};
    let isFirstLine = resumeFromByte === 0; // Only parse header if starting from beginning
    let currentLine = resumeFromByte > 0 ? resumeFromLine : 0;
    let processedInThisChunk = 0;
    let votesInsertedInThisChunk = 0;
    let shouldContinue = false;
    let lastProcessedLine = resumeFromLine;
    let currentByteOffset = resumeFromByte;
    let bytesReadInChisChunk = 0;

    // If resuming from byte offset, we need to skip the first partial line
    let skipFirstLine = resumeFromByte > 0;
    let needToParseHeader = resumeFromByte === 0;

    // If we have cached columns from header (we don't have header in Range response)
    // We need to fetch just the header separately
    if (resumeFromByte > 0) {
      console.log(`[TSE Process] Fetching header separately for Range resumption...`);
      const headerResponse = await fetch(signedUrl.signedUrl, {
        headers: { "Range": "bytes=0-5000" } // First 5KB should contain header
      });
      if (headerResponse.ok) {
        const headerText = await headerResponse.text();
        const headerLine = headerText.split("\n")[0];
        const rawHeaders = parseCSVLine(headerLine);
        rawHeaders.forEach((header, index) => {
          const cleanHeader = header.replace(/^\ufeff/, "").trim().toUpperCase();
          if (COLUMN_MAPPINGS[cleanHeader]) {
            columnIndices[COLUMN_MAPPINGS[cleanHeader]] = index;
          }
        });
        console.log(`[TSE Process] Headers fetched: ${Object.keys(columnIndices).length} columns mapped`);
      }
    }

    // Batching structures
    const candidatosMap = new Map<string, any>();
    const locaisMap = new Map<string, any>();
    const cargosMap = new Map<number, any>();
    let votosBatch: any[] = [];
    let batchCount = 0;

    console.log(`[TSE Process] Starting stream processing`);

    // Helper function to flush batches
    async function flushBatches() {
      // Insert cargos if any
      if (cargosMap.size > 0) {
        const { data: inserted } = await supabase
          .from("tse_cargos")
          .upsert(Array.from(cargosMap.values()), { onConflict: "codigo_tse", ignoreDuplicates: true })
          .select();
        inserted?.forEach(c => { cargoMap[c.codigo_tse] = c.id; });
        cargosMap.clear();
      }

      // Insert candidates
      if (candidatosMap.size > 0) {
        const batch = Array.from(candidatosMap.values()).map(({ _codigo_cargo, _key, ...rest }) => ({
          ...rest,
          cargo_id: cargoMap[_codigo_cargo] || rest.cargo_id,
        }));
        
        const { data: inserted } = await supabase
          .from("tse_candidatos")
          .upsert(batch, { onConflict: "eleicao_id,numero_urna,uf", ignoreDuplicates: false })
          .select("id, numero_urna, uf, cargo_id");
        
        inserted?.forEach(c => {
          const key = `${c.numero_urna}_${uf}_${Object.keys(cargoMap).find(k => cargoMap[parseInt(k)] === c.cargo_id) || "0"}`;
          candidatoIdCache[key] = c.id;
          candidatoIdCache[`${c.numero_urna}_${uf}`] = c.id;
        });
        candidatosMap.clear();
      }

      // Insert locations
      if (locaisMap.size > 0) {
        const batch = Array.from(locaisMap.values()).map(({ _key, ...rest }) => rest);
        
        const { data: inserted } = await supabase
          .from("tse_locais_votacao")
          .upsert(batch, { onConflict: "uf,zona,secao", ignoreDuplicates: false })
          .select("id, uf, zona, secao");
        
        inserted?.forEach(l => {
          localIdCache[`${l.uf}_${l.zona}_${l.secao}`] = l.id;
        });
        locaisMap.clear();
      }

      // Insert votes
      if (votosBatch.length > 0) {
        const votosToInsert = votosBatch.map(v => {
          const candidatoId = candidatoIdCache[v.candidatoKey] || candidatoIdCache[`${v.candidatoKey.split("_")[0]}_${uf}`];
          return {
            eleicao_id: v.eleicao_id,
            candidato_id: candidatoId || null,
            local_id: localIdCache[v.localKey] || null,
            uf,
            codigo_municipio_tse: v.codigoMunicipio,
            zona: v.zona,
            secao: v.secao,
            quantidade: v.quantidade,
          };
        }).filter(v => v.candidato_id);

        if (votosToInsert.length > 0) {
          const { error: votosError } = await supabase.from("tse_votos").insert(votosToInsert);
          if (!votosError) votesInsertedInThisChunk += votosToInsert.length;
        }
        votosBatch = [];
      }
      batchCount++;
    }

    // Process stream
    processing: while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunkBytes = value.length;
      bytesReadInChisChunk += chunkBytes;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      
      for (const line of lines) {
        if (!line.trim()) continue;
        
        currentLine++;
        
        // Skip first partial line when resuming from byte offset
        if (skipFirstLine) {
          skipFirstLine = false;
          console.log(`[TSE Process] Skipped partial first line after Range resume`);
          continue;
        }
        
        // Handle header (only when starting from beginning)
        if (needToParseHeader) {
          headers = parseCSVLine(line);
          headers.forEach((header, index) => {
            const cleanHeader = header.replace(/^\ufeff/, "").trim().toUpperCase();
            if (COLUMN_MAPPINGS[cleanHeader]) {
              columnIndices[COLUMN_MAPPINGS[cleanHeader]] = index;
            }
          });
          console.log(`[TSE Process] Headers parsed: ${Object.keys(columnIndices).length} columns mapped`);
          needToParseHeader = false;
          continue;
        }

        // Check if we should stop this chunk
        if (Date.now() - startTime > MAX_PROCESSING_TIME_MS) {
          console.log(`[TSE Process] Time limit reached at line ${currentLine}, byte ${currentByteOffset + bytesReadInChisChunk}`);
          shouldContinue = true;
          break processing;
        }

        const values = parseCSVLine(line);
        
        const getValue = (key: string) => {
          const idx = columnIndices[key];
          return idx !== undefined ? values[idx] : undefined;
        };

        const numeroUrna = parseInt(getValue("numero_urna") || "0");
        const nomeUrna = getValue("nome_urna") || "";
        const quantidade = parseInt(getValue("quantidade_votos") || "0");
        const codigoMunicipio = parseInt(getValue("codigo_municipio") || "0");
        const nomeMunicipio = getValue("nome_municipio") || "";
        const zona = parseInt(getValue("zona") || "0");
        const secao = parseInt(getValue("secao") || "0");
        const codigoCargo = parseInt(getValue("codigo_cargo") || "0");
        const nomeCargo = getValue("nome_cargo") || "";
        const sequencialCandidato = getValue("sequencial_candidato") || "";
        const codigoLocal = parseInt(getValue("codigo_local") || "0");
        const localNome = getValue("local_nome") || "";
        const endereco = getValue("endereco") || "";

        if (!numeroUrna || !nomeUrna) continue;

        // Track cargos
        if (codigoCargo && !cargoMap[codigoCargo] && !cargosMap.has(codigoCargo)) {
          cargosMap.set(codigoCargo, {
            codigo_tse: codigoCargo,
            nome: nomeCargo,
            abrangencia: codigoCargo <= 5 ? "federal" : "estadual",
          });
        }

        // Track candidates
        const candidatoKey = `${numeroUrna}_${uf}_${codigoCargo}`;
        if (!candidatosMap.has(candidatoKey) && !candidatoIdCache[candidatoKey]) {
          candidatosMap.set(candidatoKey, {
            eleicao_id: eleicao.id,
            cargo_id: cargoMap[codigoCargo] || null,
            partido_id: null,
            numero_urna: numeroUrna,
            nome_urna: nomeUrna,
            uf,
            situacao: "candidato",
            sequencial_tse: sequencialCandidato || null,
            _codigo_cargo: codigoCargo,
            _key: candidatoKey,
          });
        }

        // Track locations
        const localKey = `${uf}_${zona}_${secao}`;
        if (!locaisMap.has(localKey) && !localIdCache[localKey]) {
          locaisMap.set(localKey, {
            uf,
            zona,
            secao,
            codigo_municipio_tse: codigoMunicipio,
            nome_municipio: nomeMunicipio,
            codigo_local_tse: codigoLocal || null,
            local_nome: localNome || null,
            endereco: endereco || null,
            _key: localKey,
          });
        }

        // Add vote to batch
        votosBatch.push({
          candidatoKey,
          localKey,
          quantidade,
          codigoMunicipio,
          zona,
          secao,
          eleicao_id: eleicao.id,
        });

        processedInThisChunk++;
        lastProcessedLine = currentLine;

        // Flush batches periodically
        if (votosBatch.length >= BATCH_SIZE) {
          await flushBatches();

          // Update progress
          if (batchCount % PROGRESS_UPDATE_INTERVAL === 0) {
            const totalVotes = previousVotesInserted + votesInsertedInThisChunk;
            const totalRows = previousRowsProcessed + processedInThisChunk;
            const newByteOffset = currentByteOffset + bytesReadInChisChunk;
            
            await supabase
              .from("tse_importacoes")
              .update({
                registros_importados: totalVotes,
                total_registros: totalRows,
                current_batch: lastProcessedLine,
                current_byte_offset: newByteOffset,
              })
              .eq("ano", ano)
              .eq("uf", uf)
              .eq("tipo_arquivo", "votacao_secao");
            
            console.log(`[TSE Process] Progress: line ${lastProcessedLine}, byte ${newByteOffset}, ${totalVotes} votes total`);
          }
        }
      }
    }

    // Flush remaining batches
    await flushBatches();

    const totalVotesInserted = previousVotesInserted + votesInsertedInThisChunk;
    const totalRowsProcessed = previousRowsProcessed + processedInThisChunk;
    const finalByteOffset = currentByteOffset + bytesReadInChisChunk;

    // Update final status
    await supabase
      .from("tse_importacoes")
      .update({
        status: shouldContinue ? "processando" : "concluido",
        registros_importados: totalVotesInserted,
        total_registros: totalRowsProcessed,
        current_batch: lastProcessedLine,
        current_byte_offset: finalByteOffset,
        updated_at: new Date().toISOString(),
      })
      .eq("ano", ano)
      .eq("uf", uf)
      .eq("tipo_arquivo", "votacao_secao");

    const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(1);
    const bytesPerSecond = Math.round(bytesReadInChisChunk / parseFloat(elapsedSeconds));
    console.log(`[TSE Process] Chunk complete in ${elapsedSeconds}s: ${processedInThisChunk} rows, ${votesInsertedInThisChunk} votes, ${(bytesReadInChisChunk/1024/1024).toFixed(2)}MB @ ${(bytesPerSecond/1024/1024).toFixed(2)}MB/s. Continue: ${shouldContinue}`);

    return new Response(
      JSON.stringify({
        success: true,
        shouldContinue,
        lastProcessedLine,
        lastByteOffset: finalByteOffset,
        processedInThisChunk,
        votesInsertedInThisChunk,
        totalVotesInserted,
        totalRowsProcessed,
        totalFileSize,
        bytesPerSecond,
        message: shouldContinue 
          ? `Processou ${processedInThisChunk.toLocaleString()} linhas (${(bytesReadInChisChunk/1024/1024).toFixed(1)}MB). Continuando...`
          : `Concluído! ${totalVotesInserted.toLocaleString()} votos importados.`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("[TSE Process] Error:", error);

    // Update error status
    try {
      const body = await req.clone().json().catch(() => ({}));
      const { ano, uf } = body;
      if (ano && uf) {
        await supabase
          .from("tse_importacoes")
          .update({
            status: "erro",
            erro_mensagem: error instanceof Error ? error.message : "Erro desconhecido",
            updated_at: new Date().toISOString(),
          })
          .eq("ano", ano)
          .eq("uf", uf)
          .eq("tipo_arquivo", "votacao_secao");
      }
    } catch (e) {
      console.error("[TSE Process] Failed to update error status:", e);
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
