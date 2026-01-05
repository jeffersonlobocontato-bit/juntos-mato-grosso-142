import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useUserAccess } from '@/hooks/useUserAccess';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import AdminPieChart from '@/components/admin/AdminPieChart';
import TimelineChart from '@/components/admin/TimelineChart';
import { 
  ArrowLeft, 
  FileText, 
  Users, 
  Target,
  MapPin,
  BarChart3,
  ExternalLink,
  Eye
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Proposal {
  id: string;
  titulo: string;
  descricao: string;
  status: string;
  created_at: string;
  eixo_id: string;
  municipio_id: string | null;
  autor_id: string;
}

interface Sugestao {
  id: string;
  descricao: string;
  eixo: string;
  municipio: string;
  created_at: string;
}

interface Lead {
  id: string;
  nome: string | null;
  email: string | null;
  municipio: string | null;
  origem: string;
  created_at: string;
}

interface Eixo {
  id: string;
  nome: string;
}

interface Municipio {
  id: string;
  nome: string;
}

const statusColors: Record<string, string> = {
  rascunho: 'bg-muted text-muted-foreground',
  validada: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  consolidada: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  aprovada: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
};

const statusLabels: Record<string, string> = {
  rascunho: 'Rascunho',
  validada: 'Validada',
  consolidada: 'Consolidada',
  aprovada: 'Aprovada',
};

const AdminMeuPainel = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { 
    isLoading: accessLoading, 
    userEixos, 
    userMunicipios, 
    getAccessType, 
    getEixoIds,
    getMunicipioIds,
    isAdmin,
    isAdminMaster,
    isLiderTematico,
    isCuradorMunicipal,
    isEspecialista,
    userId
  } = useUserAccess();
  const navigate = useNavigate();

  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [sugestoes, setSugestoes] = useState<Sugestao[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [eixos, setEixos] = useState<Eixo[]>([]);
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const accessType = getAccessType();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && !accessLoading) {
      fetchData();
    }
  }, [user, accessLoading, userEixos, userMunicipios]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch eixos and municipios for reference
      const [eixosRes, municipiosRes] = await Promise.all([
        supabase.from('eixos_tematicos').select('id, nome'),
        supabase.from('municipios').select('id, nome')
      ]);
      
      if (eixosRes.data) setEixos(eixosRes.data);
      if (municipiosRes.data) setMunicipios(municipiosRes.data);

      // Build filtered queries based on access type
      let proposalsQuery = supabase.from('propostas_tecnicas').select('*').order('created_at', { ascending: false });
      let sugestoesQuery = supabase.from('sugestoes_populares').select('*').order('created_at', { ascending: false });
      let leadsQuery = supabase.from('leads').select('*').order('created_at', { ascending: false });

      // Apply filters based on access type
      if (accessType === 'eixo') {
        const eixoIds = getEixoIds();
        const eixoNomes = userEixos.map(e => e.eixo_nome).filter(Boolean);
        
        proposalsQuery = proposalsQuery.in('eixo_id', eixoIds);
        if (eixoNomes.length > 0) {
          sugestoesQuery = sugestoesQuery.in('eixo', eixoNomes);
        }
      } else if (accessType === 'municipio') {
        const municipioIds = getMunicipioIds();
        const municipioNomes = userMunicipios.map(m => m.municipio_nome).filter(Boolean);
        
        proposalsQuery = proposalsQuery.in('municipio_id', municipioIds);
        if (municipioNomes.length > 0) {
          sugestoesQuery = sugestoesQuery.in('municipio', municipioNomes);
          leadsQuery = leadsQuery.in('municipio', municipioNomes);
        }
      } else if (accessType === 'own') {
        proposalsQuery = proposalsQuery.eq('autor_id', userId!);
        // Especialistas não veem sugestões ou leads
        setSugestoes([]);
        setLeads([]);
      }

      // Execute queries
      const [proposalsRes, sugestoesRes, leadsRes] = await Promise.all([
        proposalsQuery.limit(100),
        accessType !== 'own' ? sugestoesQuery.limit(100) : Promise.resolve({ data: [] }),
        accessType !== 'own' ? leadsQuery.limit(100) : Promise.resolve({ data: [] }),
      ]);

      setProposals(proposalsRes.data || []);
      if (accessType !== 'own') {
        setSugestoes(sugestoesRes.data || []);
        setLeads(leadsRes.data || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getEixoNome = (eixoId: string) => eixos.find(e => e.id === eixoId)?.nome || 'N/A';
  const getMunicipioNome = (municipioId: string | null) => 
    municipioId ? municipios.find(m => m.id === municipioId)?.nome || 'N/A' : 'N/A';

  const getAccessLabel = () => {
    switch (accessType) {
      case 'full': return 'Acesso Completo';
      case 'eixo': return `Eixos: ${userEixos.map(e => e.eixo_nome).join(', ')}`;
      case 'municipio': return `Municípios: ${userMunicipios.map(m => m.municipio_nome).join(', ')}`;
      case 'own': return 'Minhas Contribuições';
      default: return 'Dashboard Público';
    }
  };

  // Calculate stats
  const totalPropostas = proposals.length;
  const totalSugestoes = sugestoes.length;
  const totalLeads = leads.length;

  const propostasByStatus = proposals.reduce((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const statusChartData = Object.entries(propostasByStatus).map(([status, count], i) => ({
    name: statusLabels[status] || status,
    value: count,
    color: ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(280 65% 60%)', 'hsl(142 76% 36%)'][i % 4],
  }));

  if (authLoading || accessLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin text-4xl">⏳</div>
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
              <Link to="/admin" className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-xl font-display font-bold">Meu Painel</h1>
                <p className="text-sm text-muted-foreground">{getAccessLabel()}</p>
              </div>
            </div>
            <Link to="/dashboard">
              <Button variant="outline" size="sm">
                <ExternalLink className="w-4 h-4 mr-2" />
                Dashboard Público
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Access Info Card */}
          <Card className="mb-8 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border-primary/20">
            <CardContent className="py-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Eye className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Seu Nível de Acesso</p>
                  <p className="text-sm text-muted-foreground">{getAccessLabel()}</p>
                </div>
                {accessType === 'eixo' && (
                  <div className="ml-auto flex gap-2 flex-wrap">
                    {userEixos.map(e => (
                      <Badge key={e.eixo_id} variant="secondary">{e.eixo_nome}</Badge>
                    ))}
                  </div>
                )}
                {accessType === 'municipio' && (
                  <div className="ml-auto flex gap-2 flex-wrap">
                    {userMunicipios.map(m => (
                      <Badge key={m.municipio_id} variant="secondary">{m.municipio_nome}</Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {accessType === 'own' ? 'Minhas Propostas' : 'Propostas'}
                    </p>
                    <p className="text-2xl font-bold">{totalPropostas}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {accessType !== 'own' && (
              <>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center">
                        <Users className="w-6 h-6 text-accent-foreground" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Sugestões</p>
                        <p className="text-2xl font-bold">{totalSugestoes}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-secondary/10 flex items-center justify-center">
                        <Target className="w-6 h-6 text-secondary-foreground" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Leads</p>
                        <p className="text-2xl font-bold">{totalLeads}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* Charts */}
          {statusChartData.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <AdminPieChart title="Propostas por Status" data={statusChartData} />
              <TimelineChart
                title="Evolução de Propostas"
                series={[{
                  key: 'propostas',
                  label: 'Propostas',
                  color: 'hsl(var(--primary))',
                  data: proposals,
                }]}
              />
            </div>
          )}

          {/* Proposals Table */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                {accessType === 'own' ? 'Minhas Propostas' : 'Propostas Recentes'}
              </CardTitle>
              <CardDescription>
                {accessType === 'own' 
                  ? 'Propostas que você criou'
                  : 'Últimas propostas do seu escopo de acesso'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {proposals.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma proposta encontrada
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Título</TableHead>
                      <TableHead>Eixo</TableHead>
                      <TableHead>Município</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {proposals.slice(0, 10).map((proposal) => (
                      <TableRow key={proposal.id}>
                        <TableCell className="font-medium max-w-xs truncate">
                          {proposal.titulo}
                        </TableCell>
                        <TableCell>{getEixoNome(proposal.eixo_id)}</TableCell>
                        <TableCell>{getMunicipioNome(proposal.municipio_id)}</TableCell>
                        <TableCell>
                          <Badge className={statusColors[proposal.status]}>
                            {statusLabels[proposal.status] || proposal.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(proposal.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              {proposals.length > 10 && (
                <div className="mt-4 text-center">
                  <Link to="/admin/propostas">
                    <Button variant="outline">
                      Ver todas as propostas
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sugestões Table - Only for non-especialista */}
          {accessType !== 'own' && sugestoes.length > 0 && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Sugestões Recentes
                </CardTitle>
                <CardDescription>
                  Sugestões populares do seu escopo de acesso
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Eixo</TableHead>
                      <TableHead>Município</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sugestoes.slice(0, 5).map((sugestao) => (
                      <TableRow key={sugestao.id}>
                        <TableCell className="font-medium max-w-md truncate">
                          {sugestao.descricao}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{sugestao.eixo}</Badge>
                        </TableCell>
                        <TableCell>{sugestao.municipio}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(sugestao.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {sugestoes.length > 5 && (
                  <div className="mt-4 text-center">
                    <Link to="/admin/sugestoes">
                      <Button variant="outline">
                        Ver todas as sugestões
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Quick Links */}
          <Card>
            <CardHeader>
              <CardTitle>Acesso Rápido</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Link to="/dashboard">
                  <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2">
                    <BarChart3 className="w-5 h-5" />
                    <span className="text-sm">Dashboard Público</span>
                  </Button>
                </Link>
                <Link to="/admin/propostas">
                  <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2">
                    <FileText className="w-5 h-5" />
                    <span className="text-sm">Propostas</span>
                  </Button>
                </Link>
                {accessType !== 'own' && (
                  <>
                    <Link to="/admin/sugestoes">
                      <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2">
                        <Users className="w-5 h-5" />
                        <span className="text-sm">Sugestões</span>
                      </Button>
                    </Link>
                    <Link to="/admin/leads">
                      <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2">
                        <Target className="w-5 h-5" />
                        <span className="text-sm">Leads</span>
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
};

export default AdminMeuPainel;
