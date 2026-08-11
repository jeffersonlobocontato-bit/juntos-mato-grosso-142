import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const EMAIL = "mkt@juntosparana399.com.br";

Deno.serve(async (req) => {
  const token = req.headers.get("x-setup-token");
  if (!token || token !== Deno.env.get("MKT_SETUP_TOKEN")) {
    return new Response(JSON.stringify({ error: "forbidden" }), { status: 403 });
  }
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const body = await req.json().catch(() => ({}));
  const password = String(body.password ?? "");
  if (password.length < 6) {
    return new Response(JSON.stringify({ error: "invalid password" }), { status: 400 });
  }

  const { data: list } = await admin.auth.admin.listUsers();
  let userId = list?.users?.find((u) => u.email === EMAIL)?.id;

  if (userId) {
    await admin.auth.admin.updateUserById(userId, { password, email_confirm: true });
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: EMAIL,
      password,
      email_confirm: true,
      user_metadata: { full_name: "Marketing JP399" },
    });
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 });
    userId = data.user.id;
  }

  await admin.from("profiles").upsert(
    { id: userId, full_name: "Marketing JP399", email: EMAIL, cargo: "Marketing" },
    { onConflict: "id" },
  );
  const { error: roleErr } = await admin
    .from("user_roles")
    .upsert({ user_id: userId, role: "marketing" }, { onConflict: "user_id,role", ignoreDuplicates: true });

  return new Response(JSON.stringify({ ok: true, userId, roleError: roleErr?.message ?? null }), {
    headers: { "Content-Type": "application/json" },
  });
});
