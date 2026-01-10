import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { agent_id, messages } = await req.json();

    if (!agent_id) {
      return new Response(
        JSON.stringify({ error: "agent_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch agent configuration
    const { data: agent, error: agentError } = await supabase
      .from("ai_agent_config")
      .select("*")
      .eq("id", agent_id)
      .eq("is_active", true)
      .single();

    if (agentError || !agent) {
      console.error("Agent not found:", agentError);
      return new Response(
        JSON.stringify({ error: "Agent not found or inactive" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch linked documents for context
    const { data: linkedDocs } = await supabase
      .from("ai_agent_documents")
      .select("document_id")
      .eq("agent_id", agent_id);

    let knowledgeContext = "";

    if (linkedDocs && linkedDocs.length > 0) {
      const docIds = linkedDocs.map((d) => d.document_id);
      
      const { data: documents } = await supabase
        .from("ai_documents")
        .select("title, content, doc_category")
        .in("id", docIds)
        .eq("is_active", true);

      if (documents && documents.length > 0) {
        knowledgeContext = "\n\n--- BASE DE CONHECIMENTO ---\n" +
          documents.map((doc) => 
            `### ${doc.title} (${doc.doc_category})\n${doc.content}`
          ).join("\n\n");
      }
    }

    // Build system prompt
    const systemPrompt = `${agent.system_prompt}${knowledgeContext}

INSTRUÇÕES ADICIONAIS:
- Responda sempre em português brasileiro
- Seja claro, objetivo e profissional
- Use a base de conhecimento fornecida quando relevante
- Se não souber algo, admita em vez de inventar`;

    // Call Lovable AI Gateway
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.map((m: { role: string; content: string }) => ({
            role: m.role,
            content: m.content,
          })),
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("ai-hub-chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
