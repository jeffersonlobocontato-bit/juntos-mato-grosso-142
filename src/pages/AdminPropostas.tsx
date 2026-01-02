import { useState, useEffect } from 'react';
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
  Edit,
  Trash2,
  Filter,
  PieChart as PieChartIcon
} from 'lucide-react';
import AdminPieChart from '@/components/admin/AdminPieChart';
import ParanaMap from '@/components/admin/ParanaMap';

type ProposalStatus = 'rascunho' | 'validada' | 'consolidada' | 'aprovada';

interface Proposal {
  id: string;
  titulo: string;
  descricao: string;
  status: ProposalStatus;
  etapa: number;
  metas: string | null;
  indicadores: string | null;
  created_at: string;
  eixo_id: string;
  municipio_id: string | null;
  autor_id: string;
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
}

const statusColors: Record<ProposalStatus, string> = {
  rascunho: 'bg-muted text-muted-foreground',
  validada: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  consolidada: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  aprovada: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
};

const statusLabels: Record<ProposalStatus, string> = {
  rascunho: 'Rascunho',
  validada: 'Validada',
  consolidada: 'Consolidada',
  aprovada: 'Aprovada',
};

const AdminPropostas = () => {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [eixos, setEixos] = useState<Eixo[]>([]);
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterEixo, setFilterEixo] = useState<string>('all');
  
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
    }
  }, [user]);

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
      .select('id, nome, latitude, longitude');
    
    if (!error && data) {
      setMunicipios(data);
    }
  };

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
        })
        .eq('id', editingProposal.id);
      
      if (error) {
        toast.error('Erro ao atualizar proposta');
        console.error(error);
      } else {
        toast.success('Proposta atualizada com sucesso');
        setIsDialogOpen(false);
        fetchProposals();
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

  const handleEdit = (proposal: Proposal) => {
    setEditingProposal(proposal);
    setFormData({
      titulo: proposal.titulo,
      descricao: proposal.descricao,
      eixo_id: proposal.eixo_id,
      municipio_id: proposal.municipio_id || '',
      metas: proposal.metas || '',
      indicadores: proposal.indicadores || '',
      status: proposal.status,
      etapa: proposal.etapa,
    });
    setIsDialogOpen(true);
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
    });
  };

  const filteredProposals = proposals.filter(p => {
    const matchesSearch = p.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.descricao.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || p.status === filterStatus;
    const matchesEixo = filterEixo === 'all' || p.eixo_id === filterEixo;
    return matchesSearch && matchesStatus && matchesEixo;
  });

  const getEixoNome = (eixoId: string) => {
    return eixos.find(e => e.id === eixoId)?.nome || 'N/A';
  };

  const getMunicipio = (municipioId: string | null) => {
    return municipios.find(m => m.id === municipioId);
  };

  // Preparar dados do mapa
  const mapMarkers = filteredProposals
    .map(p => {
      const municipio = getMunicipio(p.municipio_id);
      if (!municipio?.latitude || !municipio?.longitude) return null;
      return {
        id: p.id,
        latitude: municipio.latitude,
        longitude: municipio.longitude,
        title: p.titulo,
        description: p.descricao,
        status: p.status,
        eixo: getEixoNome(p.eixo_id),
        municipio: municipio.nome,
      };
    })
    .filter((m): m is NonNullable<typeof m> => m !== null);

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
                          <SelectItem value="validada">Validada</SelectItem>
                          <SelectItem value="consolidada">Consolidada</SelectItem>
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
                    <SelectItem value="validada">Validada</SelectItem>
                    <SelectItem value="consolidada">Consolidada</SelectItem>
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
            </CardContent>
          </Card>

          {/* Mapa do Paraná */}
          <div className="mb-6">
            <ParanaMap
              markers={mapMarkers}
              title="Mapa de Propostas por Município"
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <AdminPieChart
              title="Propostas por Status"
              data={[
                { name: 'Rascunho', value: proposals.filter(p => p.status === 'rascunho').length, color: 'hsl(215, 20%, 65%)' },
                { name: 'Validada', value: proposals.filter(p => p.status === 'validada').length, color: 'hsl(210, 100%, 50%)' },
                { name: 'Consolidada', value: proposals.filter(p => p.status === 'consolidada').length, color: 'hsl(45, 100%, 50%)' },
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
            {(['rascunho', 'validada', 'consolidada', 'aprovada'] as ProposalStatus[]).map(status => (
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
                        <TableHead>Eixo</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Etapa</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProposals.map(proposal => (
                        <TableRow key={proposal.id}>
                          <TableCell className="font-medium max-w-[200px] truncate">
                            {proposal.titulo}
                          </TableCell>
                          <TableCell>{getEixoNome(proposal.eixo_id)}</TableCell>
                          <TableCell>
                            <Badge className={statusColors[proposal.status]}>
                              {statusLabels[proposal.status]}
                            </Badge>
                          </TableCell>
                          <TableCell>Etapa {proposal.etapa}</TableCell>
                          <TableCell>
                            {new Date(proposal.created_at).toLocaleDateString('pt-BR')}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(proposal)}
                              >
                                <Edit className="w-4 h-4" />
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
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
};

export default AdminPropostas;
