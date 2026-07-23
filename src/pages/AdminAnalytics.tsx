import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AdminPieChart from '@/components/admin/AdminPieChart';
import { 
  ArrowLeft, 
  BarChart3, 
  Eye, 
  MousePointerClick, 
  MapPin, 
  Share2,
  Globe,
  TrendingUp,
  Users,
  Clock,
  Layers,
  RefreshCw,
  Calendar,
  Home,
  Target
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  Treemap,
  Rectangle,
} from 'recharts';

// Cores para os componentes no heatmap
const COMPONENT_COLORS: Record<string, string> = {
  'HeroSection': 'hsl(152, 60%, 35%)',
  'StatsSection': 'hsl(210, 100%, 45%)',
  'AboutSection': 'hsl(45, 100%, 50%)',
  'SocialEngagementSection': 'hsl(280, 60%, 50%)',
  'SuggestionForm': 'hsl(0, 70%, 50%)',
  'MapSection': 'hsl(180, 60%, 45%)',
  'Footer': 'hsl(30, 80%, 50%)',
  'ChatBot': 'hsl(330, 60%, 50%)',
  'FloatingShareButton': 'hsl(120, 50%, 45%)',
};

const CHANNEL_COLORS: Record<string, string> = {
  'direct': 'hsl(152, 60%, 35%)',
  'organic': 'hsl(210, 100%, 45%)',
  'social-whatsapp': 'hsl(142, 70%, 45%)',
  'social-facebook': 'hsl(221, 44%, 41%)',
  'social-instagram': 'hsl(326, 78%, 54%)',
  'social-twitter': 'hsl(203, 89%, 53%)',
  'social-linkedin': 'hsl(210, 80%, 40%)',
  'social-telegram': 'hsl(200, 80%, 50%)',
  'referral': 'hsl(45, 100%, 50%)',
};

type Period = '24h' | '7d' | '30d' | '90d' | 'all';

