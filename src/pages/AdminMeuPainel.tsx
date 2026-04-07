import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUserAccess } from "@/hooks/useUserAccess";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatCard } from "@/components/admin/StatCard";
import AdminPieChart from "@/components/admin/AdminPieChart";
import { HorizontalBarChart } from "@/components/admin/HorizontalBarChart";
import { StackedAreaChart } from "@/components/admin/StackedAreaChart";
import { TopMunicipiosCard } from "@/components/admin/TopMunicipiosCard";
import { RecentActivityFeed } from "@/components/admin/RecentActivityFeed";
import { LeadsOriginChart } from "@/components/admin/LeadsOriginChart";
import { EixoStatusChart } from "@/components/admin/EixoStatusChart";
import { EixoSummaryTable } from "@/components/admin/EixoSummaryTable";
import { StaleProposalsAlertPanel } from "@/components/admin/StaleProposalsAlertPanel";
import { ProposalAnalysisPanel } from "@/components/admin/ProposalAnalysisPanel";
import { EixoComparisonPanel } from "@/components/admin/EixoComparisonPanel";
import { GovernmentBalanceChart } from "@/components/admin/GovernmentBalanceChart";
import { EntrevistadorDetailModal } from "@/components/admin/EntrevistadorDetailModal";
import ParanaMap from "@/components/admin/ParanaMap";
import {
  FileText,
  Users,
  Target,
  UserCheck,
  Eye,
  Globe,
  TrendingUp,
  MapPin,
  RefreshCw,
  Smartphone,
  Monitor,
  Tablet,
  UserPlus,
} from "lucide-react";
import { format, subDays, subMonths, startOfDay, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

type PeriodFilter = "7d" | "30d" | "6m" | "12m" | "all";

const getRoleBadge = (roles: string[]) => {
  if (roles.includes("admin_master")) return { label: "Admin Master", variant: "destructive" as const };
  if (roles.includes("admin")) return { label: "Administrador", variant: "default" as const };
  if (roles.includes("lider_tematico")) return { label: "Líder Temático", variant: "secondary" as const };
  if (roles.includes("curador_municipal")) return { label: "Curador Municipal", variant: "outline" as const };
  if (roles.includes("especialista")) return { label: "Especialista", variant: "outline" as const };
  return { label: "Usuário", variant: "outline" as const };
};

export default function AdminMeuPainel() {
  const { roles } = useAuth();
  const { userEixos, userMunicipios, isAdmin, isAdminMaster, isLiderTematico: isLider, isCuradorMunicipal: isCurador, getEixoIds, getMunicipioIds, userId } = useUserAccess();
  const [period, setPeriod] = useState<PeriodFilter>("30d");
  const [isSeeding, setIsSeeding] = useState(false);
  const [selectedEixosForComparison, setSelectedEixosForComparison] = useState<string[]>([]);
  const [selectedEntrevistadorId, setSelectedEntrevistadorId] = useState<string | null>(null);
  const roleBadge = getRoleBadge(roles);
  const { toast } = useToast();

  const handleSeedTestUsers = async () => {
    setIsSeeding(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      
      if (!token) {
        toast({ title: "Erro", description: "Você precisa estar logado", variant: "destructive" });
        return;
      }

      const response = await supabase.functions.invoke('seed-test-users', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.error) {
        toast({ title: "Erro", description: response.error.message, variant: "destructive" });
      } else {
        toast({ 
          title: "Sucesso!", 
          description: response.data.message || "Usuários de teste criados",
        });
        handleRefresh();
      }
    } catch (err) {
      toast({ title: "Erro", description: "Falha ao criar usuários de teste", variant: "destructive" });
    } finally {
      setIsSeeding(false);
    }
  };

  const getDateRange = () => {
    const now = new Date();
    switch (period) {
      case "7d": return subDays(now, 7);
      case "30d": return subDays(now, 30);
      case "6m": return subMonths(now, 6);
      case "12m": return subMonths(now, 12);
      default: return new Date("2020-01-01");
    }
  };

  // Fetch all data
  const { data: propostas, isLoading: loadingPropostas, refetch: refetchPropostas } = useQuery({
    queryKey: ["meu-painel-propostas", userEixos, userMunicipios, userId],
    queryFn: async () => {
      let query = supabase.from("propostas_tecnicas").select(`
        *,
        eixos_tematicos(nome),
        municipios(nome),
        temas(nome)
      `);
      if (isLider && !isAdmin && !isAdminMaster && userId) {
        query = query.eq("autor_id", userId);
      } else if (isCurador && userMunicipios.length > 0 && !isAdmin && !isLider) {
        query = query.in("municipio_id", getMunicipioIds());
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const { data: sugestoes, isLoading: loadingSugestoes, refetch: refetchSugestoes } = useQuery({
    queryKey: ["meu-painel-sugestoes", userEixos, userId],
    queryFn: async () => {
      let query = supabase.from("sugestoes_populares").select("*");
      if (isLider && !isAdmin && !isAdminMaster && userEixos.length > 0) {
        const eixoNomes = userEixos.map(e => e.eixo_nome).filter(Boolean) as string[];
        if (eixoNomes.length > 0) {
          query = query.in("eixo", eixoNomes);
        }
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const { data: leads, isLoading: loadingLeads, refetch: refetchLeads } = useQuery({
    queryKey: ["meu-painel-leads", userId],
    queryFn: async () => {
      if (isLider && !isAdmin && !isAdminMaster && userId) {
        // First get the leader's own proposal IDs
        const { data: myPropostas } = await supabase
          .from("propostas_tecnicas")
          .select("id")
          .eq("autor_id", userId);
        const myPropostaIds = myPropostas?.map(p => p.id) || [];
        
        if (myPropostaIds.length === 0) return [];
        
        const { data, error } = await supabase
          .from("leads")
          .select("*")
          .in("proposta_id", myPropostaIds);
        if (error) throw error;
        return data || [];
      }
      
      const { data, error } = await supabase.from("leads").select("*");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: eixos, isLoading: loadingEixos } = useQuery({
    queryKey: ["meu-painel-eixos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("eixos_tematicos").select("*");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: municipiosData, isLoading: loadingMunicipios } = useQuery({
    queryKey: ["meu-painel-municipios"],
    queryFn: async () => {
      const { data, error } = await supabase.from("municipios").select("id, nome, latitude, longitude");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: aiDocuments, isLoading: loadingAiDocuments } = useQuery({
    queryKey: ["meu-painel-ai-documents"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ai_documents").select("eixo_id, temporal_status");
      if (error) throw error;
      return data || [];
    },
    enabled: isAdmin || isLider,
  });

  const { data: analytics, isLoading: loadingAnalytics } = useQuery({
    queryKey: ["meu-painel-analytics", period],
    queryFn: async () => {
      const startDate = getDateRange();
      const { data, error } = await supabase
        .from("page_analytics_events")
        .select("*")
        .gte("created_at", startDate.toISOString());
      if (error) throw error;
      return data || [];
    },
    enabled: isAdmin || isLider,
  });

  const { data: userRoles } = useQuery({
    queryKey: ["meu-painel-user-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("*");
      if (error) throw error;
      return data || [];
    },
    enabled: isAdmin,
  });

  const { data: profiles } = useQuery({
    queryKey: ["meu-painel-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, full_name");
      if (error) throw error;
      return data || [];
    },
    enabled: isAdmin || isAdminMaster,
  });

  const handleRefresh = () => {
    refetchPropostas();
    refetchSugestoes();
    refetchLeads();
  };

  // Calculate metrics
  const metrics = useMemo(() => {
    const startDate = getDateRange();
    
    const filteredPropostas = propostas?.filter(p => new Date(p.created_at) >= startDate) || [];
    const filteredSugestoes = sugestoes?.filter(s => new Date(s.created_at) >= startDate) || [];
    const filteredLeads = leads?.filter(l => new Date(l.created_at) >= startDate) || [];

    const totalPropostas = filteredPropostas.length;
    const totalSugestoes = filteredSugestoes.length;
    const totalLeads = filteredLeads.length;

    // Status distribution
    const statusCount = {
      rascunho: filteredPropostas.filter(p => p.status === "rascunho").length,
      em_analise: filteredPropostas.filter(p => p.status === "em_analise").length,
      aprovada: filteredPropostas.filter(p => p.status === "aprovada").length,
    };

    // Leads origin
    const leadsOrigin = {
      formulario: filteredLeads.filter(l => l.origem === "formulario").length,
      chatbot: filteredLeads.filter(l => l.origem === "chatbot").length,
      proposta: filteredLeads.filter(l => l.origem === "proposta").length,
    };

    // Etapa distribution
    const etapaCount = {
      1: filteredPropostas.filter(p => p.etapa === 1).length,
      2: filteredPropostas.filter(p => p.etapa === 2).length,
      3: filteredPropostas.filter(p => p.etapa === 3).length,
      4: filteredPropostas.filter(p => p.etapa === 4).length,
    };

    // Analytics metrics
    const pageviews = analytics?.filter(a => a.event_type === "page_view").length || 0;
    const uniqueSessions = new Set(analytics?.map(a => a.session_id)).size;
    const conversionRate = uniqueSessions > 0 ? ((totalLeads / uniqueSessions) * 100).toFixed(1) : "0";

    // Device breakdown
    const deviceBreakdown = {
      mobile: analytics?.filter(a => a.device_type === "mobile").length || 0,
      desktop: analytics?.filter(a => a.device_type === "desktop").length || 0,
      tablet: analytics?.filter(a => a.device_type === "tablet").length || 0,
    };

    // Unique municipalities with activity
    const activeMunicipios = new Set([
      ...filteredPropostas.map(p => p.municipio_id).filter(Boolean),
      ...filteredSugestoes.map(s => s.municipio).filter(Boolean),
      ...filteredLeads.map(l => l.municipio).filter(Boolean),
    ]).size;

    return {
      totalPropostas,
      totalSugestoes,
      totalLeads,
      statusCount,
      leadsOrigin,
      etapaCount,
      pageviews,
      uniqueSessions,
      conversionRate,
      deviceBreakdown,
      activeMunicipios,
      totalUsers: userRoles?.length || 0,
    };
  }, [propostas, sugestoes, leads, analytics, userRoles, period]);

  // Prepare chart data
  const statusChartData = [
    { name: "Rascunho", value: metrics.statusCount.rascunho, fill: "hsl(var(--muted-foreground))" },
    { name: "Em Análise", value: metrics.statusCount.em_analise, fill: "hsl(221, 83%, 53%)" },
    { name: "Aprovada", value: metrics.statusCount.aprovada, fill: "hsl(142, 76%, 36%)" },
  ];

  const originChartData = [
    { name: "Formulário", value: metrics.leadsOrigin.formulario, fill: "hsl(var(--primary))" },
    { name: "Chatbot", value: metrics.leadsOrigin.chatbot, fill: "hsl(142, 76%, 36%)" },
    { name: "Proposta", value: metrics.leadsOrigin.proposta, fill: "hsl(38, 92%, 50%)" },
  ];

  const etapaChartData = [
    { name: "Etapa 1", value: metrics.etapaCount[1], fill: "hsl(var(--muted-foreground))" },
    { name: "Etapa 2", value: metrics.etapaCount[2], fill: "hsl(199, 89%, 48%)" },
    { name: "Etapa 3", value: metrics.etapaCount[3], fill: "hsl(262, 83%, 58%)" },
    { name: "Etapa 4", value: metrics.etapaCount[4], fill: "hsl(142, 76%, 36%)" },
  ];

  // Propostas por eixo (apenas propostas)
  const propostasPorEixo = useMemo(() => {
    if (!eixos || !propostas) return [];
    
    return eixos.map(eixo => ({
      name: eixo.nome.length > 18 ? eixo.nome.substring(0, 18) + "..." : eixo.nome,
      fullName: eixo.nome,
      value: propostas.filter(p => p.eixo_id === eixo.id).length,
      eixoId: eixo.id,
    }));
  }, [eixos, propostas]);

  // Sugestões por eixo (apenas sugestões)
  const sugestoesPorEixo = useMemo(() => {
    if (!eixos || !sugestoes) return [];
    
    return eixos.map(eixo => ({
      name: eixo.nome.length > 18 ? eixo.nome.substring(0, 18) + "..." : eixo.nome,
      fullName: eixo.nome,
      value: sugestoes.filter(s => s.eixo === eixo.nome).length,
    }));
  }, [eixos, sugestoes]);

  // Status das propostas por eixo (para barras empilhadas)
  const statusPorEixo = useMemo(() => {
    if (!eixos || !propostas) return [];
    
    return eixos.map(eixo => {
      const eixoPropostas = propostas.filter(p => p.eixo_id === eixo.id);
      const rascunho = eixoPropostas.filter(p => p.status === "rascunho").length;
      const em_analise = eixoPropostas.filter(p => p.status === "em_analise").length;
      const aprovada = eixoPropostas.filter(p => p.status === "aprovada").length;
      
      return {
        name: eixo.nome.length > 18 ? eixo.nome.substring(0, 18) + "..." : eixo.nome,
        fullName: eixo.nome,
        rascunho,
        em_analise,
        aprovada,
        total: rascunho + em_analise + aprovada,
      };
    });
  }, [eixos, propostas]);

  // Resumo por eixo para tabela
  const eixoSummary = useMemo(() => {
    if (!eixos || !propostas || !sugestoes) return [];
    
    return eixos.map(eixo => {
      const eixoPropostas = propostas.filter(p => p.eixo_id === eixo.id);
      const eixoSugestoes = sugestoes.filter(s => s.eixo === eixo.nome);
      const aprovadas = eixoPropostas.filter(p => p.status === "aprovada").length;
      const taxaAprovacao = eixoPropostas.length > 0 
        ? (aprovadas / eixoPropostas.length) * 100 
        : 0;
      
      return {
        nome: eixo.nome,
        propostas: eixoPropostas.length,
        sugestoes: eixoSugestoes.length,
        aprovadas,
        taxaAprovacao,
      };
    });
  }, [eixos, propostas, sugestoes]);

  // Government balance data by eixo
  const governmentBalanceData = useMemo(() => {
    if (!eixos || !aiDocuments) return [];
    
    return eixos.map(eixo => {
      const eixoDocs = aiDocuments.filter(d => d.eixo_id === eixo.id);
      return {
        eixo: eixo.nome.length > 15 ? eixo.nome.substring(0, 15) + '...' : eixo.nome,
        realizado: eixoDocs.filter(d => d.temporal_status === 'realizado').length,
        em_andamento: eixoDocs.filter(d => d.temporal_status === 'em_andamento').length,
        prometido: eixoDocs.filter(d => d.temporal_status === 'prometido').length,
        nao_iniciado: eixoDocs.filter(d => d.temporal_status === 'nao_iniciado').length,
      };
    });
  }, [eixos, aiDocuments]);

  // Municipios ranking
  const municipiosRanking = useMemo(() => {
    const countMap: Record<string, number> = {};
    
    leads?.forEach(l => {
      if (l.municipio) {
        countMap[l.municipio] = (countMap[l.municipio] || 0) + 1;
      }
    });
    
    sugestoes?.forEach(s => {
      if (s.municipio) {
        countMap[s.municipio] = (countMap[s.municipio] || 0) + 1;
      }
    });

    return Object.entries(countMap)
      .map(([nome, count]) => ({ nome, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [leads, sugestoes]);

  // Cadastros por entrevistador/líder
  const cadastrosPorEntrevistador = useMemo(() => {
    if (!propostas || !profiles) return [];
    const countMap: Record<string, { name: string; count: number }> = {};
    propostas.forEach(p => {
      if (!p.autor_id) return;
      if (!countMap[p.autor_id]) {
        const profile = profiles.find(pr => pr.id === p.autor_id);
        countMap[p.autor_id] = { name: profile?.full_name || 'Sem nome', count: 0 };
      }
      countMap[p.autor_id].count++;
    });
    return Object.values(countMap)
      .sort((a, b) => b.count - a.count)
      .map(item => ({
        name: item.name.length > 20 ? item.name.substring(0, 20) + '...' : item.name,
        fullName: item.name,
        value: item.count,
      }));
  }, [propostas, profiles]);

  // Timeline data
  const timelineData = useMemo(() => {
    const startDate = getDateRange();
    const now = new Date();
    
    let intervals: Date[];
    let formatStr: string;
    
    if (period === "7d" || period === "30d") {
      intervals = eachDayOfInterval({ start: startDate, end: now });
      formatStr = "dd/MM";
    } else if (period === "6m") {
      intervals = eachWeekOfInterval({ start: startDate, end: now });
      formatStr = "dd/MM";
    } else {
      intervals = eachMonthOfInterval({ start: startDate, end: now });
      formatStr = "MMM/yy";
    }

    return intervals.map(date => {
      const dayStart = startOfDay(date);
      const dayEnd = period === "7d" || period === "30d" 
        ? startOfDay(new Date(date.getTime() + 86400000))
        : period === "6m"
          ? startOfDay(new Date(date.getTime() + 7 * 86400000))
          : startOfDay(new Date(date.getFullYear(), date.getMonth() + 1, 1));

      const propostasCount = propostas?.filter(p => {
        const d = new Date(p.created_at);
        return d >= dayStart && d < dayEnd;
      }).length || 0;

      const sugestoesCount = sugestoes?.filter(s => {
        const d = new Date(s.created_at);
        return d >= dayStart && d < dayEnd;
      }).length || 0;

      const leadsCount = leads?.filter(l => {
        const d = new Date(l.created_at);
        return d >= dayStart && d < dayEnd;
      }).length || 0;

      return {
        date: format(date, formatStr, { locale: ptBR }),
        Propostas: propostasCount,
        Sugestões: sugestoesCount,
        Leads: leadsCount,
      };
    });
  }, [propostas, sugestoes, leads, period]);

  // Leads origin timeline
  const leadsOriginTimeline = useMemo(() => {
    const startDate = getDateRange();
    const now = new Date();
    
    let intervals: Date[];
    let formatStr: string;
    
    if (period === "7d" || period === "30d") {
      intervals = eachDayOfInterval({ start: startDate, end: now });
      formatStr = "dd/MM";
    } else if (period === "6m") {
      intervals = eachWeekOfInterval({ start: startDate, end: now });
      formatStr = "dd/MM";
    } else {
      intervals = eachMonthOfInterval({ start: startDate, end: now });
      formatStr = "MMM/yy";
    }

    return intervals.map(date => {
      const dayStart = startOfDay(date);
      const dayEnd = period === "7d" || period === "30d" 
        ? startOfDay(new Date(date.getTime() + 86400000))
        : period === "6m"
          ? startOfDay(new Date(date.getTime() + 7 * 86400000))
          : startOfDay(new Date(date.getFullYear(), date.getMonth() + 1, 1));

      const filterByDate = (items: typeof leads) => items?.filter(l => {
        const d = new Date(l.created_at);
        return d >= dayStart && d < dayEnd;
      }) || [];

      const filtered = filterByDate(leads);

      return {
        date: format(date, formatStr, { locale: ptBR }),
        formulario: filtered.filter(l => l.origem === "formulario").length,
        chatbot: filtered.filter(l => l.origem === "chatbot").length,
        proposta: filtered.filter(l => l.origem === "proposta").length,
      };
    });
  }, [leads, period]);

  // Recent activity
  const recentPropostas = useMemo(() => 
    (propostas || [])
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5)
      .map(p => ({
        id: p.id,
        title: p.titulo,
        subtitle: `Status: ${p.status}`,
        created_at: p.created_at,
      })),
    [propostas]
  );

  const recentSugestoes = useMemo(() => 
    (sugestoes || [])
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5)
      .map(s => ({
        id: s.id,
        title: s.descricao.substring(0, 50) + (s.descricao.length > 50 ? "..." : ""),
        subtitle: s.municipio,
        created_at: s.created_at,
      })),
    [sugestoes]
  );

  const recentLeads = useMemo(() => 
    (leads || [])
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5)
      .map(l => ({
        id: l.id,
        title: l.nome || l.email || "Lead anônimo",
        subtitle: `${l.origem} - ${l.municipio || "N/A"}`,
        created_at: l.created_at,
      })),
    [leads]
  );

  const isLoading = loadingPropostas || loadingSugestoes || loadingLeads;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Meu Painel</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={roleBadge.variant}>{roleBadge.label}</Badge>
            {isLider && userEixos.length > 0 && (
              <span className="text-sm text-muted-foreground">
                {userEixos.length} eixo(s) vinculado(s)
              </span>
            )}
            {isCurador && userMunicipios.length > 0 && (
              <span className="text-sm text-muted-foreground">
                {userMunicipios.length} município(s) vinculado(s)
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={period} onValueChange={(v) => setPeriod(v as PeriodFilter)}>
            <TabsList>
              <TabsTrigger value="7d">7d</TabsTrigger>
              <TabsTrigger value="30d">30d</TabsTrigger>
              <TabsTrigger value="6m">6m</TabsTrigger>
              <TabsTrigger value="12m">12m</TabsTrigger>
              <TabsTrigger value="all">Tudo</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
          {isAdminMaster && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleSeedTestUsers} 
              disabled={isSeeding}
              className="gap-2"
            >
              <UserPlus className={`h-4 w-4 ${isSeeding ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Popular Usuários</span>
            </Button>
          )}
        </div>
      </div>

      {/* CTA Entrevista para líderes temáticos */}
      {(isLider || isAdminMaster) && (
        <Card className="bg-gradient-to-r from-primary/20 via-accent/15 to-primary/20 border-primary/40 shadow-lg shadow-primary/10 overflow-hidden relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4 py-6 relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform shadow-md">
                <FileText className="w-7 h-7 text-primary" />
              </div>
              <div>
                <p className="font-display font-bold text-lg text-foreground group-hover:text-primary transition-colors">
                  Entrevista Técnica
                </p>
                <p className="text-sm text-muted-foreground">
                  {userEixos.length === 0
                    ? 'Registre entrevistas técnicas com especialistas'
                    : userEixos.length === 1
                      ? `Registre entrevistas para o eixo: ${userEixos[0].eixo_nome || 'Seu eixo'}`
                      : `Registre entrevistas para seus ${userEixos.length} eixos vinculados`}
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button asChild size="lg" className="gap-2 whitespace-nowrap font-bold shadow-md">
                <a href="/entrevista">
                  <FileText className="w-5 h-5" />
                  ENTREVISTA TÉCNICA
                </a>
              </Button>
              <Button asChild size="lg" variant="accent" className="gap-2 whitespace-nowrap font-bold shadow-md">
                <a href="/liderancas">
                  ENTREVISTA POLÍTICA
                </a>
              </Button>
              <Button asChild size="lg" variant="secondary" className="gap-2 whitespace-nowrap font-bold shadow-md">
                <a href="/">
                  ENTREVISTA POPULAR
                </a>
              </Button>
              <Button asChild size="lg" variant="outline" className="gap-2 whitespace-nowrap font-bold shadow-md border-amber-500/50 text-amber-600 hover:bg-amber-500/10">
                <a href="/entrevista-institucional">
                  ENTREVISTA INSTITUCIONAL
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Big Numbers Row 1 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard
          title="Propostas Técnicas"
          value={metrics.totalPropostas}
          icon={FileText}
          variant="primary"
          isLoading={loadingPropostas}
        />
        <StatCard
          title="Sugestões Populares"
          value={metrics.totalSugestoes}
          icon={Users}
          variant="success"
          isLoading={loadingSugestoes}
        />
        <StatCard
          title="Leads Capturados"
          value={metrics.totalLeads}
          icon={Target}
          variant="warning"
          isLoading={loadingLeads}
        />
        <StatCard
          title="Usuários Cadastrados"
          value={metrics.totalUsers}
          icon={UserCheck}
          variant="default"
          isLoading={!userRoles && isAdmin}
        />
        <StatCard
          title="Entrevistadores Ativos"
          value={cadastrosPorEntrevistador.length}
          icon={UserPlus}
          variant="primary"
          isLoading={loadingPropostas}
        />
      </div>

      {/* Big Numbers Row 2 - Analytics (Admin/Líder only) */}
      {(isAdmin || isLider) && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="Visualizações LP"
            value={metrics.pageviews}
            icon={Eye}
            variant="default"
            isLoading={loadingAnalytics}
          />
          <StatCard
            title="Visitantes Únicos"
            value={metrics.uniqueSessions}
            icon={Globe}
            variant="default"
            isLoading={loadingAnalytics}
          />
          <StatCard
            title="Taxa de Conversão"
            value={`${metrics.conversionRate}%`}
            icon={TrendingUp}
            variant="primary"
            isLoading={loadingAnalytics}
          />
          <StatCard
            title="Municípios Ativos"
            value={metrics.activeMunicipios}
            icon={MapPin}
            variant="success"
            isLoading={isLoading}
          />
        </div>
      )}

      {/* Stale Proposals Alert Panel */}
      <StaleProposalsAlertPanel
        proposals={(propostas || []).map(p => ({
          id: p.id,
          titulo: p.titulo,
          status: p.status,
          etapa: p.etapa,
          eixo_nome: (p.eixos_tematicos as any)?.nome,
          municipio_nome: (p.municipios as any)?.nome,
          updated_at: p.updated_at,
        }))}
        isLoading={loadingPropostas}
        onRefresh={refetchPropostas}
      />

      {/* Pie Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <AdminPieChart
          title="Status das Propostas"
          data={statusChartData}
        />
        <AdminPieChart
          title="Origem dos Leads"
          data={originChartData}
        />
        <AdminPieChart
          title="Etapa das Propostas"
          data={etapaChartData}
        />
      </div>

      {/* Timeline Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <StackedAreaChart
          title="Evolução Geral"
          data={timelineData}
          series={[
            { key: "Propostas", label: "Propostas", color: "hsl(var(--primary))" },
            { key: "Sugestões", label: "Sugestões", color: "hsl(142, 76%, 36%)" },
            { key: "Leads", label: "Leads", color: "hsl(38, 92%, 50%)" },
          ]}
          isLoading={isLoading}
        />
        <LeadsOriginChart data={leadsOriginTimeline} isLoading={loadingLeads} />
      </div>

      {/* Propostas e Sugestões por Eixo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <HorizontalBarChart
          title="Propostas Técnicas por Eixo"
          data={propostasPorEixo}
          isLoading={loadingEixos || loadingPropostas}
        />
        <HorizontalBarChart
          title="Sugestões Populares por Eixo"
          data={sugestoesPorEixo}
          isLoading={loadingEixos || loadingSugestoes}
        />
      </div>

      {/* Cadastros por Entrevistador */}
      <HorizontalBarChart
        title="Cadastros por Entrevistador/Líder"
        data={cadastrosPorEntrevistador}
        isLoading={loadingPropostas}
      />

      {/* Status das Propostas por Eixo */}
      <EixoStatusChart
        title="Status das Propostas por Eixo"
        data={statusPorEixo}
        isLoading={loadingEixos || loadingPropostas}
      />

      {/* Balanço de Governo por Eixo */}
      {(isAdmin || isLider) && (
        <GovernmentBalanceChart
          data={governmentBalanceData}
          isLoading={loadingAiDocuments || loadingEixos}
        />
      )}

      {/* Tabela Resumo por Eixo */}
      <EixoSummaryTable
        data={eixoSummary}
        isLoading={loadingEixos || loadingPropostas || loadingSugestoes}
      />

      {/* Painel de Análise de Propostas */}
      <ProposalAnalysisPanel
        proposals={(propostas || []).map(p => ({
          id: p.id,
          titulo: p.titulo,
          status: p.status,
          etapa: p.etapa,
          updated_at: p.updated_at,
          created_at: p.created_at,
          eixo_id: p.eixo_id,
          eixo_nome: (p.eixos_tematicos as any)?.nome,
          municipio_id: p.municipio_id || undefined,
          municipio_nome: (p.municipios as any)?.nome,
          autor_id: p.autor_id,
        }))}
        eixos={(eixos || []).map(e => ({ id: e.id, nome: e.nome }))}
        municipios={municipiosData || []}
        isLoading={loadingPropostas || loadingEixos || loadingMunicipios}
        onRefresh={refetchPropostas}
      />

      {/* Comparativo entre Eixos */}
      <EixoComparisonPanel
        eixosData={(eixos || []).map(eixo => {
          const eixoPropostas = propostas?.filter(p => p.eixo_id === eixo.id) || [];
          const eixoSugestoes = sugestoes?.filter(s => s.eixo === eixo.nome) || [];
          const now = new Date();
          const atrasadas = eixoPropostas.filter(p => {
            const hours = (now.getTime() - new Date(p.updated_at).getTime()) / (1000 * 60 * 60);
            return hours >= 48 && p.status !== 'aprovada';
          }).length;

          return {
            id: eixo.id,
            nome: eixo.nome,
            propostas: eixoPropostas.length,
            aprovadas: eixoPropostas.filter(p => p.status === 'aprovada').length,
            atrasadas,
            sugestoes: eixoSugestoes.length,
            rascunho: eixoPropostas.filter(p => p.status === 'rascunho').length,
            em_analise: eixoPropostas.filter(p => p.status === 'em_analise').length,
          };
        })}
        isLoading={loadingEixos || loadingPropostas || loadingSugestoes}
        selectedEixos={selectedEixosForComparison}
        onSelectionChange={setSelectedEixosForComparison}
      />

      {/* Mapa de Distribuição Geográfica */}
      <ParanaMap
        markers={(propostas || [])
          .filter(p => p.municipio_id)
          .filter(p => {
            // Filter by selected eixos if any are selected
            if (selectedEixosForComparison.length === 0) return true;
            return selectedEixosForComparison.includes(p.eixo_id);
          })
          .map(proposta => {
            const municipio = municipiosData?.find(m => m.id === proposta.municipio_id);
            if (!municipio?.latitude || !municipio?.longitude) return null;
            return {
              id: proposta.id,
              latitude: Number(municipio.latitude),
              longitude: Number(municipio.longitude),
              title: proposta.titulo,
              description: proposta.descricao?.substring(0, 100),
              status: proposta.status as string,
              eixo: (proposta.eixos_tematicos as any)?.nome,
              municipio: municipio.nome,
            };
          })
          .filter((m): m is NonNullable<typeof m> => m !== null)}
        title={
          selectedEixosForComparison.length > 0
            ? `Propostas dos Eixos Selecionados (${selectedEixosForComparison.length})`
            : "Distribuição Geográfica das Propostas"
        }
      />

      {/* Top Municípios */}
      <TopMunicipiosCard
        data={municipiosRanking}
        title="Top 10 Municípios"
        isLoading={isLoading}
      />

      {/* Recent Activity */}
      <RecentActivityFeed
        propostas={recentPropostas}
        sugestoes={recentSugestoes}
        leads={recentLeads}
        isLoading={isLoading}
      />

      {/* Device Analytics (Admin only) */}
      {isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-primary" />
                Mobile
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{metrics.deviceBreakdown.mobile}</p>
              <p className="text-sm text-muted-foreground">
                {analytics?.length ? ((metrics.deviceBreakdown.mobile / analytics.length) * 100).toFixed(1) : 0}% do total
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Monitor className="h-5 w-5 text-primary" />
                Desktop
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{metrics.deviceBreakdown.desktop}</p>
              <p className="text-sm text-muted-foreground">
                {analytics?.length ? ((metrics.deviceBreakdown.desktop / analytics.length) * 100).toFixed(1) : 0}% do total
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Tablet className="h-5 w-5 text-primary" />
                Tablet
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{metrics.deviceBreakdown.tablet}</p>
              <p className="text-sm text-muted-foreground">
                {analytics?.length ? ((metrics.deviceBreakdown.tablet / analytics.length) * 100).toFixed(1) : 0}% do total
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
