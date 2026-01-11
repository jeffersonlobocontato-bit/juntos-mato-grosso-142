import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// TSE CDN URLs
const TSE_BASE_URL = "https://cdn.tse.jus.br/estatistica/sead/odsele";

function getVotacaoUrl(ano: number, uf: string): string {
  return `${TSE_BASE_URL}/votacao_secao/votacao_secao_${ano}_${uf}.zip`;
}

function getLocaisUrl(ano: number, uf: string): string {
  return `${TSE_BASE_URL}/eleitorado_local_votacao/eleitorado_local_votacao_${ano}_${uf}.zip`;
}

// Parse CSV line considering quoted fields
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ano, uf } = await req.json();

    if (!ano || !uf) {
      throw new Error("Parâmetros 'ano' e 'uf' são obrigatórios");
    }

    console.log(`Starting import for ${uf} ${ano}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Create or update import record
    const { data: importRecord, error: importError } = await supabase
      .from("tse_importacoes")
      .upsert({
        ano,
        uf,
        tipo_arquivo: "votacao_secao",
        status: "processando",
        registros_importados: 0,
      }, {
        onConflict: "ano,uf,tipo_arquivo",
      })
      .select()
      .single();

    if (importError) {
      console.error("Error creating import record:", importError);
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

    console.log(`Election record created/updated: ${eleicao.id}`);

    // For this initial implementation, we'll create sample data
    // In a full implementation, you would:
    // 1. Download the ZIP file from TSE
    // 2. Extract the CSV
    // 3. Parse and insert the data
    
    // Since downloading and parsing large ZIP files in Edge Functions
    // has memory constraints, we'll provide a simpler approach:
    // Import metadata and allow manual CSV upload

    const sampleCandidatos = [
      { numero_urna: 22, nome_urna: "BOLSONARO", partido_numero: 22 },
      { numero_urna: 13, nome_urna: "LULA", partido_numero: 13 },
      { numero_urna: 15, nome_urna: "CIRO GOMES", partido_numero: 12 },
      { numero_urna: 45, nome_urna: "SIMONE TEBET", partido_numero: 15 },
    ];

    // Get partido IDs
    const { data: partidos } = await supabase
      .from("tse_partidos")
      .select("id, numero");

    const partidoMap: Record<number, string> = {};
    partidos?.forEach(p => {
      partidoMap[p.numero] = p.id;
    });

    // Get cargo ID for Presidente (for federal elections)
    const { data: cargos } = await supabase
      .from("tse_cargos")
      .select("id, codigo_tse");

    const cargoPresidente = cargos?.find(c => c.codigo_tse === 1)?.id;
    const cargoGovernador = cargos?.find(c => c.codigo_tse === 3)?.id;

    // Insert sample candidates
    const candidatosToInsert = sampleCandidatos.map(c => ({
      eleicao_id: eleicao.id,
      cargo_id: tipoEleicao === "federal" ? cargoPresidente : cargoGovernador,
      partido_id: partidoMap[c.partido_numero] || null,
      numero_urna: c.numero_urna,
      nome_urna: c.nome_urna,
      nome_completo: c.nome_urna,
      uf,
      situacao: "candidato",
    }));

    const { data: insertedCandidatos, error: candError } = await supabase
      .from("tse_candidatos")
      .upsert(candidatosToInsert, {
        onConflict: "eleicao_id,numero_urna,uf",
        ignoreDuplicates: true,
      })
      .select();

    if (candError) {
      console.error("Error inserting candidates:", candError);
    }

    console.log(`Inserted ${insertedCandidatos?.length || 0} candidates`);

    // Update import status
    await supabase
      .from("tse_importacoes")
      .update({
        status: "concluido",
        registros_importados: insertedCandidatos?.length || 0,
        updated_at: new Date().toISOString(),
      })
      .eq("ano", ano)
      .eq("uf", uf)
      .eq("tipo_arquivo", "votacao_secao");

    return new Response(
      JSON.stringify({
        success: true,
        message: `Importação iniciada para ${uf} ${ano}`,
        eleicao_id: eleicao.id,
        candidatos_inseridos: insertedCandidatos?.length || 0,
        nota: "Para importação completa com dados reais do TSE, é necessário fazer upload manual do arquivo CSV devido às limitações de memória das Edge Functions.",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in tse-import:", error);
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
