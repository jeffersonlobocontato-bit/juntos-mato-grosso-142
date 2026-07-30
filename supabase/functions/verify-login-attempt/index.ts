import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Score mínimo aceito do reCAPTCHA v3 (0 = bot certo, 1 = humano certo).
const MIN_RECAPTCHA_SCORE = 0.5;

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const recaptcha_token = typeof body?.recaptcha_token === "string" ? body.recaptcha_token : null;

    // IP real do visitante (Supabase Edge Functions rodam atrás de proxy Cloudflare/Deno Deploy)
    const ip =
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      "unknown";

    const ipSalt = Deno.env.get("IP_HASH_SALT") ?? "juntosparana399";
    const ipHash = await sha256Hex(`${ipSalt}:${ip}`);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1) Limite por IP/tempo — independe do resultado do captcha, corta força bruta em massa.
    const { data: allowedByRate, error: rateError } = await supabaseAdmin.rpc(
      "check_login_rate_limit",
      { p_ip_hash: ipHash, p_max_attempts: 8, p_window_minutes: 10 }
    );

    if (rateError) {
      console.error("rate limit check failed", rateError);
      return new Response(JSON.stringify({ allowed: false, reason: "server_error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!allowedByRate) {
      return new Response(JSON.stringify({ allowed: false, reason: "rate_limited" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2) Verificação do token reCAPTCHA v3 direto com o Google.
    // Se o captcha ainda não estiver configurado (sem site key no cliente ou sem secret),
    // seguimos apenas com o rate limit por IP — nunca travamos o login legítimo.
    const secretKey = Deno.env.get("RECAPTCHA_SECRET_KEY");
    if (!secretKey || !recaptcha_token) {
      return new Response(JSON.stringify({ allowed: true, reason: "rate_limit_only" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const verifyResp = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret: secretKey, response: recaptcha_token, remoteip: ip }),
    });
    const verifyData = await verifyResp.json();

    if (!verifyData.success || (verifyData.score ?? 0) < MIN_RECAPTCHA_SCORE) {
      return new Response(
        JSON.stringify({ allowed: false, reason: "recaptcha_failed", score: verifyData.score ?? null }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ allowed: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("verify-login-attempt error", err);
    return new Response(JSON.stringify({ allowed: false, reason: "server_error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
