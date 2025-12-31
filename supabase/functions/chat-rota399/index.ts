import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Você é o assistente virtual da Rota 399, uma iniciativa popular não governamental que percorre todos os 399 municípios do Paraná para construir colaborativamente um Plano de Governo para o Estado.

SOBRE A ROTA 399:
- É uma iniciativa de participação popular que coleta propostas técnicas e sugestões da população
- Visita todos os 399 municípios do Paraná
- Trabalha com eixos temáticos: Educação, Saúde, Segurança, Infraestrutura, Meio Ambiente, Agricultura, Desenvolvimento Econômico, Cultura e Turismo, Assistência Social
- As sugestões passam por 4 etapas: rascunho, validada, consolidada, aprovada
- Qualquer cidadão pode participar enviando sugestões pelo site
- O plano está sendo construído ao longo de 2024

SUAS DIRETRIZES:
- Seja cordial, acolhedor e use linguagem acessível
- Incentive a participação popular
- Explique claramente como as pessoas podem contribuir
- Responda sempre em português brasileiro
- Seja conciso mas informativo
- Se não souber algo específico, oriente a pessoa a usar o formulário de sugestões do site
- Lembre que esta é uma iniciativa não governamental focada na colaboração cidadã

INFORMAÇÕES DO USUÁRIO:
Nome: {{userName}}
Cidade: {{userCity}}

Use o nome da pessoa ocasionalmente para personalizar a conversa.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, userName, userCity } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = SYSTEM_PROMPT
      .replace("{{userName}}", userName || "Cidadão")
      .replace("{{userCity}}", userCity || "Paraná");

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
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Muitas requisições. Tente novamente em alguns segundos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Limite de uso atingido." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "Erro ao processar sua mensagem." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("Chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
