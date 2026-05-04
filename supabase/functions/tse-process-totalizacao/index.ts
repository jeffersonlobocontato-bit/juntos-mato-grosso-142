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

// Column mappings for totalization files
const COLUMN_MAPPINGS: Record<string, string> = {
  "ANO_ELEICAO": "ano",
  "NR_TURNO": "turno",
  "SG_UF": "uf",
  "CD_MUNICIPIO": "codigo_municipio",
  "NM_MUNICIPIO": "nome_municipio",
  "NR_ZONA": "zona",
  "CD_CARGO": "codigo_cargo",
  "DS_CARGO": "descricao_cargo",
  "NR_CANDIDATO": "numero_candidato",
  "NM_CANDIDATO": "nome_candidato",
  "NM_URNA_CANDIDATO": "nome_urna",
  "SG_PARTIDO": "sigla_partido",
  "NR_PARTIDO": "numero_partido",
  "CD_SITUACAO_TOTALIZACAO": "cod_situacao",
  "DS_SITUACAO_TOTALIZACAO": "situacao_totalizacao",
  "QT_VOTOS": "qt_votos",
  "QT_APTOS": "qt_aptos",
  "QT_COMPARECIMENTO": "qt_comparecimento",
  "QT_ABSTENCOES": "qt_abstencoes",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const authClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: u } = await authClient.auth.getUser();
    if (!u?.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const { data: roles } = await authClient.from("user_roles").select("role").eq("user_id", u.user.id);
    const allowed = (roles || []).some((r: any) => ["admin", "admin_master"].includes(r.role));
    if (!allowed) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { ano, uf, filePath } = await req.json();

    if (!ano || !uf || !filePath) {
      throw new Error("Parâmetros 'ano', 'uf' e 'filePath' são obrigatórios");
    }

    console.log(`[Totalizacao] Processing CSV for ${uf} ${ano}: ${filePath}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Update import status
    await supabase
      .from("tse_importacoes")
      .upsert({
        ano,
        uf,
        tipo_arquivo: "totalizacao",
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

    console.log(`[Totalizacao] Found ${lines.length} lines in CSV`);

    // Parse header
    const headerLine = lines[0];
    const headers = parseCSVLine(headerLine);
    console.log(`[Totalizacao] Headers: ${headers.slice(0, 10).join(", ")}...`);

    // Find column indices
    const columnIndices: Record<string, number> = {};
    headers.forEach((header, index) => {
      const cleanHeader = header.replace(/^\ufeff/, "").trim().toUpperCase();
      if (COLUMN_MAPPINGS[cleanHeader]) {
        columnIndices[COLUMN_MAPPINGS[cleanHeader]] = index;
      }
    });

    console.log(`[Totalizacao] Mapped columns: ${Object.keys(columnIndices).join(", ")}`);

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

    // Process data
    const BATCH_SIZE = 1000;
    let totalProcessed = 0;
    let totalInserted = 0;
    const newPartidos: Map<number, any> = new Map();
    const resultados: any[] = [];

    // Parse all data rows
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      const values = parseCSVLine(line);
      
      const getValue = (key: string) => {
        const idx = columnIndices[key];
        return idx !== undefined ? values[idx] : undefined;
      };

      const turno = parseInt(getValue("turno") || "1");
      const codigoMunicipio = parseInt(getValue("codigo_municipio") || "0");
      const nomeMunicipio = getValue("nome_municipio") || "";
      const zona = parseInt(getValue("zona") || "0");
      const codigoCargo = parseInt(getValue("codigo_cargo") || "0");
      const numeroCandidato = parseInt(getValue("numero_candidato") || "0");
      const nomeCandidato = getValue("nome_candidato") || "";
      const nomeUrna = getValue("nome_urna") || "";
      const siglaPartido = getValue("sigla_partido") || "";
      const numeroPartido = parseInt(getValue("numero_partido") || "0");
      const situacaoTotalizacao = getValue("situacao_totalizacao") || "";
      const qtVotos = parseInt(getValue("qt_votos") || "0");
      const qtAptos = parseInt(getValue("qt_aptos") || "0") || null;
      const qtComparecimento = parseInt(getValue("qt_comparecimento") || "0") || null;
      const qtAbstencoes = parseInt(getValue("qt_abstencoes") || "0") || null;

      // Skip invalid rows
      if (!numeroCandidato) continue;

      // Track new parties
      if (numeroPartido && !partidoMap[numeroPartido] && !newPartidos.has(numeroPartido)) {
        newPartidos.set(numeroPartido, {
          numero: numeroPartido,
          sigla: siglaPartido,
        });
      }

      // Add result record
      resultados.push({
        eleicao_id: eleicao.id,
        turno,
        uf,
        codigo_municipio_tse: codigoMunicipio,
        nome_municipio: nomeMunicipio,
        zona,
        cargo_id: cargoMap[codigoCargo] || null,
        numero_candidato: numeroCandidato,
        nome_candidato: nomeCandidato,
        nome_urna: nomeUrna,
        partido_id: partidoMap[numeroPartido] || null,
        sigla_partido: siglaPartido,
        situacao_totalizacao: situacaoTotalizacao,
        qt_votos: qtVotos,
        qt_aptos: qtAptos,
        qt_comparecimento: qtComparecimento,
        qt_abstencoes: qtAbstencoes,
        _partido_numero: numeroPartido,
      });

      totalProcessed++;
    }

    console.log(`[Totalizacao] Parsed ${totalProcessed} rows, ${resultados.length} results`);

    // Insert new parties
    if (newPartidos.size > 0) {
      const partidos = Array.from(newPartidos.values());
      const { data: insertedPartidos, error: partidoError } = await supabase
        .from("tse_partidos")
        .upsert(partidos, { onConflict: "numero", ignoreDuplicates: true })
        .select();

      if (!partidoError && insertedPartidos) {
        insertedPartidos.forEach(p => {
          partidoMap[p.numero] = p.id;
        });
        console.log(`[Totalizacao] Inserted ${insertedPartidos.length} new parties`);
      }
    }

    // Update partido_id in results
    resultados.forEach(r => {
      if (r._partido_numero && partidoMap[r._partido_numero]) {
        r.partido_id = partidoMap[r._partido_numero];
      }
      delete r._partido_numero;
    });

    // Insert results in batches
    for (let i = 0; i < resultados.length; i += BATCH_SIZE) {
      const batch = resultados.slice(i, i + BATCH_SIZE);
      
      const { error: insertError } = await supabase
        .from("tse_resultados_totalizacao")
        .upsert(batch, { 
          onConflict: "eleicao_id,turno,uf,codigo_municipio_tse,zona,numero_candidato",
          ignoreDuplicates: false,
        });

      if (insertError) {
        console.error(`[Totalizacao] Error inserting batch ${i}:`, insertError);
      } else {
        totalInserted += batch.length;
      }

      // Update progress
      await supabase
        .from("tse_importacoes")
        .update({
          registros_importados: totalInserted,
          current_batch: Math.floor(i / BATCH_SIZE),
        })
        .eq("ano", ano)
        .eq("uf", uf)
        .eq("tipo_arquivo", "totalizacao");
    }

    console.log(`[Totalizacao] Inserted ${totalInserted} result records`);

    // Update final status
    await supabase
      .from("tse_importacoes")
      .update({
        status: "concluido",
        registros_importados: totalInserted,
        total_registros: resultados.length,
        updated_at: new Date().toISOString(),
      })
      .eq("ano", ano)
      .eq("uf", uf)
      .eq("tipo_arquivo", "totalizacao");

    return new Response(
      JSON.stringify({
        success: true,
        message: `Importação de totalização concluída para ${uf} ${ano}`,
        stats: {
          partidos: newPartidos.size,
          resultados: totalInserted,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("[Totalizacao] Error:", error);
    
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
        .eq("tipo_arquivo", "totalizacao");
    } catch (e) {
      console.error("[Totalizacao] Failed to update error status:", e);
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
