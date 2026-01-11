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
  "NR_TURNO": "turno",
  "CD_CARGO": "codigo_cargo",
  "NM_CARGO": "nome_cargo",
  "NR_PARTIDO": "numero_partido",
  "SG_PARTIDO": "sigla_partido",
  "NM_PARTIDO": "nome_partido",
  "NR_VOTAVEL": "numero_urna",
  "NM_VOTAVEL": "nome_urna",
  "QT_VOTOS": "quantidade_votos",
  "CD_MUNICIPIO": "codigo_municipio",
  "NM_MUNICIPIO": "nome_municipio",
  "NR_ZONA": "zona",
  "NR_SECAO": "secao",
  "SG_UF": "uf",
  "NM_LOCAL_VOTACAO": "local_nome",
  "DS_LOCAL_VOTACAO_ENDERECO": "endereco",
};

interface ProcessedData {
  candidatos: Map<string, any>;
  votos: any[];
  locais: Map<string, any>;
  partidos: Map<number, any>;
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

    console.log(`Processing CSV for ${uf} ${ano}: ${filePath}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
      }, {
        onConflict: "ano,uf,tipo_arquivo",
      });

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("tse-csv")
      .download(filePath);

    if (downloadError) {
      throw new Error(`Erro ao baixar arquivo: ${downloadError.message}`);
    }

    // Read file content
    const text = await fileData.text();
    const lines = text.split("\n").filter(line => line.trim());

    if (lines.length < 2) {
      throw new Error("Arquivo CSV vazio ou inválido");
    }

    console.log(`Found ${lines.length} lines in CSV`);

    // Parse header
    const headerLine = lines[0];
    const headers = parseCSVLine(headerLine);
    console.log(`Headers: ${headers.slice(0, 10).join(", ")}...`);

    // Find column indices
    const columnIndices: Record<string, number> = {};
    headers.forEach((header, index) => {
      const cleanHeader = header.replace(/^\ufeff/, "").trim().toUpperCase();
      if (COLUMN_MAPPINGS[cleanHeader]) {
        columnIndices[COLUMN_MAPPINGS[cleanHeader]] = index;
      }
    });

    console.log(`Mapped columns: ${Object.keys(columnIndices).join(", ")}`);

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

    // Get existing parties and cargos
    const { data: existingPartidos } = await supabase
      .from("tse_partidos")
      .select("id, numero");

    const { data: existingCargos } = await supabase
      .from("tse_cargos")
      .select("id, codigo_tse");

    const partidoMap: Record<number, string> = {};
    existingPartidos?.forEach(p => {
      partidoMap[p.numero] = p.id;
    });

    const cargoMap: Record<number, string> = {};
    existingCargos?.forEach(c => {
      cargoMap[c.codigo_tse] = c.id;
    });

    // Process data in memory first
    const processedData: ProcessedData = {
      candidatos: new Map(),
      votos: [],
      locais: new Map(),
      partidos: new Map(),
    };

    const BATCH_SIZE = 1000;
    let processedRows = 0;

    // Parse all data rows
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      const values = parseCSVLine(line);
      
      const getValue = (key: string) => {
        const idx = columnIndices[key];
        return idx !== undefined ? values[idx] : undefined;
      };

      const numeroPartido = parseInt(getValue("numero_partido") || "0");
      const siglaPartido = getValue("sigla_partido") || "";
      const nomePartido = getValue("nome_partido") || "";
      const numeroUrna = parseInt(getValue("numero_urna") || "0");
      const nomeUrna = getValue("nome_urna") || "";
      const quantidade = parseInt(getValue("quantidade_votos") || "0");
      const codigoMunicipio = parseInt(getValue("codigo_municipio") || "0");
      const nomeMunicipio = getValue("nome_municipio") || "";
      const zona = parseInt(getValue("zona") || "0");
      const secao = parseInt(getValue("secao") || "0");
      const codigoCargo = parseInt(getValue("codigo_cargo") || "0");

      // Skip invalid rows
      if (!numeroUrna || !nomeUrna) continue;

      // Track new parties
      if (numeroPartido && !partidoMap[numeroPartido] && !processedData.partidos.has(numeroPartido)) {
        processedData.partidos.set(numeroPartido, {
          numero: numeroPartido,
          sigla: siglaPartido,
          nome: nomePartido,
        });
      }

      // Track candidates
      const candidatoKey = `${numeroUrna}_${uf}_${codigoCargo}`;
      if (!processedData.candidatos.has(candidatoKey)) {
        processedData.candidatos.set(candidatoKey, {
          eleicao_id: eleicao.id,
          cargo_id: cargoMap[codigoCargo] || null,
          partido_id: partidoMap[numeroPartido] || null,
          numero_urna: numeroUrna,
          nome_urna: nomeUrna,
          uf,
          situacao: "candidato",
          _partido_numero: numeroPartido,
        });
      }

      // Track voting locations
      const localKey = `${uf}_${zona}_${secao}`;
      if (!processedData.locais.has(localKey)) {
        processedData.locais.set(localKey, {
          uf,
          zona,
          secao,
          codigo_municipio_tse: codigoMunicipio,
          nome_municipio: nomeMunicipio,
        });
      }

      // Add vote record
      processedData.votos.push({
        candidatoKey,
        localKey,
        quantidade,
        codigoMunicipio,
        zona,
        secao,
      });

      processedRows++;
    }

    console.log(`Parsed ${processedRows} rows`);
    console.log(`Found ${processedData.candidatos.size} candidates, ${processedData.locais.size} locations, ${processedData.votos.length} vote records`);

    // Insert new parties
    if (processedData.partidos.size > 0) {
      const newPartidos = Array.from(processedData.partidos.values());
      const { data: insertedPartidos, error: partidoError } = await supabase
        .from("tse_partidos")
        .upsert(newPartidos, { onConflict: "numero", ignoreDuplicates: true })
        .select();

      if (!partidoError && insertedPartidos) {
        insertedPartidos.forEach(p => {
          partidoMap[p.numero] = p.id;
        });
      }
    }

    // Insert candidates
    const candidatosArray = Array.from(processedData.candidatos.values()).map(c => ({
      ...c,
      partido_id: partidoMap[c._partido_numero] || c.partido_id,
    }));

    const candidatoIdMap: Record<string, string> = {};
    
    for (let i = 0; i < candidatosArray.length; i += BATCH_SIZE) {
      const batch = candidatosArray.slice(i, i + BATCH_SIZE).map(({ _partido_numero, ...rest }) => rest);
      const { data: inserted, error: candError } = await supabase
        .from("tse_candidatos")
        .upsert(batch, { 
          onConflict: "eleicao_id,numero_urna,uf",
          ignoreDuplicates: false,
        })
        .select("id, numero_urna, uf");

      if (candError) {
        console.error("Error inserting candidates batch:", candError);
      } else if (inserted) {
        inserted.forEach(c => {
          const key = `${c.numero_urna}_${c.uf}_${candidatosArray.find(ca => ca.numero_urna === c.numero_urna)?.cargo_id || ""}`;
          candidatoIdMap[`${c.numero_urna}_${c.uf}`] = c.id;
        });
      }
    }

    console.log(`Inserted ${Object.keys(candidatoIdMap).length} candidates`);

    // Insert voting locations
    const locaisArray = Array.from(processedData.locais.values());
    const localIdMap: Record<string, string> = {};

    for (let i = 0; i < locaisArray.length; i += BATCH_SIZE) {
      const batch = locaisArray.slice(i, i + BATCH_SIZE);
      const { data: inserted, error: localError } = await supabase
        .from("tse_locais_votacao")
        .upsert(batch, { 
          onConflict: "uf,zona,secao",
          ignoreDuplicates: false,
        })
        .select("id, uf, zona, secao");

      if (localError) {
        console.error("Error inserting locations batch:", localError);
      } else if (inserted) {
        inserted.forEach(l => {
          localIdMap[`${l.uf}_${l.zona}_${l.secao}`] = l.id;
        });
      }
    }

    console.log(`Inserted ${Object.keys(localIdMap).length} locations`);

    // Insert votes in batches
    let totalVotosInserted = 0;
    
    for (let i = 0; i < processedData.votos.length; i += BATCH_SIZE) {
      const batch = processedData.votos.slice(i, i + BATCH_SIZE).map(v => {
        const candidatoId = Object.entries(candidatoIdMap).find(([key]) => 
          key.startsWith(`${v.candidatoKey.split("_")[0]}_${uf}`)
        )?.[1];
        
        return {
          eleicao_id: eleicao.id,
          candidato_id: candidatoId || null,
          local_id: localIdMap[v.localKey] || null,
          uf,
          codigo_municipio_tse: v.codigoMunicipio,
          zona: v.zona,
          secao: v.secao,
          quantidade: v.quantidade,
        };
      }).filter(v => v.candidato_id);

      if (batch.length > 0) {
        const { error: votosError } = await supabase
          .from("tse_votos")
          .insert(batch);

        if (votosError) {
          console.error("Error inserting votes batch:", votosError);
        } else {
          totalVotosInserted += batch.length;
        }
      }

      // Update progress
      const progress = Math.round((i / processedData.votos.length) * 100);
      await supabase
        .from("tse_importacoes")
        .update({
          registros_importados: totalVotosInserted,
          current_batch: Math.floor(i / BATCH_SIZE),
        })
        .eq("ano", ano)
        .eq("uf", uf)
        .eq("tipo_arquivo", "votacao_secao");
    }

    console.log(`Inserted ${totalVotosInserted} vote records`);

    // Update final status
    await supabase
      .from("tse_importacoes")
      .update({
        status: "concluido",
        registros_importados: totalVotosInserted,
        total_registros: processedData.votos.length,
        updated_at: new Date().toISOString(),
      })
      .eq("ano", ano)
      .eq("uf", uf)
      .eq("tipo_arquivo", "votacao_secao");

    return new Response(
      JSON.stringify({
        success: true,
        message: `Importação concluída para ${uf} ${ano}`,
        stats: {
          candidatos: processedData.candidatos.size,
          locais: processedData.locais.size,
          votos: totalVotosInserted,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in tse-process-csv:", error);
    
    // Try to update import status to error
    try {
      const { ano, uf } = await req.clone().json();
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      await supabase
        .from("tse_importacoes")
        .update({
          status: "erro",
          erro_mensagem: error instanceof Error ? error.message : "Erro desconhecido",
        })
        .eq("ano", ano)
        .eq("uf", uf)
        .eq("tipo_arquivo", "votacao_secao");
    } catch (e) {
      console.error("Failed to update error status:", e);
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
