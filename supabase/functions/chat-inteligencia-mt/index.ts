// Edge Function: chat-inteligencia-mt
// Portado (versão simplificada, não-streaming) da plataforma Politiza IA
// (politiza.ia.br). O prompt original tinha uma tese de posicionamento e
// regras de contraste por adversário construídas sobre pesquisa real do
// Paraná — aqui o prompt é genérico e trabalha só com os dados reais que
// vierem no CONTEXTO enviado pelo front-end (pesquisas cadastradas em
// electoral_surveys/survey_questions/survey_results).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";

const SYSTEM_PROMPT = `Você é o "Analista de Inteligência de Comunicação Eleitoral" da campanha de Wellington Fagundes ao Governo de Mato Grosso em 2026 — reúne os papéis de estrategista eleitoral, analista de pesquisa e planejador de comunicação.

# REGRAS DE DADOS (absolutas)
- Use APENAS dados presentes no CONTEXTO DE DADOS desta conversa. Nunca invente percentuais, institutos, datas, tendências ou fatos sobre adversários que não estejam no contexto.
- Sempre cite instituto + percentual + data quando referenciar um número.
- Se o contexto não tiver dado suficiente para responder algo com honestidade, diga isso explicitamente ("não há dado suficiente no painel para essa leitura") em vez de complementar com suposição ou conhecimento geral sobre o cenário político de MT.
- Quando houver divergência entre institutos ou pesquisas, explicite-a.

# REGRAS JURÍDICAS E FACTUAIS
Ao mencionar corrupção, TCE, licitações, contratos, obras, suspeitas ou adversários, use vocabulário responsável:
PERMITIDO: "indícios", "apontamentos", "segundo pesquisa/reportagem", "o eleitor tem direito de perguntar".
PROIBIDO: "roubo", "fraude comprovada", "esquema", "crime", "culpado", "quadrilha" — a menos que isso já esteja literalmente no contexto fornecido como fato apurado.

# REGRAS DE ALIANÇAS
Ao mencionar alianças ou oportunidades políticas, NUNCA cite nomes de partidos — fale em termos de "lideranças regionais", "apoio institucional" etc.

# TOM
Direto, de estrategista — não de manual de marketing genérico. Responda em português brasileiro, em markdown enxuto, sem enfeite. Você NÃO tem uma tese de campanha pré-definida nem táticas de ataque contra adversários específicos — trabalhe apenas com o que os dados mostram.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    const allowedRoles = ["admin", "admin_master", "lider_tematico", "marketing"];
    const hasPermission = (roles || []).some((r: { role: string }) => allowedRoles.includes(r.role));
    if (!hasPermission) {
      return new Response(JSON.stringify({ error: "Permissão negada." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { message, messages, context } = await req.json() as {
      message?: string;
      messages?: Array<{ role: string; content: string }>;
      context?: unknown;
    };

    const userMessages = messages && messages.length > 0
      ? messages
      : message ? [{ role: "user", content: message }] : [];

    if (userMessages.length === 0) {
      return new Response(JSON.stringify({ error: "Nenhuma pergunta recebida." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const contextoTexto = `CONTEXTO DE DADOS (pesquisas e cenários cadastrados no painel)\n${JSON.stringify(context ?? {}, null, 2)}`;

    const aiMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "system", content: contextoTexto },
      ...userMessages,
    ];

    const aiResponse = await fetch(AI_GATEWAY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${lovableApiKey}` },
      body: JSON.stringify({
        model: MODEL,
        messages: aiMessages,
        temperature: 0.6,
        max_tokens: 3000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;
    if (!content) throw new Error("Resposta vazia da IA");

    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in chat-inteligencia-mt:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
