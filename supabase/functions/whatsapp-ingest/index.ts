import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-ingest-token",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const INGEST_TOKEN = Deno.env.get("WHATSAPP_INGEST_TOKEN") ?? "";

const EIXOS = [
  "Desenvolvimento Social",
  "Desenvolvimento Econômico Sustentável",
  "Desenvolvimento das Cidades e Infraestrutura",
  "Gestão Pública Eficiente",
  "Segurança, Justiça, Combate à Corrupção",
];

function normalizeText(v: string) {
  return v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function normalizePhone(raw: string) {
  const digits = String(raw).replace(/\D/g, "");
  if (digits.length < 10) return null;
  if (digits.startsWith("55")) return `+${digits}`;
  return `+55${digits}`;
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// Admin-only helper: returns the integration token so the admin screen can show it.
async function handleConfig(req: Request) {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Não autenticado" }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData?.user) return json({ error: "Não autenticado" }, 401);

  const { data: isAdmin } = await admin.rpc("is_admin", { _user_id: userData.user.id });
  if (!isAdmin) return json({ error: "Acesso negado" }, 403);

  return json({
    endpoint: `${SUPABASE_URL}/functions/v1/whatsapp-ingest`,
    token: INGEST_TOKEN,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  if (req.method === "GET" && url.searchParams.get("config") === "1") {
    return handleConfig(req);
  }

  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);

  if (!INGEST_TOKEN) return json({ error: "Integração não configurada" }, 500);
  const provided = req.headers.get("x-ingest-token") ?? "";
  if (!timingSafeEqual(provided, INGEST_TOKEN)) {
    return json({ error: "Token inválido" }, 401);
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  const payload = await req.json().catch(() => null);

  const logAndFail = async (erro: string, status: number, externalId?: string | null) => {
    await supabase.from("whatsapp_ingest_log").insert({
      external_id: externalId ?? null,
      payload: payload ?? {},
      status: "rejeitado",
      erro,
    });
    return json({ error: erro }, status);
  };

  if (!payload || typeof payload !== "object") {
    return logAndFail("Corpo da requisição inválido (JSON esperado)", 400);
  }

  const externalId =
    typeof payload.external_id === "string" && payload.external_id.trim()
      ? payload.external_id.trim().slice(0, 120)
      : null;

  const nome = String(payload.nome ?? "").trim().slice(0, 120);
  const municipioInput = String(payload.municipio ?? "").trim().slice(0, 120);
  const descricao = String(payload.descricao ?? "").trim().slice(0, 4000);
  const whatsappRaw = String(payload.whatsapp ?? "").trim();
  const email = payload.email ? String(payload.email).trim().slice(0, 160) : null;

  if (!nome) return logAndFail("Campo obrigatório ausente: nome", 400, externalId);
  if (!municipioInput) return logAndFail("Campo obrigatório ausente: municipio", 400, externalId);
  if (descricao.length < 5) return logAndFail("Campo obrigatório ausente ou muito curto: descricao", 400, externalId);
  if (!whatsappRaw) return logAndFail("Campo obrigatório ausente: whatsapp", 400, externalId);

  const whatsapp = normalizePhone(whatsappRaw);
  if (!whatsapp) return logAndFail("Telefone inválido: use DDD + número", 400, externalId);

  // Idempotência: se o parceiro reenviar a mesma conversa, devolve o registro já criado.
  if (externalId) {
    const { data: existing } = await supabase
      .from("whatsapp_ingest_log")
      .select("id, sugestao_id, status")
      .eq("external_id", externalId)
      .eq("status", "aceito")
      .maybeSingle();
    if (existing) {
      return json({ ok: true, duplicated: true, sugestao_id: existing.sugestao_id });
    }
  }

  // Município precisa existir na base do estado.
  const { data: municipios } = await supabase.from("municipios").select("nome");
  const alvo = normalizeText(municipioInput);
  const match = (municipios ?? []).find((m) => normalizeText(String(m.nome)) === alvo);
  if (!match) {
    return logAndFail(
      `Município não reconhecido: "${municipioInput}". Envie o nome exato do município.`,
      400,
      externalId,
    );
  }

  const eixoInput = payload.eixo ? String(payload.eixo).trim() : "";
  const eixo = EIXOS.find((e) => normalizeText(e) === normalizeText(eixoInput)) ?? "Não classificado";

  const { data: sugestao, error: insertError } = await supabase
    .from("sugestoes_populares")
    .insert({
      nome,
      email,
      whatsapp,
      municipio: match.nome,
      eixo,
      descricao,
      publico: false,
      origem: "whatsapp",
    })
    .select("id")
    .single();

  if (insertError || !sugestao) {
    return logAndFail(`Falha ao gravar a sugestão: ${insertError?.message ?? "erro"}`, 500, externalId);
  }

  await supabase.from("whatsapp_ingest_log").insert({
    external_id: externalId,
    payload,
    status: "aceito",
    sugestao_id: sugestao.id,
  });

  // Classificação por IA quando o parceiro não informou o eixo.
  if (eixo === "Não classificado") {
    const classify = fetch(`${SUPABASE_URL}/functions/v1/classify-suggestion-eixo`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}` },
      body: JSON.stringify({ sugestao_id: sugestao.id }),
    }).catch(() => undefined);
    // @ts-ignore EdgeRuntime é global no runtime do Supabase
    if (typeof EdgeRuntime !== "undefined") EdgeRuntime.waitUntil(classify);
    else await classify;
  }

  return json({ ok: true, sugestao_id: sugestao.id });
});
