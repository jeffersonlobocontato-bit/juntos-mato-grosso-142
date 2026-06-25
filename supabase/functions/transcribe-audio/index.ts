// Public edge function: receive an audio file (multipart/form-data 'file')
// and forward to Lovable AI Gateway transcription endpoint with streaming SSE.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return new Response(JSON.stringify({ error: "Expected multipart/form-data" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return new Response(JSON.stringify({ error: "Missing 'file' field" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (file.size === 0) {
    return new Response(JSON.stringify({ error: "Empty audio file" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (file.size > MAX_BYTES) {
    return new Response(JSON.stringify({ error: "Audio file exceeds 10 MB" }), {
      status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const ext = (() => {
    const t = (file.type || "").split(";")[0];
    if (t === "audio/wav" || t === "audio/wave" || t === "audio/x-wav") return "wav";
    if (t === "audio/mpeg" || t === "audio/mp3") return "mp3";
    if (t === "audio/mp4" || t === "audio/x-m4a") return "m4a";
    if (t === "audio/webm") return "webm";
    if (t === "audio/ogg") return "ogg";
    return "wav";
  })();

  const upstream = new FormData();
  upstream.append("model", "openai/gpt-4o-mini-transcribe");
  upstream.append("file", file, `recording.${ext}`);
  upstream.append("stream", "true");

  const r = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: upstream,
  });

  if (!r.ok) {
    const txt = await r.text().catch(() => "");
    let msg = `Transcription failed (${r.status})`;
    if (r.status === 402) msg = "Créditos de IA esgotados. Adicione créditos no workspace.";
    else if (r.status === 429) msg = "Muitas requisições. Tente novamente em instantes.";
    else if (r.status === 403) msg = "Lovable AI desativado para este workspace.";
    return new Response(JSON.stringify({ error: msg, detail: txt }), {
      status: r.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(r.body, {
    headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
  });
});