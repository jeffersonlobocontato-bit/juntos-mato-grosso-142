// Portado do módulo "manage-cruzamento-access" da plataforma Politiza IA (politiza.ia.br)
// Adaptado para o módulo "Cruzamento Wellington" da Juntos Mato Grosso 142
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const caller = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await caller.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims?.sub) return json({ error: "Unauthorized" }, 401);
    const callerId = claimsData.claims.sub as string;

    const admin = createClient(SUPABASE_URL, SERVICE);

    // apenas admin_master
    const { data: rolesRow } = await admin
      .from("user_roles").select("role").eq("user_id", callerId);
    const isMaster = (rolesRow ?? []).some((r: any) => r.role === "admin_master");
    if (!isMaster) return json({ error: "Apenas admin_master pode gerenciar este acesso" }, 403);

    const { action, ...payload } = await req.json();

    // ---- CREATE (cria usuário se preciso + concede acesso) ----
    if (action === "create") {
      const { email, password, full_name } = payload;
      if (!email || !password) return json({ error: "email e senha são obrigatórios" }, 400);

      let userId: string | null = null;
      const { data: existing } = await admin
        .from("profiles").select("id").eq("email", email).maybeSingle();
      if (existing?.id) {
        userId = existing.id as string;
        await admin.auth.admin.updateUserById(userId, { password });
      } else {
        const { data: created, error: createErr } = await admin.auth.admin.createUser({
          email, password, email_confirm: true,
          user_metadata: { full_name: full_name || email },
        });
        if (createErr) return json({ error: createErr.message }, 400);
        userId = created.user.id;
        await admin.from("profiles").upsert({
          id: userId, email, full_name: full_name || email,
        });
      }

      const { error: grantErr } = await admin
        .from("cruzamento_wellington_access")
        .upsert({ user_id: userId, email, granted_by: callerId }, { onConflict: "user_id" });
      if (grantErr) return json({ error: grantErr.message }, 400);

      return json({ ok: true, user_id: userId });
    }

    // ---- REVOKE (remove acesso; NÃO deleta o usuário) ----
    if (action === "revoke") {
      const { user_id } = payload;
      if (!user_id) return json({ error: "user_id é obrigatório" }, 400);
      const { error } = await admin
        .from("cruzamento_wellington_access").delete().eq("user_id", user_id);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    // ---- LIST ----
    if (action === "list") {
      const { data, error } = await admin
        .from("cruzamento_wellington_access")
        .select("id, user_id, email, granted_by, created_at")
        .order("created_at", { ascending: false });
      if (error) return json({ error: error.message }, 400);
      return json({ items: data ?? [] });
    }

    return json({ error: "Ação inválida" }, 400);
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
