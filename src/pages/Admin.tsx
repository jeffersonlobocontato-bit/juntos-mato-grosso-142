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
  ScrollText
} from 'lucide-react';

const Admin = () => {
  const { user, roles, isLoading, signOut, isAdmin, hasRole } = useAuth();
  const navigate = useNavigate();
  
  const isAdminMaster = hasRole('admin_master');

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/auth');
    }
    // Redirect lider_tematico (without admin roles) to /entrevista
    if (!isLoading && user && !isAdmin && !isAdminMaster && hasRole('lider_tematico')) {
      navigate('/entrevista');
    }
  }, [user, isLoading, navigate, isAdmin, isAdminMaster, roles]);

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
      roles: ['admin', 'admin_master', 'lider_tematico']
    },
    { 
      icon: Users, 
      title: 'Sugestões Populares', 
      description: 'Visualizar sugestões da população',
      href: '/admin/sugestoes',
      color: 'accent',
      roles: ['admin', 'lider_tematico', 'curador_municipal']
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
      description: 'Gerenciar os 399 municípios',
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
      roles: ['admin', 'lider_tematico']
    },
    { 
      icon: BarChart3, 
      title: 'Analytics LP', 
      description: 'Métricas de tráfego e navegação',
      href: '/admin/analytics',
      color: 'secondary',
      roles: ['admin', 'lider_tematico']
    },
    { 
      icon: BarChart2, 
      title: 'Pesquisas Eleitorais', 
      description: 'Gerenciar pesquisas de institutos',
      href: '/admin/pesquisas',
      color: 'primary',
      roles: ['admin', 'admin_master', 'lider_tematico']
    },
    { 
      icon: Vote, 
      title: 'Dados TSE', 
      description: 'Histórico eleitoral e mapas de votos',
      href: '/admin/tse',
      color: 'accent',
      roles: ['admin', 'admin_master', 'lider_tematico']
    },
  ];

  const filteredMenuItems = menuItems.filter(item => {
    if (!item.roles) return true;
    return item.roles.some(role => roles.includes(role as any) || isAdmin);
  });

  return (
    <div className="min-h-screen bg-muted/20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/" className="flex items-center gap-1">
                <span className="text-2xl font-display font-black text-primary">Juntos Paraná</span>
                <span className="text-2xl font-display font-black text-accent">399</span>
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
          <div className="mb-8">
            <h1 className="text-3xl font-display font-bold mb-2">
              Bem-vindo ao Painel
            </h1>
            <p className="text-muted-foreground">
              Gerencie propostas, sugestões e acompanhe o progresso do Juntos Paraná 399.
            </p>
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

          {(isAdmin || roles.includes('lider_tematico') || roles.includes('curador_municipal')) && (
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
