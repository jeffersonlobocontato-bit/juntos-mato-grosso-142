import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const EIXOS = [
  "Desenvolvimento Social",
  "Desenvolvimento Econômico Sustentável",
  "Desenvolvimento das Cidades e Infraestrutura",
  "Gestão Pública Eficiente",
  "Segurança, Justiça, Combate à Corrupção",
  "Não classificado",
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const sugestao_id = body?.sugestao_id;
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (typeof sugestao_id !== "string" || !UUID_RE.test(sugestao_id)) {
      return new Response(JSON.stringify({ error: "Invalid sugestao_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Only classify a freshly created, not-yet-classified suggestion, and always
    // use the stored text (never client-supplied content).
    const { data: sugestao } = await supabase
      .from("sugestoes_populares")
      .select("id, descricao, created_at, analise_semantica")
      .eq("id", sugestao_id)
      .maybeSingle();

    if (!sugestao) {
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ageMs = Date.now() - new Date(sugestao.created_at as string).getTime();
    const alreadyClassified =
      sugestao.analise_semantica &&
      typeof sugestao.analise_semantica === "object" &&
      (sugestao.analise_semantica as Record<string, unknown>).eixo_classificacao;

    if (ageMs > 10 * 60 * 1000 || alreadyClassified) {
      return new Response(JSON.stringify({ error: "Classification not available for this record" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const descricao = String(sugestao.descricao ?? "").slice(0, 4000);
    if (!descricao.trim()) {
      return new Response(JSON.stringify({ error: "Empty suggestion" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `Você é um classificador semântico de sugestões populares para um plano de governo do Paraná. Sua tarefa é ler o texto da sugestão e identificar qual é o EIXO TEMÁTICO principal abordado.

Os 5 eixos disponíveis e seus escopos:
- "Desenvolvimento Social": saúde, educação, assistência social, cultura, esporte, juventude, idoso, mulher, igualdade.
- "Desenvolvimento Econômico Sustentável": emprego, renda, agricultura, indústria, comércio, turismo, ciência, tecnologia, inovação, meio ambiente, energia.
- "Desenvolvimento das Cidades e Infraestrutura": mobilidade, transporte, estradas, saneamento, habitação, urbanismo, obras, logística.
- "Gestão Pública Eficiente": modernização, transparência, servidores, tecnologia da informação pública, planejamento, finanças do estado.
- "Segurança, Justiça, Combate à Corrupção": segurança pública, polícia, sistema prisional, justiça, anticorrupção, defesa civil.

Regras:
1. Escolha APENAS UM eixo, o predominante.
2. Se o texto for vago, genérico, sem contexto temático claro (ex.: "tudo bem", "boa tarde", "quero ajudar"), retorne "Não classificado".
3. Responda EXCLUSIVAMENTE via a tool call.`;

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
          { role: "user", content: `SUGESTÃO:\n"${descricao}"\n\nClassifique o eixo principal.` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "classify_eixo",
              description: "Classifica a sugestão em um eixo temático principal",
              parameters: {
                type: "object",
                properties: {
                  eixo: { type: "string", enum: EIXOS },
                  confianca: { type: "number", description: "0 a 1" },
                  justificativa: { type: "string", description: "1 frase explicando a escolha" },
                },
                required: ["eixo", "confianca", "justificativa"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "classify_eixo" } },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      const status = response.status === 429 || response.status === 402 ? response.status : 500;
      return new Response(JSON.stringify({ error: "AI failed", status: response.status }), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    let parsed: { eixo: string; confianca: number; justificativa: string } | null = null;
    if (toolCall?.function?.arguments) {
      try { parsed = JSON.parse(toolCall.function.arguments); } catch (e) { console.error(e); }
    }
    if (!parsed || !EIXOS.includes(parsed.eixo)) {
      parsed = { eixo: "Não classificado", confianca: 0, justificativa: "Resposta inválida da IA" };
    }

    // Preserve any existing analise_semantica content and append eixo_classificacao
    const { data: existing } = await supabase
      .from("sugestoes_populares")
      .select("analise_semantica")
      .eq("id", sugestao_id)
      .maybeSingle();

    const mergedAnalise = {
      ...(existing?.analise_semantica && typeof existing.analise_semantica === "object" ? existing.analise_semantica : {}),
      eixo_classificacao: {
        eixo: parsed.eixo,
        confianca: parsed.confianca,
        justificativa: parsed.justificativa,
        classified_at: new Date().toISOString(),
      },
    };

    const { error: updateError } = await supabase
      .from("sugestoes_populares")
      .update({ eixo: parsed.eixo, analise_semantica: mergedAnalise })
      .eq("id", sugestao_id);

    if (updateError) {
      console.error("Update error:", updateError);
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, ...parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("classify-suggestion-eixo error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});