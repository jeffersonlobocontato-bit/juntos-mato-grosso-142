import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  LogOut, 
  FileText, 
  Users, 
  MapPin, 
  Target, 
  BarChart3,
  Shield,
  UserCheck,
  ArrowRight,
  Bell,
  Sparkles,
  Bot,
  BarChart2,
  Vote,
  ScrollText,
  ClipboardList,
  Building2,
  BookOpen,
  Zap,
  Network,
  Map,
  Layers,
  Brain,
  Radar,
  History

} from 'lucide-react';

const Admin = () => {
  const { user, roles, isLoading, signOut, isAdmin, hasRole } = useAuth();
  const navigate = useNavigate();
  
  const isAdminMaster = hasRole('admin_master');

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/auth');
    }
  }, [user, isLoading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin text-4xl">⏳</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const menuItems = [
    { 
      icon: BarChart3, 
      title: 'Meu Painel', 
      description: 'Dashboard personalizado por escopo',
      href: '/admin/meu-painel',
      color: 'primary',
      roles: ['admin', 'lider_tematico', 'curador_municipal', 'especialista']
    },
    { 
      icon: BarChart3, 
      title: 'Dashboard Público', 
      description: 'Visualize métricas agregadas',
      href: '/dashboard',
      color: 'secondary'
    },
    { 
      icon: FileText, 
      title: 'Propostas Técnicas', 
      description: 'Gerenciar propostas dos especialistas',
      href: '/admin/propostas',
      color: 'primary',
      roles: ['admin', 'lider_tematico', 'curador_municipal', 'especialista']
    },
    { 
      icon: ScrollText, 
      title: 'Propostas Políticas', 
      description: 'Propostas finais para plano de governo',
      href: '/admin/propostas-politicas',
      color: 'accent',
      roles: ['admin', 'admin_master']
    },
    { 
      icon: Building2, 
      title: 'Propostas Institucionais', 
      description: 'Propostas de associações e instituições',
      href: '/admin/propostas-institucionais',
      color: 'accent',
      roles: ['admin', 'admin_master', 'lider_tematico']
    },
    { 
      icon: Users, 
      title: 'Sugestões Populares', 
      description: 'Visualizar sugestões da população',
      href: '/admin/sugestoes',
      color: 'accent',
      roles: ['admin', 'curador_municipal']
    },
    { 
      icon: Target, 
      title: 'Eixos Temáticos', 
      description: 'Gerenciar os 5 eixos temáticos',
      href: '/admin/eixos',
      color: 'primary',
      roles: ['admin']
    },
    { 
      icon: MapPin, 
      title: 'Municípios', 
      description: 'Gerenciar os 142 municípios',
      href: '/admin/municipios',
      color: 'secondary',
      roles: ['admin']
    },
    { 
      icon: Shield, 
      title: 'Usuários', 
      description: 'Gerenciar usuários e permissões',
      href: '/admin/usuarios',
      color: 'accent',
      roles: ['admin']
    },
    { 
      icon: UserCheck, 
      title: 'Leads', 
      description: 'Gerenciar leads e suas origens',
      href: '/admin/leads',
      color: 'primary',
      roles: ['admin', 'lider_tematico', 'curador_municipal']
    },
    { 
      icon: Bell, 
      title: 'Mensageria', 
      description: 'Alertas e comunicação com membros',
      href: '/admin/mensageria',
      color: 'accent',
      roles: ['admin', 'lider_tematico']
    },
    { 
      icon: Sparkles, 
      title: 'Gerador de Plano', 
      description: 'IA para planos e brainstorming',
      href: '/admin/plano-governo',
      color: 'primary',
      roles: ['admin']
    },
    {
      icon: BookOpen,
      title: 'Conteúdo LP Metodologia',
      description: 'Galeria, destaques na mídia e capa do vídeo',
      href: '/admin/metodologia',
      color: 'secondary',
      roles: ['admin', 'admin_master']
    },
    {
      icon: BookOpen,
      title: 'Biblioteca de Documentos',
      description: 'Gerenciar documentos e vínculos com agentes/ferramentas',
      href: '/admin/biblioteca',
      color: 'secondary',
      roles: ['admin', 'admin_master', 'lider_tematico']
    },
    {
      icon: Sparkles,
      title: 'Gerador de Conteúdo',
      description: 'Pit, discurso, release e nota com IA para assessoria',
      href: '/admin/gerador-conteudo',
      color: 'accent',
      roles: ['admin', 'admin_master', 'lider_tematico']
    },
    { 
      icon: BarChart3, 
      title: 'Analytics LP', 
      description: 'Métricas de tráfego e navegação',
      href: '/admin/analytics',
      color: 'secondary',
      roles: ['admin']
    },
    {
      icon: Network,
      title: 'Painel de Cruzamento',
      description: 'Sugestões populares por região, tema e cidade em tempo real',
      href: '/admin/cruzamento-sugestoes',
      color: 'primary',
      roles: ['admin', 'admin_master', 'lider_tematico']
    },
    {
      icon: Sparkles,
      title: 'Módulo MKT — Expectativa dos mato-grossenses',
      description: 'Microanálise e insights de marketing a partir das sugestões populares',
      href: '/admin/modulo-mkt',
      color: 'accent',
      roles: ['admin', 'admin_master', 'lider_tematico', 'marketing']
    },
    { 
      icon: BarChart2, 
      title: 'Pesquisas Eleitorais', 
      description: 'Gerenciar pesquisas de institutos',
      href: '/admin/pesquisas',
      color: 'primary',
      roles: ['admin', 'admin_master']
    },
    { 
      icon: History, 
      title: 'Histórico Eleitoral', 
      description: 'Resultados históricos de eleições no estado',
      href: '/admin/tse',
      color: 'secondary',
      roles: ['admin', 'admin_master']
    },
    {
      icon: Map,
      title: 'Mapa Estratégico',
      description: 'Choropleth dos 142 municípios por associação política',
      href: '/admin/mapa-estrategico',
      color: 'secondary',
      roles: ['admin', 'admin_master']
    },
    {
      icon: Layers,
      title: 'Cruzamento Wellington',
      description: 'Cruzamento quali-quanti do candidato (acesso restrito)',
      href: '/admin/cruzamento-wellington',
      color: 'accent',
      roles: ['admin', 'admin_master']
    },
    {
      icon: ClipboardList,
      title: 'Base de Pesquisas',
      description: 'Pesquisas quantitativas de institutos com cenários e rejeição',
      href: '/admin/base-pesquisas',
      color: 'primary',
      roles: ['admin', 'admin_master']
    },
    {
      icon: Brain,
      title: 'Inteligência de Campanha',
      description: 'Análise e insights de comunicação a partir das pesquisas',
      href: '/admin/inteligencia',
      color: 'accent',
      roles: ['admin', 'admin_master']
    },
    {
      icon: Radar,
      title: 'Tracking Eleitoral',
      description: 'Rodadas de pesquisa de campo próprias e coleta em campo',
      href: '/admin/tracking',
      color: 'secondary',
      roles: ['admin', 'admin_master']
    },
  ];


  const filteredMenuItems = menuItems.filter(item => {
    const moduleKey = MODULE_KEY_BY_HREF[item.href];
    if (!canAccessModule(moduleKey)) return false;
    if (!item.roles) return true;
    return item.roles.some(role => roles.includes(role as any) || isAdmin);
  });

  return (
    <div className="idv-dash min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/" className="flex items-center gap-1">
                <span className="text-2xl font-display font-black text-primary">Juntos Mato Grosso</span>
                <span className="text-2xl font-display font-black text-accent">142</span>
              </Link>
              <span className="text-muted-foreground">|</span>
              <span className="text-sm font-medium text-muted-foreground">Painel de Gestão</span>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium">{user.email}</p>
                <p className="text-xs text-muted-foreground">
                  {roles.length > 0 ? roles.join(', ') : 'Sem permissões atribuídas'}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Link
            to="/admin/cadastro-rapido"
            className="group relative mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 overflow-hidden rounded-2xl border border-amber-400/40 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300 px-5 py-4 shadow-lg transition hover:shadow-xl hover:brightness-105"
          >
            <div className="flex items-center gap-3 text-primary-deep">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-deep text-amber-300 shadow-inner">
                <Zap className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-primary-deep/70">
                  Novo
                </p>
                <p className="font-display text-lg font-extrabold leading-tight text-primary-deep">
                  Cadastro Rápido
                </p>
                <p className="text-xs sm:text-sm text-primary-deep/80">
                  Fotografe ou envie documentos direto do celular e cadastre propostas em segundos.
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-deep px-4 py-2 text-xs font-bold uppercase tracking-wider text-amber-300 shadow-md transition group-hover:translate-x-0.5">
              Começar agora
              <ArrowRight className="h-4 w-4" />
            </span>
          </Link>

          <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-display font-bold mb-2">
                Bem-vindo ao Painel
              </h1>
              <p className="text-muted-foreground">
                Gerencie propostas, sugestões e acompanhe o progresso do Juntos Mato Grosso 142.
              </p>
            </div>
            {(hasRole('lider_tematico') || isAdminMaster || isAdmin) && (
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm" className="gap-1.5 whitespace-nowrap font-bold shadow-md text-xs">
                  <Link to="/entrevista">
                    <ClipboardList className="w-4 h-4" />
                    ENTREVISTA TÉCNICA
                  </Link>
                </Button>
                <Button asChild size="sm" variant="accent" className="gap-1.5 whitespace-nowrap font-bold shadow-md text-xs">
                  <Link to="/liderancas">
                    <Vote className="w-4 h-4" />
                    ENTREVISTA POLÍTICA
                  </Link>
                </Button>
                <Button asChild size="sm" variant="secondary" className="gap-1.5 whitespace-nowrap font-bold shadow-md text-xs">
                  <Link to="/">
                    <Users className="w-4 h-4" />
                    ENTREVISTA POPULAR
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline" className="gap-1.5 whitespace-nowrap font-bold shadow-md text-xs border-amber-500/50 text-amber-600 hover:bg-amber-500/10">
                  <Link to="/entrevista-institucional">
                    <Building2 className="w-4 h-4" />
                    ENTREVISTA INSTITUCIONAL
                  </Link>
                </Button>
              </div>
            )}
          </div>

          {roles.length === 0 && !isAdmin && (
            <Card className="mb-8 border-amber-500/50 bg-amber-500/10">
              <CardContent className="py-4">
                <p className="text-amber-600 dark:text-amber-400">
                  ⚠️ Sua conta ainda não possui permissões atribuídas. Entre em contato com um administrador para solicitar acesso.
                </p>
              </CardContent>
            </Card>
          )}


          {/* AI Hub CTA Banner - Exclusive for Admin Master */}
          {isAdminMaster && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="mb-8"
            >
              <Link to="/admin/ai-hub">
                <Card className="bg-gradient-to-r from-violet-600/20 via-purple-600/20 to-indigo-600/20 border-violet-500/30 hover:shadow-xl hover:shadow-violet-500/10 transition-all duration-300 hover:-translate-y-1 cursor-pointer group overflow-hidden relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-violet-600/5 to-indigo-600/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <CardContent className="py-8 flex items-center gap-6 relative z-10">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-violet-500/30">
                      <Bot className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-xl font-display font-bold text-foreground group-hover:text-violet-400 transition-colors">
                          HUB de IA
                        </h3>
                        <span className="px-2 py-0.5 bg-violet-500/20 rounded text-xs font-medium text-violet-300">
                          Novo
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Estratégias Políticas, Eleitorais e de MKT • Crie e gerencie agentes de IA personalizados
                      </p>
                    </div>
                    <ArrowRight className="w-6 h-6 text-violet-400 group-hover:translate-x-1 transition-transform hidden sm:block" />
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          )}

          {(isAdmin || isAdminMaster) && (
            <Link to="/admin/leads">
              <Card className="mb-8 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border-primary/20 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer group overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <CardContent className="py-6 flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <UserCheck className="w-7 h-7 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-display font-bold text-foreground group-hover:text-primary transition-colors">
                        Painel de Leads
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Acompanhe leads do formulário, chatbot e propostas técnicas
                      </p>
                    </div>
                  </div>
                  <Button variant="default" className="hidden sm:flex">
                    Acessar Painel
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            </Link>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMenuItems.map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Link to={item.href}>
                  <Card className="h-full hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer group">
                    <CardHeader>
                      <div className={`w-12 h-12 rounded-lg bg-${item.color}/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                        <item.icon className={`w-6 h-6 text-${item.color}`} />
                      </div>
                      <CardTitle className="group-hover:text-primary transition-colors">
                        {item.title}
                      </CardTitle>
                      <CardDescription>{item.description}</CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default Admin;