const AdminAnalytics = () => {
  const { user, isLoading: authLoading, isAdmin, roles } = useAuth();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<Period>('7d');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Calcular data de início baseado no período
  const getStartDate = () => {
    const now = new Date();
    switch (period) {
      case '24h': return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case '7d': return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d': return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case '90d': return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      default: return new Date('2024-01-01');
    }
  };

  // Query para buscar eventos
  const { data: events, isLoading, refetch } = useQuery({
    queryKey: ['analytics-events', period],
    queryFn: async () => {
      const startDate = getStartDate().toISOString();
      const PAGE_SIZE = 1000;
      const MAX_ROWS = 50000;
      type EventRow = Awaited<ReturnType<typeof supabase.from<'page_analytics_events'>['prototype']['select']>>['data'] extends (infer U)[] | null ? U : never;
      const all: NonNullable<Awaited<ReturnType<typeof supabase.from<any>>['select']>['data']> = [] as any;
      let from = 0;
      while (from < MAX_ROWS) {
        const to = Math.min(from + PAGE_SIZE, MAX_ROWS) - 1;
        const { data, error } = await supabase
          .from('page_analytics_events')
          .select('*')
          .gte('created_at', startDate)
          .order('created_at', { ascending: false })
          .range(from, to);
        if (error) throw error;
        const batch = data || [];
        all.push(...batch);
        if (batch.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
      }
      return all;
    },
    enabled: !!user && (isAdmin || roles.includes('lider_tematico')),
  });

  // Sugestões populares cadastradas no mesmo período (para taxa de conversão)
  const { data: sugestoesCount = 0 } = useQuery({
    queryKey: ['sugestoes-count', period],
    queryFn: async () => {
      const startDate = getStartDate().toISOString();
      const { count, error } = await supabase
        .from('sugestoes_populares')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startDate);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!user && (isAdmin || roles.includes('lider_tematico')),
  });

  // Cálculos de métricas
  const pageviews = events?.filter(e => e.event_type === 'pageview').length || 0;
  const uniqueVisitors = new Set(events?.map(e => e.visitor_id)).size;
  // Acessos exclusivos da Home (LP juntosparana399.com.br → path "/")
  const homeEvents = events?.filter(e => e.page_path === '/' || e.page_path === '') || [];
  const homePageviews = homeEvents.filter(e => e.event_type === 'pageview').length;
  const homeUniqueVisitors = new Set(homeEvents.map(e => e.visitor_id)).size;
  // Taxa de conversão: sugestões cadastradas / visitantes únicos da home
  const conversionRate = homeUniqueVisitors > 0
    ? (sugestoesCount / homeUniqueVisitors) * 100
    : 0;
  const conversionRateOverViews = homePageviews > 0
    ? (sugestoesCount / homePageviews) * 100
    : 0;
  const clicks = events?.filter(e => e.event_type === 'click').length || 0;
  const shares = events?.filter(e => e.event_type === 'share').length || 0;
  const avgTimeOnPage = events?.length 
    ? Math.round(events.reduce((sum, e) => sum + (e.time_on_page || 0), 0) / events.length)
    : 0;
  const avgScrollDepth = events?.length
    ? Math.round(events.reduce((sum, e) => sum + (e.scroll_depth || 0), 0) / events.length)
    : 0;

  // Dados por dispositivo
  const deviceData = events?.reduce((acc, e) => {
    const device = e.device_type || 'unknown';
    acc[device] = (acc[device] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const deviceChartData = Object.entries(deviceData).map(([name, value]) => ({
    name: name === 'mobile' ? 'Mobile' : name === 'tablet' ? 'Tablet' : 'Desktop',
    value,
    color: name === 'mobile' ? 'hsl(152, 60%, 35%)' : name === 'tablet' ? 'hsl(210, 100%, 45%)' : 'hsl(45, 100%, 50%)',
  }));

  // Dados por canal/origem
  const channelData = events?.reduce((acc, e) => {
    const metadata = e.metadata as Record<string, unknown> | null;
    const channel = (metadata?.channel as string) || 'direct';
    acc[channel] = (acc[channel] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const channelChartData = Object.entries(channelData)
    .map(([name, value]) => ({
      name: name.replace('social-', '').charAt(0).toUpperCase() + name.replace('social-', '').slice(1),
      value,
      color: CHANNEL_COLORS[name] || 'hsl(var(--muted-foreground))',
    }))
    .sort((a, b) => b.value - a.value);

  // Dados por cidade
  const cityData = events?.reduce((acc, e) => {
    const city = e.city || 'Não identificado';
    acc[city] = (acc[city] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const cityChartData = Object.entries(cityData)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 15);

  // Dados por componente (heatmap)
  const componentData = events?.reduce((acc, e) => {
    if (e.component_name) {
      if (!acc[e.component_name]) {
        acc[e.component_name] = { views: 0, clicks: 0 };
      }
      if (e.event_type === 'component_view') {
        acc[e.component_name].views++;
      }
      if (e.event_type === 'click') {
        acc[e.component_name].clicks++;
      }
    }
    return acc;
  }, {} as Record<string, { views: number; clicks: number }>) || {};

  const componentChartData = Object.entries(componentData)
    .map(([name, data]) => ({
      name: name.replace('Section', ''),
      views: data.views,
      clicks: data.clicks,
      total: data.views + data.clicks,
      color: COMPONENT_COLORS[name] || 'hsl(var(--primary))',
    }))
    .sort((a, b) => b.total - a.total);

  // Dados para treemap (mapa de calor)
  const treemapData = componentChartData.map(item => ({
    name: item.name,
    size: item.total,
    fill: item.color,
  }));

  // Dados de timeline para gráfico de evolução
  const timelineData = events?.reduce((acc, e) => {
    const date = new Date(e.created_at).toISOString().split('T')[0];
    if (!acc[date]) {
      acc[date] = { pageviews: 0, clicks: 0, shares: 0 };
    }
    if (e.event_type === 'pageview') acc[date].pageviews++;
    if (e.event_type === 'click') acc[date].clicks++;
    if (e.event_type === 'share') acc[date].shares++;
    return acc;
  }, {} as Record<string, { pageviews: number; clicks: number; shares: number }>) || {};

  // Dados de timeline formatados para gráfico de linhas
  const lineChartData = Object.entries(timelineData)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({
      name: new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      pageviews: data.pageviews,
      clicks: data.clicks,
      shares: data.shares,
    }));

  // Dados por browser
  const browserData = events?.reduce((acc, e) => {
    const browser = e.browser || 'Outro';
    acc[browser] = (acc[browser] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const browserChartData = Object.entries(browserData)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // Dados por UTM Source
  const utmSourceData = events?.reduce((acc, e) => {
    const source = e.utm_source || 'Orgânico';
    acc[source] = (acc[source] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const utmSourceChartData = Object.entries(utmSourceData)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin text-4xl">⏳</div>
      </div>
    );
  }

  if (!user || (!isAdmin && !roles.includes('lider_tematico'))) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="p-8">
          <p className="text-muted-foreground">Acesso não autorizado</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/admin">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar
                </Button>
              </Link>
              <span className="text-muted-foreground">|</span>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                <span className="font-display font-bold">Analytics da LP</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">Últimas 24h</SelectItem>
                  <SelectItem value="7d">Últimos 7 dias</SelectItem>
                  <SelectItem value="30d">Últimos 30 dias</SelectItem>
                  <SelectItem value="90d">Últimos 90 dias</SelectItem>
                  <SelectItem value="all">Todo período</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Atualizar
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin text-4xl">⏳</div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
              <Card className="col-span-2 md:col-span-3 lg:col-span-6 border-primary/40 bg-gradient-to-br from-primary/10 via-background to-secondary/10">
                <CardContent className="pt-6">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-primary/15">
                        <Home className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
                          Acessos da LP Home
                        </p>
                        <a
                          href="https://juntosparana399.com.br"
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm text-primary hover:underline"
                        >
                          juntosparana399.com.br
                        </a>
                      </div>
                    </div>
                    <div className="flex items-center gap-8">
                      <div>
                        <p className="text-3xl font-bold">{homePageviews.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">Visualizações da Home</p>
                      </div>
                      <div>
                        <p className="text-3xl font-bold">{homeUniqueVisitors.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">Visitantes Únicos</p>
                      </div>
                      <div className="hidden md:block">
                        <p className="text-3xl font-bold">
                          {homePageviews > 0 && homeUniqueVisitors > 0
                            ? (homePageviews / homeUniqueVisitors).toFixed(1)
                            : '0'}
                        </p>
                        <p className="text-xs text-muted-foreground">Views por Visitante</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Card de Taxa de Conversão: Visualizações LP × Sugestões Populares */}
              <Card className="col-span-2 md:col-span-3 lg:col-span-6 border-accent/40 bg-gradient-to-br from-accent/10 via-background to-primary/10">
                <CardContent className="pt-6">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-accent/15">
                        <Target className="w-6 h-6 text-accent" />
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
                          Taxa de Conversão da LP
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Visitantes da Home que enviaram sugestão popular
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-8 flex-wrap">
                      <div>
                        <p className="text-3xl font-bold">{homePageviews.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">Visualizações LP</p>
                      </div>
                      <div>
                        <p className="text-3xl font-bold">{homeUniqueVisitors.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">Visitantes Únicos</p>
                      </div>
                      <div>
                        <p className="text-3xl font-bold">{sugestoesCount.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">Sugestões Cadastradas</p>
                      </div>
                      <div>
                        <p className="text-3xl font-bold text-accent">
                          {conversionRate.toFixed(2)}%
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Conversão / Visitante
                        </p>
                      </div>
                      <div className="hidden md:block">
                        <p className="text-3xl font-bold text-primary">
                          {conversionRateOverViews.toFixed(2)}%
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Conversão / Visualização
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Eye className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{pageviews.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Visualizações</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-secondary/10">
                      <Users className="w-5 h-5 text-secondary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{uniqueVisitors.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Visitantes Únicos</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-accent/10">
                      <MousePointerClick className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{clicks.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Cliques</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Share2 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{shares.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Compartilhamentos</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-secondary/10">
                      <Clock className="w-5 h-5 text-secondary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{avgTimeOnPage}s</p>
                      <p className="text-xs text-muted-foreground">Tempo Médio</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-accent/10">
                      <TrendingUp className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{avgScrollDepth}%</p>
                      <p className="text-xs text-muted-foreground">Scroll Médio</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
                <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                <TabsTrigger value="channels">Canais</TabsTrigger>
                <TabsTrigger value="geography">Geografia</TabsTrigger>
                <TabsTrigger value="heatmap">Mapa de Calor</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-primary" />
                      Evolução de Engajamento
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={lineChartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                            }}
                          />
                          <Legend />
                          <Line 
                            type="monotone" 
                            dataKey="pageviews" 
                            name="Visualizações" 
                            stroke="hsl(152, 60%, 35%)" 
                            strokeWidth={2}
                            dot={{ r: 3 }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="clicks" 
                            name="Cliques" 
                            stroke="hsl(210, 100%, 45%)" 
                            strokeWidth={2}
                            dot={{ r: 3 }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="shares" 
                            name="Compartilhamentos" 
                            stroke="hsl(45, 100%, 50%)" 
                            strokeWidth={2}
                            dot={{ r: 3 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <AdminPieChart 
                    title="Dispositivos"
                    data={deviceChartData}
                  />
                  <AdminPieChart 
                    title="Canais de Origem"
                    data={channelChartData.slice(0, 6)}
                  />
                  <AdminPieChart 
                    title="Navegadores"
                    data={browserChartData.slice(0, 6).map((d, i) => ({
                      ...d,
                      color: ['hsl(152, 60%, 35%)', 'hsl(210, 100%, 45%)', 'hsl(45, 100%, 50%)', 'hsl(0, 70%, 50%)', 'hsl(280, 60%, 50%)', 'hsl(180, 60%, 45%)'][i],
                    }))}
                  />
                </div>
              </TabsContent>

              {/* Channels Tab */}
              <TabsContent value="channels" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Globe className="w-5 h-5 text-primary" />
                        Canais de Tráfego
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={channelChartData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                            <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} width={100} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px',
                              }}
                            />
                            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                              {channelChartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-secondary" />
                        UTM Sources
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={utmSourceChartData.slice(0, 10)} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                            <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} width={100} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px',
                              }}
                            />
                            <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Geography Tab */}
              <TabsContent value="geography" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-primary" />
                      Top 15 Cidades
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[500px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={cityChartData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                          <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} width={150} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                            }}
                          />
                          <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Heatmap Tab */}
              <TabsContent value="heatmap" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Layers className="w-5 h-5 text-primary" />
                        Mapa de Calor - Componentes
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[400px]">
                        {treemapData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <Treemap
                              data={treemapData}
                              dataKey="size"
                              aspectRatio={4 / 3}
                              stroke="hsl(var(--background))"
                              content={<Rectangle />}
                            >
                              {treemapData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                              ))}
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: 'hsl(var(--card))',
                                  border: '1px solid hsl(var(--border))',
                                  borderRadius: '8px',
                                }}
                              />
                            </Treemap>
                          </ResponsiveContainer>
                        ) : (
                          <div className="flex items-center justify-center h-full text-muted-foreground">
                            Sem dados de componentes
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MousePointerClick className="w-5 h-5 text-secondary" />
                        Interações por Componente
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={componentChartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} angle={-45} textAnchor="end" height={80} />
                            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px',
                              }}
                            />
                            <Bar dataKey="views" name="Visualizações" fill="hsl(152, 60%, 35%)" stackId="a" />
                            <Bar dataKey="clicks" name="Cliques" fill="hsl(210, 100%, 45%)" stackId="a" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Lista detalhada de componentes */}
                <Card>
                  <CardHeader>
                    <CardTitle>Detalhamento por Componente</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {componentChartData.map((component, index) => (
                        <div 
                          key={component.name}
                          className="flex items-center gap-4 p-4 rounded-lg bg-muted/50"
                        >
                          <div 
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: component.color }}
                          />
                          <div className="flex-1">
                            <p className="font-medium">{component.name}</p>
                            <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                              <span>{component.views} visualizações</span>
                              <span>{component.clicks} cliques</span>
                              <span>
                                {component.views > 0 
                                  ? `${((component.clicks / component.views) * 100).toFixed(1)}% CTR`
                                  : '0% CTR'
                                }
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold">{component.total}</p>
                            <p className="text-xs text-muted-foreground">total</p>
                          </div>
                        </div>
                      ))}
                      {componentChartData.length === 0 && (
                        <p className="text-center text-muted-foreground py-8">
                          Nenhuma interação registrada ainda
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </motion.div>
        )}
      </main>
    </div>
  );
};

export default AdminAnalytics;
