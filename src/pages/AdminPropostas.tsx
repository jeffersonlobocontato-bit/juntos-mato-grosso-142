import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Plus, 
  Search, 
  FileText,
  Eye,
  Trash2,
  Filter,
  MapPin
} from 'lucide-react';
import AdminPieChart from '@/components/admin/AdminPieChart';
import ParanaMap from '@/components/admin/ParanaMap';
import TimelineChart from '@/components/admin/TimelineChart';
import { ProposalDetailModal } from '@/components/admin/ProposalDetailModal';
import { ScoreBadge } from '@/components/admin/ScoreBadge';

type ProposalStatus = 'rascunho' | 'em_analise' | 'aprovada';

interface Proposal {
  id: string;
  titulo: string;
  descricao: string;
  status: string;
  etapa: number;
  metas: string | null;
  indicadores: string | null;
  created_at: string;
  eixo_id: string;
  municipio_id: string | null;
  autor_id: string;
  entrevistado: string | null;
  lider_responsavel_id: string | null;
}

interface LiderTecnico {
  id: string;
  full_name: string | null;
}

interface Eixo {
  id: string;
  nome: string;
}

interface Municipio {
  id: string;
  nome: string;
  latitude: number | null;
  longitude: number | null;
  regiao: string | null;
}

interface ProposalEvaluation {
  proposta_id: string;
  score_total: number;
  scores: Record<string, number>;
  is_stale: boolean;
}

const REGIOES = [
  'Campos Gerais',
  'Centro Ocidental',
  'Centro-Sul',
  'Litoral',
  'Metropolitana de Curitiba',
  'Noroeste',
  'Norte Central',
  'Norte Pioneiro',
  'Oeste',
  'Sudoeste',
];

const statusColors: Record<ProposalStatus, string> = {
  rascunho: 'bg-muted text-muted-foreground',
  em_analise: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  aprovada: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
};

const statusLabels: Record<ProposalStatus, string> = {
  rascunho: 'Rascunho',
  em_analise: 'Em Análise',
  aprovada: 'Aprovada',
};

