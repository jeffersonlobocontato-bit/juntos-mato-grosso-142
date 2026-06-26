import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestUser {
  email: string;
  full_name: string;
  role: 'lider_tematico' | 'curador_municipal';
  eixo_nome?: string;
  municipio_nomes?: string[];
}

const testUsers: TestUser[] = [
  // 8 Líderes Temáticos
  { email: 'carlos.agro@rota399.test', full_name: 'Carlos Agro', role: 'lider_tematico', eixo_nome: 'Agricultura e Meio Ambiente' },
  { email: 'maria.social@rota399.test', full_name: 'Maria Social', role: 'lider_tematico', eixo_nome: 'Desenvolvimento Social' },
  { email: 'pedro.turismo@rota399.test', full_name: 'Pedro Turismo', role: 'lider_tematico', eixo_nome: 'Economia e Turismo' },
  { email: 'ana.educacao@rota399.test', full_name: 'Ana Educação', role: 'lider_tematico', eixo_nome: 'Educação' },
  { email: 'joao.infra@rota399.test', full_name: 'João Infraestrutura', role: 'lider_tematico', eixo_nome: 'Infraestrutura' },
  { email: 'lucia.saude@rota399.test', full_name: 'Lúcia Saúde', role: 'lider_tematico', eixo_nome: 'Saúde' },
  { email: 'roberto.seguranca@rota399.test', full_name: 'Roberto Segurança', role: 'lider_tematico', eixo_nome: 'Segurança Pública' },
  { email: 'fernanda.tech@rota399.test', full_name: 'Fernanda Tech', role: 'lider_tematico', eixo_nome: 'Tecnologia e Inovação' },
  // 4 Curadores Municipais
  { email: 'curador.curitiba@rota399.test', full_name: 'Curador Curitiba', role: 'curador_municipal', municipio_nomes: ['Curitiba', 'Araucária'] },
  { email: 'curador.londrina@rota399.test', full_name: 'Curador Londrina', role: 'curador_municipal', municipio_nomes: ['Londrina', 'Cambé'] },
  { email: 'curador.maringa@rota399.test', full_name: 'Curador Maringá', role: 'curador_municipal', municipio_nomes: ['Maringá', 'Sarandi'] },
  { email: 'curador.cascavel@rota399.test', full_name: 'Curador Cascavel', role: 'curador_municipal', municipio_nomes: ['Cascavel', 'Toledo'] },
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Verify caller is admin_master
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Token inválido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check if user is admin_master
    const { data: roles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const isAdminMaster = roles?.some(r => r.role === 'admin_master');
    if (!isAdminMaster) {
      return new Response(JSON.stringify({ error: 'Apenas admin_master pode executar esta ação' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Fetch eixos and municipios
    const { data: eixos } = await supabaseAdmin.from('eixos_tematicos').select('id, nome');
    const { data: municipios } = await supabaseAdmin.from('municipios').select('id, nome');

    const eixoMap = new Map(eixos?.map(e => [e.nome, e.id]) || []);
    const municipioMap = new Map(municipios?.map(m => [m.nome, m.id]) || []);

    const results: { email: string; status: string; error?: string }[] = [];
    const credentials: { email: string; password: string }[] = [];

    const generatePassword = () => {
      const bytes = new Uint8Array(24);
      crypto.getRandomValues(bytes);
      const base = btoa(String.fromCharCode(...bytes))
        .replace(/[+/=]/g, '')
        .slice(0, 20);
      // Ensure at least one symbol/digit/upper for password policies
      return `A1!${base}`;
    };

    for (const testUser of testUsers) {
      try {
        // Check if user already exists
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = existingUsers?.users?.find(u => u.email === testUser.email);
        
        let userId: string;
        
        if (existingUser) {
          userId = existingUser.id;
          results.push({ email: testUser.email, status: 'já existia' });
        } else {
          const generatedPassword = generatePassword();
          // Create auth user
          const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: testUser.email,
            password: generatedPassword,
            email_confirm: true,
            user_metadata: { full_name: testUser.full_name }
          });

          if (createError) {
            results.push({ email: testUser.email, status: 'erro', error: createError.message });
            continue;
          }
          
          userId = newUser.user.id;
          results.push({ email: testUser.email, status: 'criado' });
          credentials.push({ email: testUser.email, password: generatedPassword });
        }

        // Upsert profile
        await supabaseAdmin.from('profiles').upsert({
          id: userId,
          full_name: testUser.full_name,
          email: testUser.email,
          cargo: testUser.role === 'lider_tematico' ? 'Líder Temático' : 'Curador Municipal'
        }, { onConflict: 'id' });

        // Upsert role
        await supabaseAdmin.from('user_roles').upsert({
          user_id: userId,
          role: testUser.role
        }, { onConflict: 'user_id,role', ignoreDuplicates: true });

        // Link to eixo if lider_tematico
        if (testUser.role === 'lider_tematico' && testUser.eixo_nome) {
          const eixoId = eixoMap.get(testUser.eixo_nome);
          if (eixoId) {
            // Create user_eixos link
            await supabaseAdmin.from('user_eixos').upsert({
              user_id: userId,
              eixo_id: eixoId
            }, { onConflict: 'user_id,eixo_id', ignoreDuplicates: true });

            // Update eixo lider_id
            await supabaseAdmin.from('eixos_tematicos').update({ lider_id: userId }).eq('id', eixoId);
          }
        }

        // Link to municipios if curador_municipal
        if (testUser.role === 'curador_municipal' && testUser.municipio_nomes) {
          for (const municipioNome of testUser.municipio_nomes) {
            const municipioId = municipioMap.get(municipioNome);
            if (municipioId) {
              await supabaseAdmin.from('user_municipios').upsert({
                user_id: userId,
                municipio_id: municipioId
              }, { onConflict: 'user_id,municipio_id', ignoreDuplicates: true });
            }
          }
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
        results.push({ email: testUser.email, status: 'erro', error: errorMessage });
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: `${results.filter(r => r.status === 'criado').length} usuários criados, ${results.filter(r => r.status === 'já existia').length} já existiam`,
      results,
      credentials,
      notice: 'Senhas geradas exibidas apenas uma vez. Anote-as agora — não serão recuperáveis.'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Erro interno';
    console.error('Seed error:', errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
