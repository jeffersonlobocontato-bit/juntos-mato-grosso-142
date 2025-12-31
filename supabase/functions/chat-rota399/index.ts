import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation constants
const MAX_MESSAGE_LENGTH = 2000;
const MAX_MESSAGES_COUNT = 50;
const MAX_NAME_LENGTH = 100;
const MAX_CITY_LENGTH = 100;

// Sanitize string input - remove potential dangerous characters
const sanitizeInput = (input: string | undefined, maxLength: number): string => {
  if (!input || typeof input !== "string") return "";
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/[<>]/g, ""); // Remove potential HTML tags
};

// Validate messages array
const validateMessages = (messages: unknown): { role: string; content: string }[] | null => {
  if (!Array.isArray(messages)) return null;
  if (messages.length > MAX_MESSAGES_COUNT) return null;
  
  const validatedMessages: { role: string; content: string }[] = [];
  
  for (const msg of messages) {
    if (typeof msg !== "object" || msg === null) return null;
    const { role, content } = msg as { role?: unknown; content?: unknown };
    
    if (typeof role !== "string" || !["user", "assistant"].includes(role)) return null;
    if (typeof content !== "string") return null;
    if (content.length > MAX_MESSAGE_LENGTH) return null;
    
    validatedMessages.push({
      role: role as "user" | "assistant",
      content: sanitizeInput(content, MAX_MESSAGE_LENGTH),
    });
  }
  
  return validatedMessages;
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
    // Parse and validate request body
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      console.error("Invalid JSON in request body");
      return new Response(JSON.stringify({ error: "Requisição inválida" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (typeof body !== "object" || body === null) {
      console.error("Request body is not an object");
      return new Response(JSON.stringify({ error: "Requisição inválida" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages, userName, userCity } = body as {
      messages?: unknown;
      userName?: unknown;
      userCity?: unknown;
    };

    // Validate messages
    const validatedMessages = validateMessages(messages);
    if (!validatedMessages) {
      console.error("Invalid messages format or content");
      return new Response(JSON.stringify({ error: "Formato de mensagens inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (validatedMessages.length === 0) {
      console.error("No messages provided");
      return new Response(JSON.stringify({ error: "Nenhuma mensagem fornecida" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Sanitize user data
    const sanitizedUserName = sanitizeInput(userName as string, MAX_NAME_LENGTH) || "Cidadão";
    const sanitizedUserCity = sanitizeInput(userCity as string, MAX_CITY_LENGTH) || "Paraná";

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(JSON.stringify({ error: "Serviço temporariamente indisponível" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = SYSTEM_PROMPT
      .replace("{{userName}}", sanitizedUserName)
      .replace("{{userCity}}", sanitizedUserCity);

    console.log(`Processing chat request: ${validatedMessages.length} messages, user: ${sanitizedUserName}, city: ${sanitizedUserCity}`);

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
          ...validatedMessages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.warn("Rate limit exceeded");
        return new Response(JSON.stringify({ error: "Muitas requisições. Tente novamente em alguns segundos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        console.warn("Payment required - quota exceeded");
        return new Response(JSON.stringify({ error: "Limite de uso atingido." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Log error but don't expose details to client
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "Erro ao processar sua mensagem. Tente novamente." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("Chat error:", e);
    // Generic error message - don't expose internal details
    return new Response(JSON.stringify({ error: "Erro interno do servidor. Tente novamente." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