const AdminPropostas = () => {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [evaluations, setEvaluations] = useState<ProposalEvaluation[]>([]);
  const [eixos, setEixos] = useState<Eixo[]>([]);
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [lideresTecnicos, setLideresTecnicos] = useState<LiderTecnico[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterEixo, setFilterEixo] = useState<string>('all');
  const [filterRegiao, setFilterRegiao] = useState<string>('all');
  const [filterMunicipio, setFilterMunicipio] = useState<string>('all');
  
  // Modal state
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  
  // Form state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProposal, setEditingProposal] = useState<Proposal | null>(null);
  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    eixo_id: '',
    municipio_id: '',
    metas: '',
    indicadores: '',
    status: 'rascunho' as ProposalStatus,
    etapa: 1,
    entrevistado: '',
    lider_responsavel_id: '',
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchProposals();
      fetchEixos();
      fetchMunicipios();
      fetchLideresTecnicos();
      fetchEvaluations();
    }
  }, [user]);

  // Reset municipio filter when regiao changes
  useEffect(() => {
    setFilterMunicipio('all');
  }, [filterRegiao]);

  const fetchProposals = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('propostas_tecnicas')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      toast.error('Erro ao carregar propostas');
      console.error(error);
    } else {
      setProposals(data || []);
    }
    setIsLoading(false);
  };

  const fetchEvaluations = async () => {
    const { data, error } = await supabase
      .from('proposal_evaluations')
      .select('proposta_id, score_total, scores, is_stale')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      // Get latest evaluation per proposal
      const latestEvals = new Map<string, ProposalEvaluation>();
      data.forEach(ev => {
        if (!latestEvals.has(ev.proposta_id)) {
          latestEvals.set(ev.proposta_id, {
            ...ev,
            scores: (ev.scores || {}) as Record<string, number>,
          });
        }
      });
      setEvaluations(Array.from(latestEvals.values()));
    }
  };

  const fetchEixos = async () => {
    const { data, error } = await supabase
      .from('eixos_tematicos')
      .select('id, nome');
    
    if (!error && data) {
      setEixos(data);
    }
  };

  const fetchMunicipios = async () => {
    const { data, error } = await supabase
      .from('municipios')
      .select('id, nome, latitude, longitude, regiao');
    
    if (!error && data) {
      setMunicipios(data);
    }
  };

  const fetchLideresTecnicos = async () => {
    const { data: rolesData, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id')
      .in('role', ['lider_tematico', 'admin']);
    
    if (rolesError || !rolesData) return;
    
    const userIds = rolesData.map(r => r.user_id);
    
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', userIds)
      .order('full_name');
    
    if (!profilesError && profilesData) {
      setLideresTecnicos(profilesData);
    }
  };

  // Filtered municipios based on selected region
  const filteredMunicipioOptions = useMemo(() => {
    if (filterRegiao === 'all') return municipios;
    return municipios.filter(m => m.regiao === filterRegiao);
  }, [municipios, filterRegiao]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.titulo || !formData.descricao || !formData.eixo_id) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (editingProposal) {
      const { error } = await supabase
        .from('propostas_tecnicas')
        .update({
          titulo: formData.titulo,
          descricao: formData.descricao,
          eixo_id: formData.eixo_id,
          municipio_id: formData.municipio_id || null,
          metas: formData.metas || null,
          indicadores: formData.indicadores || null,
          status: formData.status,
          etapa: formData.etapa,
          entrevistado: formData.entrevistado || null,
          lider_responsavel_id: formData.lider_responsavel_id || null,
        })
        .eq('id', editingProposal.id);
      
      if (error) {
        toast.error('Erro ao atualizar proposta');
        console.error(error);
      } else {
        toast.success('Proposta atualizada com sucesso');
        setIsDialogOpen(false);
        fetchProposals();
        fetchEvaluations();
      }
    } else {
      const { error } = await supabase
        .from('propostas_tecnicas')
        .insert({
          titulo: formData.titulo,
          descricao: formData.descricao,
          eixo_id: formData.eixo_id,
          municipio_id: formData.municipio_id || null,
          metas: formData.metas || null,
          indicadores: formData.indicadores || null,
          status: formData.status,
          etapa: formData.etapa,
          autor_id: user?.id,
          entrevistado: formData.entrevistado || null,
          lider_responsavel_id: formData.lider_responsavel_id || null,
        });
      
      if (error) {
        toast.error('Erro ao criar proposta');
        console.error(error);
      } else {
        toast.success('Proposta criada com sucesso');
        setIsDialogOpen(false);
        fetchProposals();
      }
    }
    
    resetForm();
  };

  const handleOpenDetail = (proposalId: string) => {
    setSelectedProposalId(proposalId);
    setIsDetailModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta proposta?')) return;
    
    const { error } = await supabase
      .from('propostas_tecnicas')
      .delete()
      .eq('id', id);
    
    if (error) {
      toast.error('Erro ao excluir proposta');
    } else {
      toast.success('Proposta excluída');
      fetchProposals();
    }
  };

  const resetForm = () => {
    setEditingProposal(null);
    setFormData({
      titulo: '',
      descricao: '',
      eixo_id: '',
      municipio_id: '',
      metas: '',
      indicadores: '',
      status: 'rascunho',
      etapa: 1,
      entrevistado: '',
      lider_responsavel_id: '',
    });
  };

  const filteredProposals = useMemo(() => {
    return proposals.filter(p => {
      const matchesSearch = p.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            p.descricao.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'all' || p.status === filterStatus;
      const matchesEixo = filterEixo === 'all' || p.eixo_id === filterEixo;
      
      // Geographic filters
      let matchesGeography = true;
      if (filterMunicipio !== 'all') {
        matchesGeography = p.municipio_id === filterMunicipio;
      } else if (filterRegiao !== 'all') {
        const municipio = municipios.find(m => m.id === p.municipio_id);
        matchesGeography = municipio?.regiao === filterRegiao;
      }
      
      return matchesSearch && matchesStatus && matchesEixo && matchesGeography;
    });
  }, [proposals, searchTerm, filterStatus, filterEixo, filterRegiao, filterMunicipio, municipios]);

  const getEixoNome = (eixoId: string) => {
    return eixos.find(e => e.id === eixoId)?.nome || 'N/A';
  };

  const getMunicipio = (municipioId: string | null) => {
    return municipios.find(m => m.id === municipioId);
  };

  const getEvaluation = (proposalId: string) => {
    return evaluations.find(e => e.proposta_id === proposalId);
  };

  // Prepare map markers
  const mapMarkers = useMemo(() => {
    return filteredProposals
      .map(p => {
        const municipio = getMunicipio(p.municipio_id);
        if (!municipio?.latitude || !municipio?.longitude) return null;
        const evaluation = getEvaluation(p.id);
        return {
          id: p.id,
          latitude: municipio.latitude,
          longitude: municipio.longitude,
          title: p.titulo,
          description: p.descricao,
          status: p.status,
          eixo: getEixoNome(p.eixo_id),
          municipio: municipio.nome,
          score: evaluation?.score_total,
        };
      })
      .filter((m): m is NonNullable<typeof m> => m !== null);
  }, [filteredProposals, municipios, eixos, evaluations]);

  const handleMarkerClick = (markerId: string) => {
    handleOpenDetail(markerId);
  };

  if (authLoading || isLoading) {
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
                <h1 className="text-xl font-display font-bold">Propostas Técnicas</h1>
                <p className="text-sm text-muted-foreground">Gerenciar propostas dos especialistas</p>
              </div>
            </div>
            
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Proposta
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingProposal ? 'Editar Proposta' : 'Nova Proposta Técnica'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="titulo">Título *</Label>
                    <Input
                      id="titulo"
                      value={formData.titulo}
                      onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                      placeholder="Título da proposta"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="eixo">Eixo Temático *</Label>
                    <Select
                      value={formData.eixo_id}
                      onValueChange={(value) => setFormData({ ...formData, eixo_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o eixo" />
                      </SelectTrigger>
                      <SelectContent>
                        {eixos.map(eixo => (
                          <SelectItem key={eixo.id} value={eixo.id}>
                            {eixo.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="municipio">Município</Label>
                    <Select
                      value={formData.municipio_id}
                      onValueChange={(value) => setFormData({ ...formData, municipio_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o município" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[200px]">
                        {municipios
                          .sort((a, b) => a.nome.localeCompare(b.nome))
                          .map(m => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.nome}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="entrevistado">Nome do Entrevistado</Label>
                    <Input
                      id="entrevistado"
                      value={formData.entrevistado}
                      onChange={(e) => setFormData({ ...formData, entrevistado: e.target.value })}
                      placeholder="Nome da pessoa entrevistada"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="lider_responsavel">Líder Técnico Responsável</Label>
                    <Select
                      value={formData.lider_responsavel_id}
                      onValueChange={(value) => setFormData({ ...formData, lider_responsavel_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o líder responsável" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[200px]">
                        {lideresTecnicos.map(lider => (
                          <SelectItem key={lider.id} value={lider.id}>
                            {lider.full_name || 'Sem nome'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="descricao">Descrição *</Label>
                    <Textarea
                      id="descricao"
                      value={formData.descricao}
                      onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                      placeholder="Descreva a proposta em detalhes"
                      rows={4}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(value) => setFormData({ ...formData, status: value as ProposalStatus })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="rascunho">Rascunho</SelectItem>
                          <SelectItem value="em_analise">Em Análise</SelectItem>
                          <SelectItem value="aprovada">Aprovada</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="etapa">Etapa (1-4)</Label>
                      <Select
                        value={formData.etapa.toString()}
                        onValueChange={(value) => setFormData({ ...formData, etapa: parseInt(value) })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Etapa 1 - Entrevistas</SelectItem>
                          <SelectItem value="2">Etapa 2 - Validação Online</SelectItem>
                          <SelectItem value="3">Etapa 3 - Presencial 1</SelectItem>
                          <SelectItem value="4">Etapa 4 - Presencial 2</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="metas">Metas</Label>
                    <Textarea
                      id="metas"
                      value={formData.metas}
                      onChange={(e) => setFormData({ ...formData, metas: e.target.value })}
                      placeholder="Defina as metas da proposta"
                      rows={2}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="indicadores">Indicadores</Label>
                    <Textarea
                      id="indicadores"
                      value={formData.indicadores}
                      onChange={(e) => setFormData({ ...formData, indicadores: e.target.value })}
                      placeholder="Defina os indicadores de sucesso"
                      rows={2}
                    />
                  </div>
                  
                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit">
                      {editingProposal ? 'Salvar Alterações' : 'Criar Proposta'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
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
          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="py-4">
              <div className="flex flex-col gap-4">
                {/* First row: search and status/eixo filters */}
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar propostas..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-full md:w-[180px]">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os status</SelectItem>
                      <SelectItem value="rascunho">Rascunho</SelectItem>
                      <SelectItem value="em_analise">Em Análise</SelectItem>
                      <SelectItem value="aprovada">Aprovada</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterEixo} onValueChange={setFilterEixo}>
                    <SelectTrigger className="w-full md:w-[200px]">
                      <SelectValue placeholder="Eixo temático" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os eixos</SelectItem>
                      {eixos.map(eixo => (
                        <SelectItem key={eixo.id} value={eixo.id}>
                          {eixo.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Second row: geographic filters */}
                <div className="flex flex-col md:flex-row gap-4">
                  <Select value={filterRegiao} onValueChange={setFilterRegiao}>
                    <SelectTrigger className="w-full md:w-[220px]">
                      <MapPin className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Região" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as regiões</SelectItem>
                      {REGIOES.map(regiao => (
                        <SelectItem key={regiao} value={regiao}>
                          {regiao}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filterMunicipio} onValueChange={setFilterMunicipio}>
                    <SelectTrigger className="w-full md:w-[220px]">
                      <SelectValue placeholder="Município" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      <SelectItem value="all">Todos os municípios</SelectItem>
                      {filteredMunicipioOptions
                        .sort((a, b) => a.nome.localeCompare(b.nome))
                        .map(m => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.nome}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {(filterRegiao !== 'all' || filterMunicipio !== 'all') && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        setFilterRegiao('all');
                        setFilterMunicipio('all');
                      }}
                    >
                      Limpar filtros geográficos
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Mapa do Paraná */}
          <div className="mb-6">
            <ParanaMap
              markers={mapMarkers}
              title="Mapa de Propostas por Município"
              onMarkerClick={handleMarkerClick}
            />
          </div>

          {/* Timeline Chart */}
          <div className="mb-6">
            <TimelineChart
              title="Evolução de Cadastros"
              series={[
                {
                  key: 'propostas',
                  label: 'Propostas Técnicas',
                  color: 'hsl(152, 60%, 40%)',
                  data: proposals,
                },
              ]}
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <AdminPieChart
              title="Propostas por Status"
              data={[
                { name: 'Rascunho', value: proposals.filter(p => p.status === 'rascunho').length, color: 'hsl(215, 20%, 65%)' },
                { name: 'Em Análise', value: proposals.filter(p => p.status === 'em_analise').length, color: 'hsl(210, 100%, 50%)' },
                { name: 'Aprovada', value: proposals.filter(p => p.status === 'aprovada').length, color: 'hsl(152, 60%, 40%)' },
              ]}
            />
            <AdminPieChart
              title="Propostas por Eixo Temático"
              data={eixos.map(eixo => ({
                name: eixo.nome,
                value: proposals.filter(p => p.eixo_id === eixo.id).length,
              }))}
            />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {(['rascunho', 'em_analise', 'aprovada'] as ProposalStatus[]).map(status => (
              <Card key={status}>
                <CardContent className="py-4 text-center">
                  <p className="text-2xl font-bold">{proposals.filter(p => p.status === status).length}</p>
                  <p className="text-sm text-muted-foreground">{statusLabels[status]}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Propostas ({filteredProposals.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredProposals.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma proposta encontrada</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Título</TableHead>
                        <TableHead>Entrevistado</TableHead>
                        <TableHead>Eixo</TableHead>
                        <TableHead>Município</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Score IA</TableHead>
                        <TableHead>Etapa</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProposals.map(proposal => {
                        const evaluation = getEvaluation(proposal.id);
                        const municipio = getMunicipio(proposal.municipio_id);
                        return (
                          <TableRow 
                            key={proposal.id} 
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => handleOpenDetail(proposal.id)}
                          >
                            <TableCell className="font-medium max-w-[200px] truncate">
                              {proposal.titulo}
                            </TableCell>
                            <TableCell className="text-sm">
                              {proposal.entrevistado || <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell>{getEixoNome(proposal.eixo_id)}</TableCell>
                            <TableCell>{municipio?.nome || 'Estadual'}</TableCell>
                            <TableCell>
                              <Badge className={statusColors[proposal.status]}>
                                {statusLabels[proposal.status]}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {evaluation ? (
                                <ScoreBadge 
                                  score={evaluation.score_total}
                                  scores={evaluation.scores as any}
                                  isStale={evaluation.is_stale}
                                  size="sm"
                                />
                              ) : (
                                <span className="text-muted-foreground text-sm">—</span>
                              )}
                            </TableCell>
                            <TableCell>Etapa {proposal.etapa}</TableCell>
                            <TableCell>
                              {new Date(proposal.created_at).toLocaleDateString('pt-BR')}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenDetail(proposal.id)}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(proposal.id)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </main>

      {/* Proposal Detail Modal */}
      <ProposalDetailModal
        open={isDetailModalOpen}
        onOpenChange={setIsDetailModalOpen}
        proposalId={selectedProposalId}
        eixos={eixos}
        municipios={municipios}
        onProposalUpdated={() => {
          fetchProposals();
          fetchEvaluations();
        }}
      />
    </div>
  );
};

export default AdminPropostas;
