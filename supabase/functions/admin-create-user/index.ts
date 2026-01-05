import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateUserRequest {
  email: string;
  password: string;
  full_name: string;
  celular?: string;
  cargo?: string;
  roles: string[];
  eixo_ids: string[];
  municipio_ids?: string[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Get the authorization header from the request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create client with user's token to verify their identity
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get the calling user
    const { data: { user: callingUser }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !callingUser) {
      console.error("Error getting calling user:", userError);
      return new Response(
        JSON.stringify({ error: "Usuário não autenticado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Calling user:", callingUser.id);

    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Check if calling user has admin_master role
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", callingUser.id)
      .eq("role", "admin_master")
      .single();

    if (roleError || !roleData) {
      console.error("User is not admin_master:", roleError);
      return new Response(
        JSON.stringify({ error: "Apenas admin_master pode criar usuários" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("User verified as admin_master");

    // Parse request body
    const body: CreateUserRequest = await req.json();
    console.log("Creating user with email:", body.email);

    // Validate required fields
    if (!body.email || !body.password || !body.full_name) {
      return new Response(
        JSON.stringify({ error: "Email, senha e nome são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!body.roles || body.roles.length === 0) {
      return new Response(
        JSON.stringify({ error: "Pelo menos uma função deve ser selecionada" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if roles requiring eixos have eixos selected
    const rolesRequiringEixos = ["lider_tematico", "especialista"];
    const hasRoleRequiringEixo = body.roles.some(r => rolesRequiringEixos.includes(r));
    
    if (hasRoleRequiringEixo && (!body.eixo_ids || body.eixo_ids.length === 0)) {
      return new Response(
        JSON.stringify({ error: "Eixos são obrigatórios para líderes e especialistas" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if curador_municipal has municipios selected
    const hasCuradorRole = body.roles.includes("curador_municipal");
    if (hasCuradorRole && (!body.municipio_ids || body.municipio_ids.length === 0)) {
      return new Response(
        JSON.stringify({ error: "Municípios são obrigatórios para curadores municipais" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create user via Supabase Admin API
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
      user_metadata: {
        full_name: body.full_name,
      },
    });

    if (createError) {
      console.error("Error creating user:", createError);
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("User created:", newUser.user.id);

    // Update profile with additional fields
    if (body.celular || body.cargo) {
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .update({
          celular: body.celular,
          cargo: body.cargo,
        })
        .eq("id", newUser.user.id);

      if (profileError) {
        console.error("Error updating profile:", profileError);
        // Non-fatal error, continue
      }
    }

    // Insert roles
    const roleInserts = body.roles.map(role => ({
      user_id: newUser.user.id,
      role,
    }));

    const { error: rolesError } = await supabaseAdmin
      .from("user_roles")
      .insert(roleInserts);

    if (rolesError) {
      console.error("Error inserting roles:", rolesError);
      // Try to clean up the created user
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      return new Response(
        JSON.stringify({ error: "Erro ao atribuir funções" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Roles assigned:", body.roles);

    // Insert eixo relationships
    if (body.eixo_ids && body.eixo_ids.length > 0) {
      const eixoInserts = body.eixo_ids.map(eixo_id => ({
        user_id: newUser.user.id,
        eixo_id,
      }));

      const { error: eixosError } = await supabaseAdmin
        .from("user_eixos")
        .insert(eixoInserts);

      if (eixosError) {
        console.error("Error inserting eixos:", eixosError);
        // Non-fatal, continue
      } else {
        console.log("Eixos assigned:", body.eixo_ids);
      }
    }

    // Insert municipio relationships for curador_municipal
    if (body.municipio_ids && body.municipio_ids.length > 0) {
      const municipioInserts = body.municipio_ids.map(municipio_id => ({
        user_id: newUser.user.id,
        municipio_id,
      }));

      const { error: municipiosError } = await supabaseAdmin
        .from("user_municipios")
        .insert(municipioInserts);

      if (municipiosError) {
        console.error("Error inserting municipios:", municipiosError);
        // Non-fatal, continue
      } else {
        console.log("Municipios assigned:", body.municipio_ids);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: newUser.user.id,
          email: newUser.user.email,
          full_name: body.full_name,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
