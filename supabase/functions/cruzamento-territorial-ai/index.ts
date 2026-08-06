import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Você é o Cruzamento Territorial IA, agente especialista em ler o mapa de calor de expectativa da população paranaense a partir das sugestões populares recebidas pela plataforma Juntos Paraná 399, com foco em recortes microrregionais (as 10 mesorregiões do IBGE) e por cidade.

SEU PAPEL
- Você é um analista territorial, não um contador de linhas de banco de dados. Toda resposta numérica vem acompanhada de contexto: o número é grande ou pequeno perto de quê? É a tag que o respondente escolheu, ou é o que o texto da sugestão realmente diz?
- Sua fonte primária é a base de sugestões populares e sua camada de classificação semântica multi-eixo. Use suas ferramentas para consultar sempre que precisar de um número — nunca estime ou "lembre" de um valor.
- Você pode cruzar com outras bases da plataforma (Propostas Técnicas/Institucionais/Políticas, Pesquisas Eleitorais) sempre que isso agregar à leitura territorial — não espere ser explicitamente pedido para cruzar, mas deixe claro no texto quando estiver trazendo dado de outra base.

REGRAS DE LEITURA DO MAPA DE CALOR
- Antes de comentar qualquer cidade específica, verifique o volume amostral com get_confianca_amostral. Cidades com menos de 5 sugestões têm leitura estatisticamente frágil — sinalize isso explicitamente ("com apenas N sugestões, este dado é indicativo, não conclusivo").
- Sempre que citar volume de um eixo, diga se é a tag original marcada pelo respondente ou o resultado da leitura semântica (classificação automática por menção no texto). As duas leituras divergem — principalmente em Segurança, historicamente subrrepresentada na tag e sobrerrepresentada no texto livre.
- Ao comparar cidades ou regiões, prefira métricas relativas (percentual do total) a números absolutos.
- Regiões e cidades têm perfis temáticos diferentes — ao ser perguntado sobre "o Paraná" de forma genérica, ofereça abrir por região.

CRUZAMENTO COM OUTRAS BASES
- Ao identificar uma demanda territorial forte, verifique proativamente se já existe Proposta Técnica cobrindo aquele tema/geografia — e diga se a demanda está ou não coberta pelo material já produzido.
- Ao comparar com pesquisas eleitorais, deixe claro que são fontes de natureza diferente (sugestão espontânea vs. pesquisa amostral) — nunca afirme causalidade.

O QUE VOCÊ NUNCA FAZ
- Nunca exibe nome ou WhatsApp de quem enviou uma sugestão — trabalhe sempre em nível agregado. Se pedirem dado individual identificável, recuse e explique que o painel é analítico.
- Nunca afirma certeza estatística que os dados não sustentam.
- Nunca conclui posicionamento eleitoral definitivo a partir de sugestões — fale em "sinal", "indicativo", "tendência apontada pelos dados".

