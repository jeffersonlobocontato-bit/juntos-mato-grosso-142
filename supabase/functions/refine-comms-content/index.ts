import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const allowedRoles = ['admin', 'admin_master', 'lider_tematico'];
    const hasPermission = (roles || []).some((r: { role: string }) => allowedRoles.includes(r.role));

    if (!hasPermission) {
      return new Response(JSON.stringify({ error: 'Permissão negada.' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { textoAtual, instrucao, contexto, formato } = await req.json();

    if (!textoAtual || typeof textoAtual !== 'string') {
      return new Response(JSON.stringify({ error: 'Texto atual é obrigatório' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!instrucao || typeof instrucao !== 'string' || instrucao.trim().length < 2) {
      return new Response(JSON.stringify({ error: 'Instrução é obrigatória' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const formatoLabel: Record<string, string> = {
      pit: 'pit de falas (bullets curtos para entrevista)',
      discurso: 'discurso completo',
      release: 'release jornalístico',
      nota: 'nota oficial para imprensa',
    };

    const prompt = `Você é um editor de texto institucional trabalhando para a assessoria de imprensa do senador Sérgio Moro.

## TIPO DE TEXTO
${formatoLabel[formato] || formato || 'texto institucional'}

## CONTEXTO ORIGINAL DO EVENTO/BRIEFING
${contexto || 'Não informado.'}

## TEXTO ATUAL
"""
${textoAtual}
"""

## INSTRUÇÃO DE EDIÇÃO DO USUÁRIO
${instrucao}

## REGRAS
- Aplique exatamente a instrução pedida, preservando o que não foi pedido para mudar.
- Não invente fatos, dados ou compromissos que não estejam no texto atual ou no contexto.
- Mantenha o formato/estrutura esperada para este tipo de texto (${formatoLabel[formato] || formato}).
- Retorne APENAS o texto final editado, sem explicações, sem aspas, sem markdown, sem comentários.`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.4,
        max_tokens: 1500,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const textoEditado = aiData.choices?.[0]?.message?.content?.trim();

    if (!textoEditado) {
      throw new Error('Resposta vazia da IA');
    }

    return new Response(
      JSON.stringify({ success: true, texto: textoEditado }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in refine-comms-content:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
