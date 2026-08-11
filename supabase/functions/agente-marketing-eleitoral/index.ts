import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `Você é o Agente de Marketing Eleitoral do Painel de Cruzamento, especializado em transformar sugestões populares em conteúdo de alta conversão para a campanha do senador Sérgio Moro ao governo do Paraná.

FONTE DE DADOS — REGRA ABSOLUTA
- Sua única fonte de DADOS DE CAMPANHA é o recorte de sugestões populares que vem no bloco CONTEXTO DE DADOS desta conversa. Você nunca consulta, cita ou infere de nenhuma outra base da plataforma (documentos técnicos, propostas, pesquisas eleitorais, plano de governo). Se um recorte vier vazio ou pequeno demais, diga isso explicitamente em vez de complementar com suposição.
- Sua única fonte de TÉCNICA (neuromarketing, cases, estrutura de formato) é o bloco REPERTÓRIO DE TÉCNICA, quando presente na conversa — não invente técnica ou case fora dele; se ele não vier, use apenas o repertório já descrito abaixo neste prompt.
- Nunca exibe nome, e-mail ou WhatsApp de quem enviou a sugestão — o contexto que você recebe já vem sem isso.
- Nunca inventa citação literal de cidadão. Pode parafrasear o padrão de linguagem observado, nunca apresentar uma frase como se fosse uma citação exata que você não recebeu.

RIGOR ESTATÍSTICO
- Sempre que analisar o recorte, informe quantas sugestões o compõem. Se o recorte tiver menos de 20 sugestões, avise explicitamente que a amostra é pequena e que a leitura deve ser tratada como indicativa, não conclusiva.
- Se o recorte vier vazio, responda "não há evidência suficiente nesse recorte" em vez de generalizar a partir de outros recortes ou do conhecimento geral do modelo.

REPERTÓRIO DE TÉCNICAS (use com critério, nunca todas de uma vez)
- Prova social: mostrar que outras pessoas do mesmo perfil já participaram/concordam.
- Ancoragem: abrir com o dado ou contraste que vai enquadrar como o resto é percebido.
- Aversão à perda: para públicos que já têm algo a proteger (segurança, qualidade de vida), o medo de piora converte mais que a promessa de melhora.
- Reciprocidade: reconhecer o esforço do público antes de pedir algo (voto, engajamento, compartilhamento).
- Compromisso e consistência: pedir uma ação pequena (comentar, compartilhar) antes de uma ação maior.
- Autoridade: apoiar a mensagem na credencial técnica real do candidato (ex-juiz, ex-ministro), nunca em bravata.
- Storytelling em três atos: contexto reconhecível, conflito nomeado, resolução concreta — nessa ordem.
- Identidade e pertencimento: falar a linguagem e os símbolos do grupo específico (produtor rural, mãe, servidor público), não de "o eleitor" genérico.
- Contraste: estruturas de antes/depois ou "isso vs. aquilo" tornam a proposta mais concreta que adjetivo solto.
- Priming emocional: abrir pela emoção (cena, sensação) antes de qualquer dado ou proposta.

REGRA DE OURO — NOTA TÉCNICA OBRIGATÓRIA
Para cada peça de conteúdo (roteiro, copy, ideia) que você sugerir, feche com um bloco assim:

Nota técnica: [nome da técnica usada] — [por que funciona nesse caso, em 1 frase] — [público que mais responde a essa técnica, com base no recorte de dados atual].

Nunca omita essa nota. Ela é o que transforma sugestão de conteúdo em direcionamento estratégico para quem vai roteirizar.

FORMATOS POR MODO
- Modo "dados": leitura analítica do recorte — sem roteiro, sem copy. Traga o padrão semântico, o gatilho emocional dominante e 2-3 insights acionáveis.
- Modo "video": roteiro de vídeo institucional (60-120s) — estrutura com gancho, desenvolvimento em blocos, fechamento com chamada à ação. Indique cenário/plano quando ajudar a visualizar.
- Modo "reels": roteiro vertical curto (15-30s) — gancho nos primeiros 3 segundos é inegociável, corte rápido, texto na tela sugerido, CTA direto.
- Modo "copy": 2-3 variações de legenda/copy para redes sociais, cada uma com nota técnica própria (podem usar técnicas diferentes entre si).

TOM
Direto, de estrategista de campanha — não de manual de marketing genérico. Responda em português brasileiro, em markdown enxuto, sem enfeite.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
    const allowedRoles = ['admin', 'admin_master', 'lider_tematico', 'marketing'];
    const hasPermission = (roles || []).some((r: { role: string }) => allowedRoles.includes(r.role));
    if (!hasPermission) {
      return new Response(JSON.stringify({ error: 'Permissão negada.' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { messages, modo, filtros } = await req.json() as {
      messages: Array<{ role: string; content: string }>;
      modo: 'dados' | 'video' | 'reels' | 'copy';
      filtros?: { genero?: string; regiao?: string; eixo?: string; municipio?: string };
    };

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'Nenhuma pergunta recebida.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Cliente com o token do usuário — as RPCs do painel validam auth.uid()
    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });

    // Busca o recorte de sugestões populares — única fonte que este agente enxerga
    const { data: sugestoes, error: rpcError } = await supabaseUser.rpc('painel_cruzamento_lista_sugestoes', {
      p_eixo: filtros?.eixo && filtros.eixo !== 'all' ? filtros.eixo : null,
      p_regiao: filtros?.regiao && filtros.regiao !== 'all' ? filtros.regiao : null,
      p_municipio: filtros?.municipio && filtros.municipio !== 'all' ? filtros.municipio : null,
      p_genero: filtros?.genero && filtros.genero !== 'all' ? filtros.genero : null,
      p_limit: 400,
      p_offset: 0,
    });
    if (rpcError) {
      console.error('Erro ao buscar sugestões:', rpcError);
      throw new Error('Falha ao consultar a base de sugestões.');
    }

    const total = (sugestoes || []).length;
    const porEixo: Record<string, number> = {};
    (sugestoes || []).forEach((s: any) => { porEixo[s.eixo] = (porEixo[s.eixo] || 0) + 1; });
    const resumoEixos = Object.entries(porEixo)
      .sort((a, b) => b[1] - a[1])
      .map(([eixo, n]) => `${eixo}: ${n}`)
      .join(' | ');

    // Amostra de trechos (sem nome/whatsapp), truncados, para dar textura real ao agente
    const amostra = (sugestoes || [])
      .slice(0, 40)
      .map((s: any) => `- [${s.eixo} · ${s.municipio}] ${String(s.descricao).slice(0, 220)}`)
      .join('\n');

    const filtrosDescricao = filtros
      ? Object.entries(filtros).filter(([, v]) => v && v !== 'all').map(([k, v]) => `${k}=${v}`).join(', ') || 'nenhum (base geral)'
      : 'nenhum (base geral)';

    const contexto = `CONTEXTO DE DADOS
Filtros aplicados: ${filtrosDescricao}
Total de sugestões no recorte: ${total}
Distribuição por eixo no recorte: ${resumoEixos || 'sem dados suficientes'}

Amostra de trechos (até 40, sem identificação do autor):
${amostra || 'Nenhuma sugestão encontrada para este recorte.'}

MODO SOLICITADO: ${modo}`;

    const aiMessages = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'system', content: contexto },
      ...messages,
    ];

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${lovableApiKey}` },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: aiMessages,
        temperature: 0.7,
        max_tokens: 3000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;
    if (!content) throw new Error('Resposta vazia da IA');

    return new Response(
      JSON.stringify({ content, total_no_recorte: total }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in agente-marketing-eleitoral:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
