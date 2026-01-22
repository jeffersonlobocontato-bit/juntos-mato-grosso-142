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

// Streaming line reader for large files
async function* readLinesFromStream(stream: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder("latin1"); // TSE uses ISO-8859-1
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      
      for (const line of lines) {
        if (line.trim()) yield line;
      }
    }
    
    // Yield remaining buffer
    if (buffer.trim()) yield buffer;
  } finally {
    reader.releaseLock();
  }
}

async function processCSVInBackground(ano: number, uf: string, filePath: string) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    console.log(`[Background] Starting processing for ${uf} ${ano}: ${filePath}`);

    // Update import status
    await supabase
      .from("tse_importacoes")
      .upsert({
        ano,
        uf,
        tipo_arquivo: "votacao_secao",
        status: "processando",
        file_path: filePath,
        registros_importados: 0,
        current_batch: 0,
      }, {
        onConflict: "ano,uf,tipo_arquivo",
      });

    // Get file as stream (not loading all in memory)
    const { data: signedUrl, error: signError } = await supabase.storage
      .from("tse-csv")
      .createSignedUrl(filePath, 3600); // 1 hour

    if (signError || !signedUrl?.signedUrl) {
      throw new Error(`Erro ao criar URL assinada: ${signError?.message}`);
    }

    console.log(`[Background] Fetching file via signed URL`);
    
    const response = await fetch(signedUrl.signedUrl);
    if (!response.ok || !response.body) {
      throw new Error(`Erro ao baixar arquivo: ${response.statusText}`);
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

    // Process streaming
    let headers: string[] = [];
    let columnIndices: Record<string, number> = {};
    let isFirstLine = true;
    let processedRows = 0;
    let totalVotosInserted = 0;
    
    // Batching structures
    const BATCH_SIZE = 500;
    const candidatosMap = new Map<string, any>();
    const locaisMap = new Map<string, any>();
    const cargosMap = new Map<number, any>();
    const candidatoIdCache: Record<string, string> = {};
    const localIdCache: Record<string, string> = {};
    let votosBatch: any[] = [];
    let batchCount = 0;

    console.log(`[Background] Starting stream processing`);

    for await (const line of readLinesFromStream(response.body)) {
      if (isFirstLine) {
        headers = parseCSVLine(line);
        headers.forEach((header, index) => {
          const cleanHeader = header.replace(/^\ufeff/, "").trim().toUpperCase();
          if (COLUMN_MAPPINGS[cleanHeader]) {
            columnIndices[COLUMN_MAPPINGS[cleanHeader]] = index;
          }
        });
        console.log(`[Background] Headers parsed: ${Object.keys(columnIndices).length} columns mapped`);
        isFirstLine = false;
        continue;
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

      processedRows++;

      // Flush batches periodically
      if (votosBatch.length >= BATCH_SIZE) {
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
            // Also cache simpler key
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
          if (!votosError) totalVotosInserted += votosToInsert.length;
        }

        votosBatch = [];
        batchCount++;

        // Update progress every 10 batches
        if (batchCount % 10 === 0) {
          await supabase
            .from("tse_importacoes")
            .update({
              registros_importados: totalVotosInserted,
              current_batch: batchCount,
              total_registros: processedRows,
            })
            .eq("ano", ano)
            .eq("uf", uf)
            .eq("tipo_arquivo", "votacao_secao");
          
          console.log(`[Background] Progress: ${processedRows} rows, ${totalVotosInserted} votes inserted`);
        }
      }
    }

    // Flush remaining data
    if (cargosMap.size > 0 || candidatosMap.size > 0 || locaisMap.size > 0 || votosBatch.length > 0) {
      if (cargosMap.size > 0) {
        const { data: inserted } = await supabase
          .from("tse_cargos")
          .upsert(Array.from(cargosMap.values()), { onConflict: "codigo_tse", ignoreDuplicates: true })
          .select();
        inserted?.forEach(c => { cargoMap[c.codigo_tse] = c.id; });
      }

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
          candidatoIdCache[`${c.numero_urna}_${uf}`] = c.id;
        });
      }

      if (locaisMap.size > 0) {
        const batch = Array.from(locaisMap.values()).map(({ _key, ...rest }) => rest);
        const { data: inserted } = await supabase
          .from("tse_locais_votacao")
          .upsert(batch, { onConflict: "uf,zona,secao", ignoreDuplicates: false })
          .select("id, uf, zona, secao");
        inserted?.forEach(l => {
          localIdCache[`${l.uf}_${l.zona}_${l.secao}`] = l.id;
        });
      }

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
          if (!votosError) totalVotosInserted += votosToInsert.length;
        }
      }
    }

    console.log(`[Background] Completed: ${processedRows} rows, ${totalVotosInserted} votes`);

    // Update final status
    await supabase
      .from("tse_importacoes")
      .update({
        status: "concluido",
        registros_importados: totalVotosInserted,
        total_registros: processedRows,
        updated_at: new Date().toISOString(),
      })
      .eq("ano", ano)
      .eq("uf", uf)
      .eq("tipo_arquivo", "votacao_secao");

  } catch (error) {
    console.error("[Background] Error:", error);
    
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
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ano, uf, filePath } = await req.json();

    if (!ano || !uf || !filePath) {
      throw new Error("Parâmetros 'ano', 'uf' e 'filePath' são obrigatórios");
    }

    console.log(`[TSE Process] Received request for ${uf} ${ano}: ${filePath}`);

    // Start background processing
    EdgeRuntime.waitUntil(processCSVInBackground(ano, uf, filePath));

    // Return immediately
    return new Response(
      JSON.stringify({
        success: true,
        message: `Processamento iniciado para ${uf} ${ano}. Acompanhe o progresso na tela.`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in tse-process-csv:", error);

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
