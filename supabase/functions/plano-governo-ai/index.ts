import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface RequestBody {
  messages: ChatMessage[];
  mode: "plano" | "brainstorm";
  filters: {
    scope?: "estadual" | "regional";
    locationType?: "regiao" | "cidade";
    regiao?: string;
    cidade?: string;
    eixo?: string;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error("Auth error:", userError);
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check user roles
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const userRoles = roles?.map(r => r.role) || [];
    const isAuthorized = userRoles.includes("admin") || userRoles.includes("lider_tematico");

    if (!isAuthorized) {
      console.log("User not authorized:", user.id, userRoles);
      return new Response(JSON.stringify({ error: "Acesso não autorizado" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: RequestBody = await req.json();
    const { messages, mode, filters } = body;

    // Validate input
    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "Mensagens inválidas" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch context data based on filters
    let contextData = "";

    if (mode === "brainstorm") {
      // Fetch suggestions based on filters
      let suggestionsQuery = supabase
        .from("sugestoes_populares")
        .select("descricao, municipio, eixo")
        .limit(30);

      if (filters.locationType === "cidade" && filters.cidade) {
        suggestionsQuery = suggestionsQuery.eq("municipio", filters.cidade);
      } else if (filters.locationType === "regiao" && filters.regiao) {
        // Get municipalities in the region first
        const { data: municipiosRegiao } = await supabase
          .from("municipios")
          .select("nome")
          .eq("regiao", filters.regiao);
        
        if (municipiosRegiao && municipiosRegiao.length > 0) {
          const municipioNames = municipiosRegiao.map(m => m.nome);
          suggestionsQuery = suggestionsQuery.in("municipio", municipioNames);
        }
      }

      if (filters.eixo) {
        suggestionsQuery = suggestionsQuery.eq("eixo", filters.eixo);
      }

      const { data: suggestions } = await suggestionsQuery;

      // Fetch proposals based on filters
      let proposalsQuery = supabase
        .from("propostas_tecnicas")
        .select(`
          titulo,
          descricao,
          status,
          municipios!inner(nome, regiao),
          eixos_tematicos!inner(nome)
        `)
        .limit(20);

      if (filters.locationType === "cidade" && filters.cidade) {
        proposalsQuery = proposalsQuery.eq("municipios.nome", filters.cidade);
      } else if (filters.locationType === "regiao" && filters.regiao) {
        proposalsQuery = proposalsQuery.eq("municipios.regiao", filters.regiao);
      }

      if (filters.eixo) {
        proposalsQuery = proposalsQuery.eq("eixos_tematicos.nome", filters.eixo);
      }

      const { data: proposals } = await proposalsQuery;

      // Build context
      if (suggestions && suggestions.length > 0) {
        contextData += "\n\n=== SUGESTÕES DA POPULAÇÃO ===\n";
        suggestions.forEach((s, i) => {
          contextData += `${i + 1}. [${s.municipio}] ${s.eixo}: ${s.descricao}\n`;
        });
      }

      if (proposals && proposals.length > 0) {
        contextData += "\n\n=== PROPOSTAS TÉCNICAS EXISTENTES ===\n";
        proposals.forEach((p: any, i: number) => {
          contextData += `${i + 1}. [${p.status}] ${p.titulo}: ${p.descricao?.substring(0, 200)}...\n`;
        });
      }
    } else {
      // Plan mode - fetch aggregated statistics
      const { data: eixosData } = await supabase
        .from("eixos_tematicos")
        .select("nome, descricao");

      if (filters.scope === "regional" && filters.regiao) {
        // Get municipalities count
        const { count: municipiosCount } = await supabase
          .from("municipios")
          .select("*", { count: "exact", head: true })
          .eq("regiao", filters.regiao);

        // Get suggestions count
        const { data: municipiosRegiao } = await supabase
          .from("municipios")
          .select("nome")
          .eq("regiao", filters.regiao);
        
        if (municipiosRegiao && municipiosRegiao.length > 0) {
          const municipioNames = municipiosRegiao.map(m => m.nome);
          const { count: suggestionsCount } = await supabase
            .from("sugestoes_populares")
            .select("*", { count: "exact", head: true })
            .in("municipio", municipioNames);

          contextData += `\n\n=== CONTEXTO REGIONAL: ${filters.regiao} ===\n`;
          contextData += `- Municípios na região: ${municipiosCount}\n`;
          contextData += `- Sugestões populares da região: ${suggestionsCount}\n`;
        }
      } else {
        // State-wide stats
        const { count: municipiosCount } = await supabase
          .from("municipios")
          .select("*", { count: "exact", head: true });

        const { count: suggestionsCount } = await supabase
          .from("sugestoes_populares")
          .select("*", { count: "exact", head: true });

        const { count: proposalsCount } = await supabase
          .from("propostas_tecnicas")
          .select("*", { count: "exact", head: true });

        contextData += `\n\n=== CONTEXTO ESTADUAL ===\n`;
        contextData += `- Total de municípios: ${municipiosCount}\n`;
        contextData += `- Total de sugestões populares: ${suggestionsCount}\n`;
        contextData += `- Total de propostas técnicas: ${proposalsCount}\n`;
      }

      if (eixosData) {
        contextData += "\n=== EIXOS TEMÁTICOS ===\n";
        eixosData.forEach((e, i) => {
          contextData += `${i + 1}. ${e.nome}: ${e.descricao || 'Sem descrição'}\n`;
        });
      }
    }

    // Build system prompt based on mode
    const systemPrompt = mode === "brainstorm" 
      ? `Você é um especialista em políticas públicas e comunicação política, focado em ajudar na criação de propostas e discursos para o Estado do Paraná.

Seu papel é:
1. Analisar as sugestões populares e propostas técnicas disponíveis
2. Sugerir ideias de propostas baseadas nas demandas reais da população
3. Criar pontos de discurso que conectem as necessidades populares com soluções técnicas
4. Ser criativo e inspiracional, mas fundamentado nos dados reais

IMPORTANTE: Use os dados fornecidos como base para suas sugestões. Cite exemplos concretos quando disponíveis.

${contextData ? `DADOS DISPONÍVEIS:${contextData}` : 'Não há dados filtrados disponíveis. Faça sugestões gerais baseadas em boas práticas.'}

Responda em português brasileiro, de forma clara e estruturada.`
      : `Você é um especialista em elaboração de planos de governo e políticas públicas para o Estado do Paraná.

Seu papel é:
1. Criar planos de governo técnicos e profissionais
2. Seguir as melhores práticas de políticas públicas
3. Estruturar propostas com metas claras, indicadores e prazos
4. Considerar os 8 eixos temáticos: Agricultura e Meio Ambiente, Desenvolvimento Social, Economia e Turismo, Educação, Infraestrutura, Saúde, Segurança Pública, Tecnologia e Inovação

IMPORTANTE: Crie conteúdo técnico e institucional, com linguagem apropriada para documentos oficiais.

${contextData ? `DADOS DISPONÍVEIS:${contextData}` : ''}

Responda em português brasileiro. Estruture suas respostas com títulos, subtítulos, metas e indicadores quando apropriado.`;

    // Prepare messages for API
    const apiMessages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...messages.map(m => ({ role: m.role, content: m.content }))
    ];

    // Call Lovable AI Gateway
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: apiMessages,
        stream: true,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errorText);
      throw new Error("Erro na API de IA");
    }

    // Stream the response
    return new Response(aiResponse.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("Error in plano-governo-ai:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Erro interno" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