TOM
Direto, analítico, sem enfeite. Você fala com estrategistas de campanha. Traga o número já interpretado, não só relatado. Responda em português brasileiro, em markdown enxuto.`;

const TOOLS = [
  { name: "get_resumo_geral", description: "Totais gerais do painel: sugestões, municípios, mesorregiões e eixos.", parameters: { type: "object", properties: {} } },
  { name: "get_regiao_resumo", description: "Volume de sugestões por mesorregião e distribuição por eixo (tag original). Opcionalmente filtra uma mesorregião.", parameters: { type: "object", properties: { mesorregiao: { type: "string" } } } },
  { name: "get_cidade_resumo", description: "Ranking de cidades por volume de sugestões; filtra por nome de município ou mesorregião.", parameters: { type: "object", properties: { municipio: { type: "string" }, mesorregiao: { type: "string" } } } },
  { name: "get_subeixos_regiao", description: "Leitura semântica: eixos e subeixos detectados no texto das sugestões por mesorregião.", parameters: { type: "object", properties: { mesorregiao: { type: "string" }, eixo: { type: "string" } } } },
  { name: "get_heatmap_top20", description: "Mapa de calor cidade x eixo das maiores cidades.", parameters: { type: "object", properties: {} } },
  { name: "get_reclassificacao_geral", description: "Cobertura da reclassificação pela taxonomia oficial e temas mais recorrentes.", parameters: { type: "object", properties: {} } },
  { name: "get_confianca_amostral", description: "Volume bruto de sugestões de uma cidade, para checar solidez amostral.", parameters: { type: "object", properties: { municipio: { type: "string" } }, required: ["municipio"] } },
  { name: "search_propostas", description: "Busca propostas cadastradas (tecnica, institucional ou politica) por texto/eixo.", parameters: { type: "object", properties: { tipo: { type: "string", enum: ["tecnica", "institucional", "politica"] }, query: { type: "string" }, eixo: { type: "string" } } } },
  { name: "search_pesquisas_eleitorais", description: "Busca pesquisas eleitorais cadastradas por região/tema.", parameters: { type: "object", properties: { query: { type: "string" } } } },
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Não autorizado" }, 401);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return json({ error: "Token inválido" }, 401);

    const { data: roleRows } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    const roles = (roleRows ?? []).map((r: any) => r.role);
    if (!roles.some((r: string) => ["admin", "admin_master", "lider_tematico"].includes(r))) {
      return json({ error: "Acesso não autorizado" }, 403);
    }

    const { messages } = await req.json() as { messages: Array<{ role: string; content: string }> };
    if (!Array.isArray(messages) || messages.length === 0) return json({ error: "Mensagens inválidas" }, 400);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "Serviço indisponível" }, 503);

    const runTool = async (name: string, args: any): Promise<unknown> => {
      const rpc = async (fn: string, params?: Record<string, unknown>) => {
        const { data, error } = await supabase.rpc(fn, params ?? {});
        if (error) throw error;
        return data ?? [];
      };
      const norm = (s?: string) => (s ?? "").toLowerCase().trim();
      switch (name) {
        case "get_resumo_geral":
          return await rpc("painel_cruzamento_resumo");
        case "get_regiao_resumo": {
          const [regioes, regiaoEixo] = await Promise.all([
            rpc("painel_cruzamento_por_regiao"),
            rpc("painel_cruzamento_regiao_eixo"),
          ]);
          const f = args?.mesorregiao ? norm(args.mesorregiao) : null;
          return {
            regioes: f ? (regioes as any[]).filter(r => norm(r.mesorregiao).includes(f)) : regioes,
            por_eixo_tag_original: f ? (regiaoEixo as any[]).filter(r => norm(r.mesorregiao).includes(f)) : regiaoEixo,
          };
        }
        case "get_cidade_resumo": {
          const ranking = await rpc("painel_cruzamento_ranking_cidades") as any[];
          const m = args?.municipio ? norm(args.municipio) : null;
          const r = args?.mesorregiao ? norm(args.mesorregiao) : null;
          return ranking
            .filter(c => (!m || norm(c.municipio).includes(m)) && (!r || norm(c.mesorregiao).includes(r)))
            .slice(0, 40);
        }
        case "get_subeixos_regiao": {
          const sem = await rpc("painel_cruzamento_semantico_regiao") as any[];
          const r = args?.mesorregiao ? norm(args.mesorregiao) : null;
          const e = args?.eixo ? norm(args.eixo) : null;
          return sem
            .filter(s => (!r || norm(s.mesorregiao).includes(r)) && (!e || norm(s.eixo_detectado).includes(e)))
            .slice(0, 120);
        }
        case "get_heatmap_top20":
          return await rpc("painel_cruzamento_cidade_eixo", { p_limit: 20 });
        case "get_reclassificacao_geral": {
          const [reclass, cobertura, resumoTax] = await Promise.all([
            rpc("painel_cruzamento_reclassificacao"),
            rpc("painel_taxonomia_cobertura"),
            rpc("painel_taxonomia_resumo"),
          ]);
          return { reclassificacao: reclass, cobertura, temas: (resumoTax as any[]).slice(0, 40) };
        }
        case "get_confianca_amostral": {
          const ranking = await rpc("painel_cruzamento_ranking_cidades") as any[];
          const m = norm(args?.municipio);
          const hit = ranking.filter(c => norm(c.municipio).includes(m));
          const total = hit.reduce((s, c) => s + Number(c.total || 0), 0);
          return { municipios: hit, total, frágil: total < 5 };
        }
        case "search_propostas": {
          let q = supabase
            .from("propostas_tecnicas")
            .select("id, titulo, descricao, status, tipo_proposta, eixos_tematicos(nome), municipios(nome)")
            .limit(15);
          if (args?.tipo === "institucional") q = q.eq("tipo_proposta", "institucional");
          else if (args?.tipo === "tecnica") q = q.eq("tipo_proposta", "tecnica");
          if (args?.query) q = q.or(`titulo.ilike.%${args.query}%,descricao.ilike.%${args.query}%`);
          if (args?.tipo === "politica") {
            const { data } = await supabase.from("propostas_politicas").select("*").limit(15);
            return data ?? [];
          }
          const { data, error } = await q;
          if (error) throw error;
          return (data ?? []).map((p: any) => ({ ...p, descricao: String(p.descricao ?? "").slice(0, 600) }));
        }
        case "search_pesquisas_eleitorais": {
          let q = supabase.from("pesquisas_eleitorais").select("*").limit(10);
          if (args?.query) q = q.ilike("titulo", `%${args.query}%`);
          const { data, error } = await q;
          if (error) throw error;
          return data ?? [];
        }
        default:
          return { error: "ferramenta desconhecida" };
      }
    };

    const convo: any[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages.slice(-20).map(m => ({ role: m.role, content: String(m.content).slice(0, 4000) })),
    ];

    for (let step = 0; step < 6; step++) {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3.6-flash",
          messages: convo,
          tools: TOOLS.map(t => ({ type: "function", function: t })),
        }),
      });

      if (res.status === 429) return json({ error: "Muitas requisições. Tente novamente em instantes." }, 429);
      if (res.status === 402) return json({ error: "Créditos de IA esgotados." }, 402);
      if (!res.ok) {
        console.error("gateway error", res.status, await res.text());
        return json({ error: "Erro ao consultar a IA." }, 500);
      }

      const data = await res.json();
      const msg = data.choices?.[0]?.message;
      if (!msg) return json({ error: "Resposta vazia da IA." }, 500);

      const calls = msg.tool_calls ?? [];
      if (calls.length === 0) {
        return json({ content: msg.content ?? "" });
      }

      convo.push(msg);
      for (const call of calls) {
        let result: unknown;
        try {
          const args = call.function?.arguments ? JSON.parse(call.function.arguments) : {};
          result = await runTool(call.function.name, args);
        } catch (e) {
          console.error("tool error", call.function?.name, e);
          result = { error: String(e) };
        }
        convo.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify(result).slice(0, 24000),
        });
      }
    }

    return json({ content: "Não consegui concluir a análise. Tente reformular a pergunta." });
  } catch (e) {
    console.error("cruzamento-territorial-ai error", e);
    return json({ error: "Erro interno." }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
