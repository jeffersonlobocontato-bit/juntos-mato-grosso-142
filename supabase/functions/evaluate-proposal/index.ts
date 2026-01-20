import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EvaluationResult {
  score_total: number;
  scores: {
    viabilidade_tecnica: number;
    aderencia_popular: number;
    relevancia_eleitoral: number;
    coerencia_programatica: number;
    impacto_regional: number;
  };
  justificativa: string;
  pontos_fortes: string[];
  pontos_atencao: string[];
  fontes_cruzadas: Array<{
    tipo: string;
    titulo?: string;
    descricao?: string;
    relevancia: 'alta' | 'media' | 'baixa';
  }>;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { proposalId } = await req.json();

    if (!proposalId) {
      return new Response(
        JSON.stringify({ error: 'ID da proposta é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Evaluating proposal: ${proposalId}`);

    // 1. Fetch proposal with relations
    const { data: proposal, error: proposalError } = await supabase
      .from('propostas_tecnicas')
      .select(`
        *,
        eixos_tematicos(nome, descricao),
        municipios(nome, regiao)
      `)
      .eq('id', proposalId)
      .single();

    if (proposalError || !proposal) {
      console.error('Error fetching proposal:', proposalError);
      return new Response(
        JSON.stringify({ error: 'Proposta não encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Fetch technical documents (PELTI, studies, etc.)
    const { data: documents } = await supabase
      .from('ai_documents')
      .select('id, title, content, doc_category, description')
      .eq('is_active', true)
      .in('doc_category', ['documento_tecnico', 'plano_governo', 'promessa'])
      .limit(10);

    // 3. Fetch popular suggestions related to the same eixo/municipio
    let suggestionsQuery = supabase
      .from('sugestoes_populares')
      .select('descricao, eixo, municipio')
      .limit(20);

    if (proposal.eixos_tematicos?.nome) {
      suggestionsQuery = suggestionsQuery.ilike('eixo', `%${proposal.eixos_tematicos.nome}%`);
    }

    const { data: suggestions } = await suggestionsQuery;

    // 4. Fetch electoral research data
    const { data: pesquisas } = await supabase
      .from('pesquisas_eleitorais')
      .select('titulo, instituto, content, abrangencia')
      .eq('is_active', true)
      .eq('status', 'ativa')
      .limit(5);

    // Build context for AI
    const documentContext = documents?.map(d => 
      `### ${d.title} (${d.doc_category})\n${d.content?.substring(0, 2000) || d.description || ''}`
    ).join('\n\n') || 'Nenhum documento técnico disponível.';

    const suggestionsContext = suggestions?.map(s => 
      `- [${s.eixo}/${s.municipio}]: ${s.descricao}`
    ).join('\n') || 'Nenhuma sugestão popular encontrada.';

    const pesquisasContext = pesquisas?.map(p => 
      `### ${p.titulo} (${p.instituto})\n${p.content?.substring(0, 1000) || p.abrangencia || ''}`
    ).join('\n\n') || 'Nenhuma pesquisa disponível.';

    const questionarioText = proposal.questionario 
      ? JSON.stringify(proposal.questionario, null, 2)
      : 'Questionário não preenchido.';

    const prompt = `Você é um analista de políticas públicas especializado em avaliação de propostas técnicas para o governo do Paraná.

## PROPOSTA A AVALIAR

**Título:** ${proposal.titulo}
**Eixo Temático:** ${proposal.eixos_tematicos?.nome || 'N/A'}
**Município:** ${proposal.municipios?.nome || 'Estadual'} (Região: ${proposal.municipios?.regiao || 'N/A'})
**Status:** ${proposal.status}
**Etapa:** ${proposal.etapa}

**Descrição:**
${proposal.descricao}

**Metas:**
${proposal.metas || 'Não definidas'}

**Indicadores:**
${proposal.indicadores || 'Não definidos'}

**Questionário Completo:**
${questionarioText}

---

## BASE DE REFERÊNCIA PARA CRUZAMENTO

### 1. ESTUDOS TÉCNICOS E PLANO DE GOVERNO
${documentContext}

### 2. EXPECTATIVAS POPULARES (Sugestões Públicas)
${suggestionsContext}

### 3. PESQUISAS ELEITORAIS
${pesquisasContext}

---

## CRITÉRIOS DE AVALIAÇÃO (0 a 10 cada)

1. **Viabilidade Técnica**: Aderência a estudos técnicos existentes (PELTI, diagnósticos)
2. **Aderência Popular**: Alinhamento com sugestões e demandas da população
3. **Relevância Eleitoral**: Impacto potencial no eleitorado e pesquisas
4. **Coerência Programática**: Alinhamento com plano de governo e compromissos
5. **Impacto Regional**: Abrangência geográfica e benefícios para a região

---

## INSTRUÇÕES

Analise a proposta cruzando com TODAS as fontes de referência disponíveis. Seja crítico e objetivo.

Retorne OBRIGATORIAMENTE um JSON válido com a seguinte estrutura:

{
  "score_total": 7.5,
  "scores": {
    "viabilidade_tecnica": 8,
    "aderencia_popular": 7,
    "relevancia_eleitoral": 7,
    "coerencia_programatica": 8,
    "impacto_regional": 7.5
  },
  "justificativa": "Análise detalhada explicando a avaliação geral...",
  "pontos_fortes": ["Ponto forte 1", "Ponto forte 2"],
  "pontos_atencao": ["Ponto de atenção 1", "Ponto de atenção 2"],
  "fontes_cruzadas": [
    {"tipo": "documento_tecnico", "titulo": "PELTI 2024", "relevancia": "alta"},
    {"tipo": "sugestao", "descricao": "Sugestão sobre...", "relevancia": "media"}
  ]
}

IMPORTANTE:
- score_total deve ser a MÉDIA PONDERADA dos 5 critérios
- Cada score deve ser um número de 0 a 10 com uma casa decimal
- A justificativa deve ter entre 100-300 palavras
- Liste entre 2-5 pontos fortes e 2-5 pontos de atenção
- Liste as fontes que foram efetivamente usadas na análise
- Retorne APENAS o JSON, sem texto adicional`;

    console.log('Calling Lovable AI for evaluation...');

    // Call Lovable AI API
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 2000,
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

    console.log('AI response received, parsing...');

    // Parse JSON from AI response
    let evaluation: EvaluationResult;
    try {
      // Try to extract JSON from the response
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        evaluation = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      console.log('AI content:', aiContent);
      throw new Error('Failed to parse AI evaluation response');
    }

    // Validate and normalize scores
    const normalizeScore = (score: number): number => {
      return Math.min(10, Math.max(0, Number(score.toFixed(1))));
    };

    evaluation.score_total = normalizeScore(evaluation.score_total);
    evaluation.scores.viabilidade_tecnica = normalizeScore(evaluation.scores.viabilidade_tecnica);
    evaluation.scores.aderencia_popular = normalizeScore(evaluation.scores.aderencia_popular);
    evaluation.scores.relevancia_eleitoral = normalizeScore(evaluation.scores.relevancia_eleitoral);
    evaluation.scores.coerencia_programatica = normalizeScore(evaluation.scores.coerencia_programatica);
    evaluation.scores.impacto_regional = normalizeScore(evaluation.scores.impacto_regional);

    // Save evaluation to database
    const { data: savedEvaluation, error: saveError } = await supabase
      .from('proposal_evaluations')
      .insert({
        proposta_id: proposalId,
        score_total: evaluation.score_total,
        scores: evaluation.scores,
        justificativa: evaluation.justificativa,
        pontos_fortes: evaluation.pontos_fortes,
        pontos_atencao: evaluation.pontos_atencao,
        fontes_cruzadas: evaluation.fontes_cruzadas,
        evaluated_by: user.id,
        is_stale: false,
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving evaluation:', saveError);
      throw new Error('Failed to save evaluation');
    }

    console.log(`Evaluation saved successfully: ${savedEvaluation.id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        evaluation: savedEvaluation 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in evaluate-proposal:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro interno';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
