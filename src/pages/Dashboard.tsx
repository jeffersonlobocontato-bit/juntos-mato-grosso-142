import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  MapPin, 
  FileText, 
  Users, 
  Target, 
  TrendingUp, 
  Filter,
  BarChart3,
  PieChart,
  ArrowLeft,
  Download,
  Calendar,
  LayoutDashboard,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";
import PublicParanaHeatmap from "@/components/dashboard/PublicParanaHeatmap";
import { format, subMonths, eachMonthOfInterval, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

const sectionItems = [
  { id: "stats", title: "Visão Geral", icon: LayoutDashboard },
  { id: "timeline", title: "Evolução Temporal", icon: Calendar },
  { id: "status", title: "Status das Propostas", icon: PieChart },
  { id: "heatmap", title: "Mapa de Calor", icon: MapPin },
  { id: "eixos", title: "Distribuição por Eixo", icon: BarChart3 },
  { id: "municipios", title: "Top Municípios", icon: TrendingUp },
];

function DashboardSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const headerOffset = 80;
      const top = el.getBoundingClientRect().top + window.scrollY - headerOffset;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border bg-card">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegação</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {sectionItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    tooltip={collapsed ? item.title : undefined}
                    onClick={() => scrollTo(item.id)}
                    className="cursor-pointer"
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{item.title}</span>
                    <ChevronRight className="ml-auto h-3.5 w-3.5 opacity-50" />
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <Separator />
        <SidebarGroup>
          <SidebarGroupLabel>Ações</SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="px-2 py-2 space-y-2">
              <Button asChild size="sm" className="w-full justify-start gap-2">
                <Link to="/">
                  <ArrowLeft className="h-4 w-4" />
                  {!collapsed && <span>Voltar ao site</span>}
                </Link>
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start gap-2">
                <Download className="h-4 w-4" />
                {!collapsed && <span>Exportar</span>}
              </Button>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

const Dashboard = () => {
  const [selectedEixo, setSelectedEixo] = useState("todos");
  const [selectedPeriodo, setSelectedPeriodo] = useState("12m");

  // Fetch eixos
  const { data: eixos } = useQuery({
    queryKey: ["dashboard-eixos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("eixos_tematicos").select("id, nome, ordem").order("ordem");
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch propostas
  const { data: propostas, isLoading: loadingPropostas } = useQuery({
    queryKey: ["dashboard-propostas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("propostas_tecnicas").select("id, eixo_id, status, created_at");
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch sugestões
  const { data: sugestoes, isLoading: loadingSugestoes } = useQuery({
    queryKey: ["dashboard-sugestoes"],
    queryFn: async () => {
      const PAGE_SIZE = 1000;
      const MAX_ROWS = 100000;
      const all: Array<{ id: string; eixo: string | null; municipio: string | null; created_at: string }> = [];
      let from = 0;
      while (from < MAX_ROWS) {
        const to = Math.min(from + PAGE_SIZE, MAX_ROWS) - 1;
        const { data, error } = await supabase
          .from("sugestoes_populares")
          .select("id, eixo, municipio, created_at")
          .order("created_at", { ascending: false })
          .range(from, to);
        if (error) throw error;
        const batch = (data as any[]) || [];
        all.push(...(batch as any));
        if (batch.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
      }
      return all;
    },
  });

  const isLoading = loadingPropostas || loadingSugestoes;

  // Period filter
  const periodMonths = selectedPeriodo === "3m" ? 3 : selectedPeriodo === "6m" ? 6 : 12;
  const periodStart = subMonths(new Date(), periodMonths);

  // Filtered data
  const filteredPropostas = useMemo(() => {
    let items = propostas || [];
    if (selectedEixo !== "todos" && eixos) {
      const eixo = eixos.find(e => e.id === selectedEixo);
      if (eixo) items = items.filter(p => p.eixo_id === eixo.id);
    }
    return items.filter(p => new Date(p.created_at) >= periodStart);
  }, [propostas, selectedEixo, eixos, periodStart]);

  const filteredSugestoes = useMemo(() => {
    let items = sugestoes || [];
    if (selectedEixo !== "todos" && eixos) {
      const eixo = eixos.find(e => e.id === selectedEixo);
      if (eixo) items = items.filter(s => s.eixo === eixo.nome);
    }
    return items.filter(s => new Date(s.created_at) >= periodStart);
  }, [sugestoes, selectedEixo, eixos, periodStart]);

  // Stats
  const activeMunicipios = useMemo(() => {
    const muniSet = new Set<string>();
    (propostas || []).forEach(p => p.eixo_id && muniSet.add(p.eixo_id)); // placeholder
    (sugestoes || []).forEach(s => s.municipio && muniSet.add(s.municipio));
    return muniSet.size;
  }, [propostas, sugestoes]);

  const stats = [
    { icon: FileText, value: filteredPropostas.length.toLocaleString("pt-BR"), label: "Propostas Técnicas", color: "primary" },
    { icon: Users, value: filteredSugestoes.length.toLocaleString("pt-BR"), label: "Sugestões Populares", color: "secondary" },
    { icon: MapPin, value: String(activeMunicipios), label: "Municípios Ativos", sublabel: "/142", color: "accent" },
    { icon: Target, value: String(eixos?.length || 5), label: "Eixos Temáticos", color: "primary" },
  ];

  // Status pie
  const statusData = useMemo(() => [
    { name: "Rascunho", value: filteredPropostas.filter(p => p.status === "rascunho").length, color: "hsl(var(--muted-foreground))" },
    { name: "Em Análise", value: filteredPropostas.filter(p => p.status === "em_analise").length, color: "hsl(var(--primary))" },
    { name: "Aprovada", value: filteredPropostas.filter(p => p.status === "aprovada").length, color: "hsl(var(--accent))" },
  ], [filteredPropostas]);

  // Timeline
  const timelineData = useMemo(() => {
    const now = new Date();
    const intervals = eachMonthOfInterval({ start: periodStart, end: now });
    return intervals.map(date => {
      const monthStart = startOfMonth(date);
      const monthEnd = startOfMonth(subMonths(date, -1));
      return {
        month: format(date, "MMM", { locale: ptBR }),
        propostas: filteredPropostas.filter(p => {
          const d = new Date(p.created_at);
          return d >= monthStart && d < monthEnd;
        }).length,
        sugestoes: filteredSugestoes.filter(s => {
          const d = new Date(s.created_at);
          return d >= monthStart && d < monthEnd;
        }).length,
      };
    });
  }, [filteredPropostas, filteredSugestoes, periodStart]);

  // By eixo
  const proposalsByEixo = useMemo(() => {
    if (!eixos) return [];
    return eixos.map(e => ({
      name: e.nome.length > 15 ? e.nome.substring(0, 15) + "..." : e.nome,
      propostas: (propostas || []).filter(p => p.eixo_id === e.id).length,
      sugestoes: (sugestoes || []).filter(s => s.eixo === e.nome).length,
    }));
  }, [eixos, propostas, sugestoes]);

  // Top municipalities
  const topMunicipios = useMemo(() => {
    const countMap: Record<string, number> = {};
    (sugestoes || []).forEach(s => {
      if (s.municipio) countMap[s.municipio] = (countMap[s.municipio] || 0) + 1;
    });
    const sorted = Object.entries(countMap)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
    const max = sorted[0]?.total || 1;
    return sorted.map(m => ({ ...m, percent: (m.total / max) * 100 }));
  }, [sugestoes]);

  return (
    <div className="min-h-screen bg-muted/20">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link to="/">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Voltar
                </Button>
              </Link>
              <div className="h-6 w-px bg-border" />
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-primary-foreground" />
                </div>
                <h1 className="font-display font-bold text-lg text-foreground">Dashboard Público</h1>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Select value={selectedEixo} onValueChange={setSelectedEixo}>
                <SelectTrigger className="w-[180px] h-9">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Eixo Temático" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Eixos</SelectItem>
                  {eixos?.map(e => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.nome.length > 25 ? e.nome.substring(0, 25) + "..." : e.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="w-4 h-4" />
                Exportar
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              <Card variant="stat" className="h-full">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-12 h-12 rounded-xl ${
                      stat.color === "primary" ? "bg-primary/10" : 
                      stat.color === "secondary" ? "bg-secondary/10" : 
                      "bg-accent/10"
                    } flex items-center justify-center`}>
                      <stat.icon className={`w-6 h-6 ${
                        stat.color === "primary" ? "text-primary" : 
                        stat.color === "secondary" ? "text-secondary" : 
                        "text-accent"
                      }`} />
                    </div>
                  </div>
                  {isLoading ? (
                    <Skeleton className="h-9 w-20 mb-1" />
                  ) : (
                    <div className="font-display text-3xl font-bold text-foreground mb-1">
                      {stat.value}
                      {stat.sublabel && <span className="text-muted-foreground text-lg">{stat.sublabel}</span>}
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Charts Row 1 */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* Timeline Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="lg:col-span-2"
          >
            <Card variant="default" className="h-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    Evolução ao Longo do Tempo
                  </CardTitle>
                  <Select value={selectedPeriodo} onValueChange={setSelectedPeriodo}>
                    <SelectTrigger className="w-[140px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="12m">Último ano</SelectItem>
                      <SelectItem value="6m">6 meses</SelectItem>
                      <SelectItem value="3m">3 meses</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={timelineData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="propostas" name="Propostas Técnicas" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: "hsl(var(--primary))", strokeWidth: 2 }} />
                      <Line type="monotone" dataKey="sugestoes" name="Sugestões Populares" stroke="hsl(var(--secondary))" strokeWidth={2} dot={{ fill: "hsl(var(--secondary))", strokeWidth: 2 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Status Pie Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.5 }}
          >
            <Card variant="default" className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-secondary" />
                  Status das Propostas
                </CardTitle>
              </CardHeader>
              <CardContent>
                {filteredPropostas.length > 0 ? (
                  <>
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPieChart>
                          <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                            {statusData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-4">
                      {statusData.map((item) => (
                        <div key={item.name} className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-xs text-muted-foreground">{item.name}</span>
                          <span className="text-xs font-medium text-foreground ml-auto">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
                    Nenhuma proposta registrada ainda
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Heatmap Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.8 }}
          className="mb-8"
        >
          <PublicParanaHeatmap />
        </motion.div>

        {/* Charts Row 2 */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Bar Chart by Eixo */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.6 }}
            className="lg:col-span-2"
          >
            <Card variant="default">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  Distribuição por Eixo Temático
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  {proposalsByEixo.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={proposalsByEixo} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                        <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={11} width={120} />
                        <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                        <Legend />
                        <Bar dataKey="propostas" name="Propostas" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                        <Bar dataKey="sugestoes" name="Sugestões" fill="hsl(var(--secondary))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                      Nenhum dado disponível
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Top Municipalities */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.7 }}
          >
            <Card variant="default" className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-accent" />
                  Top Municípios
                </CardTitle>
              </CardHeader>
              <CardContent>
                {topMunicipios.length > 0 ? (
                  <div className="space-y-4">
                    {topMunicipios.map((mun, index) => (
                      <div key={mun.name} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                              {index + 1}
                            </span>
                            <span className="font-medium text-foreground">{mun.name}</span>
                          </div>
                          <span className="text-sm text-muted-foreground">{mun.total}</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all"
                            style={{ width: `${mun.percent}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
                    Nenhum município com registros ainda
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
