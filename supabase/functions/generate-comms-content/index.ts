import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TemaConvergente {
  tema: string;
  subtemas: string[];
  justificativa: string;
}

interface ContentResult {
  temas_mapeados: TemaConvergente[];
  conteudos: {
    pit?: string;
    discurso?: string;
    release?: string;
    nota?: string;
  };
}

const FORMATO_LABELS: Record<string, string> = {
  pit: 'Pit de falas (bullet points curtos para entrevistas, frases de efeito prontas para uso)',
  discurso: 'Discurso completo (abertura, 3 blocos temáticos de desenvolvimento, fechamento com chamado à ação)',
  release: 'Release jornalístico (lead, corpo do texto em 3ª pessoa, uma citação atribuída ao senador, formato pronto para envio à imprensa)',
  nota: 'Nota oficial para imprensa (curta, factual, direta, para resposta rápida a jornalistas)',
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

    // Role check: mesmo grupo do módulo de análise de propostas
    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (rolesError) {
      console.error('Error fetching user roles:', rolesError);
      return new Response(JSON.stringify({ error: 'Erro ao verificar permissões' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const allowedRoles = ['admin', 'admin_master', 'lider_tematico'];
    const hasPermission = (roles || []).some((r: { role: string }) => allowedRoles.includes(r.role));

    if (!hasPermission) {
      return new Response(JSON.stringify({ error: 'Permissão negada.' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { contexto, sources, formatos } = await req.json();

    if (!contexto || typeof contexto !== 'string' || contexto.trim().length < 5) {
      return new Response(JSON.stringify({ error: 'Contexto/briefing é obrigatório' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const formatosValidos = (formatos || []).filter((f: string) => Object.keys(FORMATO_LABELS).includes(f));
    if (formatosValidos.length === 0) {
      return new Response(JSON.stringify({ error: 'Selecione ao menos um formato (pit, discurso, release, nota)' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Generating comms content for context: "${contexto}"`);
    console.log('Source filters:', sources ? JSON.stringify(sources) : 'all sources');
    console.log('Formatos:', formatosValidos);

    const eixoFiltroId: string | null = sources?.eixoFiltroId ?? null;
    const subtemaFiltroIds: string[] = Array.isArray(sources?.subtemaFiltroIds) ? sources.subtemaFiltroIds : [];

    // Carrega nomes do recorte temático (para logging, contexto da IA e match em campos textuais)
    let eixoFiltroNome: string | null = null;
    let subtemaFiltroNomes: string[] = [];
    if (eixoFiltroId) {
      const { data: eixoRow } = await supabase
        .from('eixos_tematicos').select('nome').eq('id', eixoFiltroId).maybeSingle();
      eixoFiltroNome = eixoRow?.nome ?? null;
    }
    if (subtemaFiltroIds.length > 0) {
      const { data: subRows } = await supabase
        .from('subtemas').select('nome').in('id', subtemaFiltroIds);
      subtemaFiltroNomes = (subRows || []).map((s: any) => s.nome);
    }

    // 1. Documentos técnicos / plano de governo
    let documents: any[] = [];
    if (!sources || !sources.documentIds || sources.documentIds.length > 0) {
      let docsQuery = supabase
        .from('ai_documents')
        .select('id, title, content, doc_category, description')
        .eq('is_active', true);

      if (sources?.documentIds && sources.documentIds.length > 0) {
        docsQuery = docsQuery.in('id', sources.documentIds);
      } else {
        docsQuery = docsQuery
          .in('doc_category', ['documento_tecnico', 'plano_governo', 'promessa', 'comprovacao', 'investimento'])
          .limit(15);
      }

      if (eixoFiltroId && (!sources?.documentIds || sources.documentIds.length === 0)) {
        docsQuery = docsQuery.eq('eixo_id', eixoFiltroId);
      }

      const { data: docsData } = await docsQuery;
      documents = docsData || [];
    }
    console.log(`Fetched ${documents.length} documents`);

    // 2. Sugestões populares
    let suggestions: any[] = [];
    if (sources?.sugestaoIds && sources.sugestaoIds.length > 0) {
      const { data: suggestionsData } = await supabase
        .from('sugestoes_populares')
        .select('descricao, eixo, municipio')
        .in('id', sources.sugestaoIds);
      suggestions = suggestionsData || [];
    } else if (!sources || sources.includeSugestoes === true) {
      // backward compat: legacy boolean flag
      const { data: suggestionsData } = await supabase
        .from('sugestoes_populares')
        .select('descricao, eixo, municipio')
        .limit(20);
      suggestions = suggestionsData || [];
    }
    console.log(`Fetched ${suggestions.length} suggestions`);

    // 3. Pesquisas eleitorais
    let pesquisas: any[] = [];
    if (!sources || !sources.pesquisaIds || sources.pesquisaIds.length > 0) {
      let pesquisasQuery = supabase
        .from('pesquisas_eleitorais')
        .select('titulo, instituto, content, abrangencia')
        .eq('is_active', true)
        .eq('status', 'ativa');

      if (sources?.pesquisaIds && sources.pesquisaIds.length > 0) {
        pesquisasQuery = pesquisasQuery.in('id', sources.pesquisaIds);
      } else {
        pesquisasQuery = pesquisasQuery.limit(5);
      }

      const { data: pesquisasData } = await pesquisasQuery;
      pesquisas = pesquisasData || [];
    }
    console.log(`Fetched ${pesquisas.length} pesquisas`);

    // 4. Propostas técnicas já aprovadas/cadastradas (opcional, fonte nova específica deste módulo)
    let propostas: any[] = [];
    if (sources?.propostaIds && sources.propostaIds.length > 0) {
      let propQuery = supabase
        .from('propostas_tecnicas')
        .select('titulo, descricao, metas, eixos_tematicos(nome)')
        .in('id', sources.propostaIds)
        .limit(50);

      const { data: propData } = await propQuery;
      propostas = propData || [];
    } else if (sources?.includePropostas) {
      // backward compat
      let q = supabase
        .from('propostas_tecnicas')
        .select('titulo, descricao, metas, eixos_tematicos(nome)')
        .limit(15);
      if (eixoFiltroId) q = q.eq('eixo_id', eixoFiltroId);
      if (subtemaFiltroIds.length > 0) q = q.in('subtema_id', subtemaFiltroIds);
      const { data: propData } = await q;
      propostas = propData || [];
    }
    console.log(`Fetched ${propostas.length} propostas`);

    // 4b. Propostas políticas (nova fonte selecionável)
    let propostasPoliticas: any[] = [];
    if (sources?.propostaPoliticaIds && sources.propostaPoliticaIds.length > 0) {
      const { data: polData } = await supabase
        .from('propostas_politicas')
        .select('titulo, resumo, conteudo_completo, publico_alvo, impacto_esperado, eixos_tematicos(nome)')
        .in('id', sources.propostaPoliticaIds)
        .limit(50);
      propostasPoliticas = polData || [];
    }
    console.log(`Fetched ${propostasPoliticas.length} propostas políticas`);

    // 5. Eixos/subtemas existentes (para a IA mapear convergência usando a taxonomia real da campanha)
    const { data: eixosData } = await supabase
      .from('eixos_tematicos')
      .select('nome, descricao');
    const { data: temasData } = await supabase
      .from('temas')
      .select('nome, codigo, eixos_tematicos(nome)');

    // Build context blocks
    const documentContext = documents.map(d =>
      `### ${d.title} (${d.doc_category})\n${d.content?.substring(0, 1500) || d.description || ''}`
    ).join('\n\n') || 'Nenhum documento técnico selecionado.';

    const suggestionsContext = suggestions.map(s =>
      `- [${s.eixo}/${s.municipio}]: ${s.descricao}`
    ).join('\n') || 'Sugestões populares não incluídas.';

    const pesquisasContext = pesquisas.map(p =>
      `### ${p.titulo} (${p.instituto})\n${p.content?.substring(0, 800) || p.abrangencia || ''}`
    ).join('\n\n') || 'Nenhuma pesquisa eleitoral selecionada.';

    const propostasContext = propostas.map((p: any) =>
      `- [${p.eixos_tematicos?.nome || 'N/A'}] ${p.titulo}: ${p.descricao?.substring(0, 300)}`
    ).join('\n') || 'Nenhuma proposta técnica incluída.';

    const propostasPoliticasContext = propostasPoliticas.map((p: any) =>
      `- [${p.eixos_tematicos?.nome || 'N/A'}] ${p.titulo}: ${(p.resumo || p.conteudo_completo || '').substring(0, 400)}${p.publico_alvo ? ` | Público: ${p.publico_alvo}` : ''}${p.impacto_esperado ? ` | Impacto: ${p.impacto_esperado}` : ''}`
    ).join('\n') || 'Nenhuma proposta política incluída.';

    const taxonomiaContext = (eixosData || []).map(e => `- ${e.nome}: ${e.descricao || ''}`).join('\n')
      + '\n\nTemas registrados:\n'
      + (temasData || []).map((t: any) => `- [${t.eixos_tematicos?.nome}] ${t.nome}`).join('\n');

    const recorteBlock = eixoFiltroNome
      ? `## RECORTE TEMÁTICO OBRIGATÓRIO\nFoque a análise e a geração no eixo "${eixoFiltroNome}"${
          subtemaFiltroNomes.length > 0 ? `, especificamente nos subtemas: ${subtemaFiltroNomes.join(', ')}` : ''
        }. Use as fontes da base de referência sob esse recorte e ignore conexões fora desse escopo.\n\n---\n\n`
      : '';

    const formatosPrompt = formatosValidos
      .map((f: string) => `- "${f}": ${FORMATO_LABELS[f]}`)
      .join('\n');

    const prompt = `Você é o estrategista de comunicação e assessoria de imprensa da campanha do senador Sérgio Moro ao governo do Paraná (2026).

## BRIEFING / CONTEXTO DO EVENTO
${contexto}

---

${recorteBlock}## TAXONOMIA TEMÁTICA DA CAMPANHA (use estes eixos/temas para mapear convergência, não invente eixos novos)
${taxonomiaContext}

---

## BASE DE REFERÊNCIA PARA FUNDAMENTAR O CONTEÚDO

### 1. ESTUDOS TÉCNICOS E PLANO DE GOVERNO
${documentContext}

### 2. EXPECTATIVAS POPULARES (Sugestões Públicas)
${suggestionsContext}

### 3. PESQUISAS ELEITORAIS
${pesquisasContext}

### 4. PROPOSTAS TÉCNICAS DA CAMPANHA
${propostasContext}

### 5. PROPOSTAS POLÍTICAS DA CAMPANHA
${propostasPoliticasContext}

---

## TAREFA

PASSO 1 — Mapeie de 2 a 5 temas/subtemas da taxonomia acima que sejam CONVERGENTES com o briefing/contexto do evento. Não force conexões artificiais; só inclua temas que tenham relação real e defensável publicamente.

PASSO 2 — Gere os seguintes formatos de conteúdo de comunicação, ancorados nos temas mapeados e na base de referência (use dados/propostas reais quando disponíveis; nunca invente números ou compromissos que não estejam na base):
${formatosPrompt}

REGRAS DE TOM E CONTEÚDO:
- Tom institucional, sóbrio, na linha de comunicação de um ex-juiz e senador: direto, técnico quando necessário, evitar promessas vazias ou linguagem populista.
- Sempre que possível, ancore as falas em dados concretos da base de referência (custos, indicadores, propostas específicas).
- O "pit de falas" deve ter de 4 a 8 bullets curtos (1-2 frases cada), prontos para o senador usar em entrevista.
- O "discurso" deve ter entre 300-500 palavras, com abertura contextualizando o evento, 2-3 blocos temáticos e fechamento com chamado à ação.
- O "release" deve seguir formato jornalístico: título sugerido, lead (quem/o quê/quando/onde/por quê), 2-3 parágrafos de corpo, 1 citação atribuída ao senador entre aspas.
- A "nota" deve ter no máximo 150 palavras, tom factual e direto, sem floreios.
- Não gere formatos que não foram solicitados.

Retorne OBRIGATORIAMENTE um JSON válido com esta estrutura exata:

{
  "temas_mapeados": [
    {"tema": "Nome do eixo/tema", "subtemas": ["subtema 1", "subtema 2"], "justificativa": "por que este tema converge com o contexto"}
  ],
  "conteudos": {
    ${formatosValidos.map((f: string) => `"${f}": "texto completo aqui"`).join(',\n    ')}
  }
}

Retorne APENAS o JSON, sem texto adicional, sem markdown, sem comentários.`;

    console.log('Calling Lovable AI for content generation...');

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5,
        max_tokens: 4000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content;

    if (!aiContent) {
      throw new Error('Empty AI response');
    }

    let result: ContentResult;
    try {
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      console.log('AI content:', aiContent);
      throw new Error('Failed to parse AI content response');
    }

    const fontesUtilizadas = {
      documentos: documents.map(d => d.title),
      sugestoes_incluidas: suggestions.length > 0,
      sugestoes_count: suggestions.length,
      pesquisas: pesquisas.map(p => p.titulo),
      propostas: propostas.map((p: any) => p.titulo),
      propostas_politicas: propostasPoliticas.map((p: any) => p.titulo),
    };

    const { data: saved, error: saveError } = await supabase
      .from('comms_content_generations')
      .insert({
        contexto,
        temas_mapeados: result.temas_mapeados,
        conteudos: result.conteudos,
        fontes_utilizadas: fontesUtilizadas,
        formatos_gerados: formatosValidos,
        generated_by: user.id,
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving generation:', saveError);
      throw new Error('Failed to save content generation');
    }

    console.log(`Content generation saved: ${saved.id}`);

    return new Response(
      JSON.stringify({ success: true, generation: saved }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-comms-content:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
