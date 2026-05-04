import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

    const { sugestao_id, descricao, tema_ids } = await req.json();

    if (!sugestao_id || !descricao || !tema_ids?.length) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch tema names with eixo info
    const { data: temasData, error: temasError } = await supabase
      .from("temas")
      .select("id, nome, eixo_id")
      .in("id", tema_ids);

    if (temasError || !temasData?.length) {
      console.error("Error fetching temas:", temasError);
      return new Response(JSON.stringify({ error: "Failed to fetch temas" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const eixoIds = [...new Set(temasData.map(t => t.eixo_id))];
    const { data: eixosData } = await supabase
      .from("eixos_tematicos")
      .select("id, nome")
      .in("id", eixoIds);

    const eixoMap = new Map((eixosData || []).map(e => [e.id, e.nome]));

    const temasInfo = temasData.map(t => ({
      id: t.id,
      nome: t.nome,
      eixo_nome: eixoMap.get(t.eixo_id) || "Desconhecido",
    }));

    const temasListText = temasInfo.map(t => `- "${t.nome}" (Eixo: ${t.eixo_nome})`).join("\n");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `Você é um analista de políticas públicas. Sua tarefa é analisar o texto de uma sugestão popular e organizar semanticamente as menções relevantes para cada tema selecionado pelo cidadão.

Para cada tema, você deve:
1. Extrair trechos do texto que são relevantes ao tema
2. Criar um resumo curto (1-2 frases) do que o cidadão sugere sobre aquele tema
3. Se o texto não mencionar nada relevante para um tema, retorne trechos vazio e resumo indicando que não há menção direta

Responda EXCLUSIVAMENTE com o JSON no formato da tool call.`;

    const userPrompt = `TEXTO DA SUGESTÃO:
"${descricao}"

TEMAS SELECIONADOS:
${temasListText}

Analise o texto e organize as menções por tema.`;

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
              name: "organize_analise",
              description: "Organiza a análise semântica da sugestão por tema",
              parameters: {
                type: "object",
                properties: {
                  analise: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        tema_id: { type: "string", description: "UUID do tema" },
                        tema_nome: { type: "string" },
                        eixo_nome: { type: "string" },
                        trechos: { type: "array", items: { type: "string" }, description: "Trechos do texto relevantes ao tema" },
                        resumo: { type: "string", description: "Resumo de 1-2 frases" },
                      },
                      required: ["tema_id", "tema_nome", "eixo_nome", "trechos", "resumo"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["analise"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "organize_analise" } },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      return new Response(JSON.stringify({ error: "AI analysis failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    
    let analiseData = null;
    if (toolCall?.function?.arguments) {
      try {
        analiseData = JSON.parse(toolCall.function.arguments);
      } catch (e) {
        console.error("Failed to parse AI response:", e);
      }
    }

    if (analiseData) {
      const { error: updateError } = await supabase
        .from("sugestoes_populares")
        .update({ analise_semantica: analiseData })
        .eq("id", sugestao_id);

      if (updateError) {
        console.error("Error updating sugestao:", updateError);
      }
    }

    return new Response(JSON.stringify({ success: true, analise: analiseData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-suggestion error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
