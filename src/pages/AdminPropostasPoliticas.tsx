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
  Pencil,
  Filter,
  ScrollText,
  Users
} from 'lucide-react';
import AdminPieChart from '@/components/admin/AdminPieChart';

type ProposalPoliticaStatus = 'rascunho' | 'revisao' | 'aprovada' | 'publicada' | 'arquivada';

interface PropostaPolitica {
  id: string;
  titulo: string;
  resumo: string | null;
  conteudo_completo: string;
  eixo_id: string | null;
  publico_alvo: string | null;
  impacto_esperado: string | null;
  status: ProposalPoliticaStatus;
  ordem_exibicao: number;
  visivel_publico: boolean;
  created_at: string;
  updated_at: string;
  autor_id: string;
}

interface Eixo {
  id: string;
  nome: string;
}

const statusColors: Record<ProposalPoliticaStatus, string> = {
  rascunho: 'bg-muted text-muted-foreground',
  revisao: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  aprovada: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  publicada: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  arquivada: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

const statusLabels: Record<ProposalPoliticaStatus, string> = {
  rascunho: 'Rascunho',
  revisao: 'Em Revisão',
  aprovada: 'Aprovada',
  publicada: 'Publicada',
  arquivada: 'Arquivada',
};

const AdminPropostasPoliticas = () => {
  const { user, isLoading: authLoading, isAdmin, hasRole } = useAuth();
  const navigate = useNavigate();
  
  const [proposals, setProposals] = useState<PropostaPolitica[]>([]);
  const [eixos, setEixos] = useState<Eixo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterEixo, setFilterEixo] = useState<string>('all');
  const [filterVisibility, setFilterVisibility] = useState<string>('all');
  
  // Modal state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProposal, setEditingProposal] = useState<PropostaPolitica | null>(null);
  const [formData, setFormData] = useState({
    titulo: '',
    resumo: '',
    conteudo_completo: '',
    eixo_id: '',
    publico_alvo: '',
    impacto_esperado: '',
    status: 'rascunho' as ProposalPoliticaStatus,
    ordem_exibicao: 0,
    visivel_publico: false,
  });

  const isAdminMaster = hasRole('admin_master');
  const canManage = isAdmin || hasRole('lider_tematico') || isAdminMaster;

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchProposals();
      fetchEixos();
    }
  }, [user]);

  const fetchProposals = async () => {
    setIsLoading(true);
    // Using explicit cast since the table was just created and types may not be updated yet
    const { data, error } = await supabase
      .from('propostas_politicas' as any)
      .select('*')
      .order('ordem_exibicao', { ascending: true }) as { data: PropostaPolitica[] | null; error: any };
    
    if (error) {
      toast.error('Erro ao carregar propostas políticas');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.titulo || !formData.conteudo_completo) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (editingProposal) {
      const { error } = await supabase
        .from('propostas_politicas' as any)
        .update({
          titulo: formData.titulo,
          resumo: formData.resumo || null,
          conteudo_completo: formData.conteudo_completo,
          eixo_id: formData.eixo_id || null,
          publico_alvo: formData.publico_alvo || null,
          impacto_esperado: formData.impacto_esperado || null,
          status: formData.status,
          ordem_exibicao: formData.ordem_exibicao,
          visivel_publico: formData.visivel_publico,
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
        .from('propostas_politicas' as any)
        .insert({
          titulo: formData.titulo,
          resumo: formData.resumo || null,
          conteudo_completo: formData.conteudo_completo,
          eixo_id: formData.eixo_id || null,
          publico_alvo: formData.publico_alvo || null,
          impacto_esperado: formData.impacto_esperado || null,
          status: formData.status,
          ordem_exibicao: formData.ordem_exibicao,
          visivel_publico: formData.visivel_publico,
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

  const handleEdit = (proposal: PropostaPolitica) => {
    setEditingProposal(proposal);
    setFormData({
      titulo: proposal.titulo,
      resumo: proposal.resumo || '',
      conteudo_completo: proposal.conteudo_completo,
      eixo_id: proposal.eixo_id || '',
      publico_alvo: proposal.publico_alvo || '',
      impacto_esperado: proposal.impacto_esperado || '',
      status: proposal.status,
      ordem_exibicao: proposal.ordem_exibicao,
      visivel_publico: proposal.visivel_publico,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta proposta política?')) return;
    
    const { error } = await supabase
      .from('propostas_politicas' as any)
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
      resumo: '',
      conteudo_completo: '',
      eixo_id: '',
      publico_alvo: '',
      impacto_esperado: '',
      status: 'rascunho',
      ordem_exibicao: 0,
      visivel_publico: false,
    });
  };

  const filteredProposals = useMemo(() => {
    return proposals.filter(p => {
      const matchesSearch = p.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (p.resumo?.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = filterStatus === 'all' || p.status === filterStatus;
      const matchesEixo = filterEixo === 'all' || p.eixo_id === filterEixo;
      const matchesVisibility = filterVisibility === 'all' || 
                                 (filterVisibility === 'public' && p.visivel_publico) ||
                                 (filterVisibility === 'private' && !p.visivel_publico);
      
      return matchesSearch && matchesStatus && matchesEixo && matchesVisibility;
    });
  }, [proposals, searchTerm, filterStatus, filterEixo, filterVisibility]);

  const getEixoNome = (eixoId: string | null) => {
    if (!eixoId) return 'Geral';
    return eixos.find(e => e.id === eixoId)?.nome || 'N/A';
  };

  // Stats for charts
  const statusStats = useMemo(() => {
    const stats = proposals.reduce((acc, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(stats).map(([status, count]) => ({
      name: statusLabels[status as ProposalPoliticaStatus] || status,
      value: count,
    }));
  }, [proposals]);

  const eixoStats = useMemo(() => {
    const stats = proposals.reduce((acc, p) => {
      const eixoName = getEixoNome(p.eixo_id);
      acc[eixoName] = (acc[eixoName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(stats).map(([name, count]) => ({
      name,
      value: count,
    }));
  }, [proposals, eixos]);

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
                <h1 className="text-xl font-display font-bold">Propostas Políticas</h1>
                <p className="text-sm text-muted-foreground">Propostas finais para o plano de governo</p>
              </div>
            </div>
            
            {canManage && (
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
                      {editingProposal ? 'Editar Proposta' : 'Nova Proposta Política'}
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
                      <Label htmlFor="resumo">Resumo</Label>
                      <Textarea
                        id="resumo"
                        value={formData.resumo}
                        onChange={(e) => setFormData({ ...formData, resumo: e.target.value })}
                        placeholder="Resumo breve da proposta (para exibição em cards)"
                        rows={2}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="conteudo">Conteúdo Completo *</Label>
                      <Textarea
                        id="conteudo"
                        value={formData.conteudo_completo}
                        onChange={(e) => setFormData({ ...formData, conteudo_completo: e.target.value })}
                        placeholder="Descrição detalhada da proposta"
                        rows={6}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="eixo">Eixo Temático</Label>
                        <Select
                          value={formData.eixo_id}
                          onValueChange={(value) => setFormData({ ...formData, eixo_id: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o eixo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Geral (sem eixo)</SelectItem>
                            {eixos.map(eixo => (
                              <SelectItem key={eixo.id} value={eixo.id}>
                                {eixo.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="status">Status</Label>
                        <Select
                          value={formData.status}
                          onValueChange={(value) => setFormData({ ...formData, status: value as ProposalPoliticaStatus })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(statusLabels).map(([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="publico">Público-Alvo</Label>
                      <Input
                        id="publico"
                        value={formData.publico_alvo}
                        onChange={(e) => setFormData({ ...formData, publico_alvo: e.target.value })}
                        placeholder="Ex: Jovens, Agricultores, Empresários"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="impacto">Impacto Esperado</Label>
                      <Textarea
                        id="impacto"
                        value={formData.impacto_esperado}
                        onChange={(e) => setFormData({ ...formData, impacto_esperado: e.target.value })}
                        placeholder="Qual o impacto esperado desta proposta?"
                        rows={3}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="ordem">Ordem de Exibição</Label>
                        <Input
                          id="ordem"
                          type="number"
                          value={formData.ordem_exibicao}
                          onChange={(e) => setFormData({ ...formData, ordem_exibicao: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                      
                      <div className="space-y-2 flex items-center gap-2 pt-6">
                        <input
                          type="checkbox"
                          id="visivel"
                          checked={formData.visivel_publico}
                          onChange={(e) => setFormData({ ...formData, visivel_publico: e.target.checked })}
                          className="h-4 w-4 rounded border-border"
                        />
                        <Label htmlFor="visivel">Visível ao público</Label>
                      </div>
                    </div>
                    
                    <div className="flex justify-end gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button type="submit">
                        {editingProposal ? 'Atualizar' : 'Criar'} Proposta
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            )}
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
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <ScrollText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{proposals.length}</p>
                    <p className="text-sm text-muted-foreground">Total</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <Eye className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{proposals.filter(p => p.visivel_publico).length}</p>
                    <p className="text-sm text-muted-foreground">Públicas</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <FileText className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{proposals.filter(p => p.status === 'publicada').length}</p>
                    <p className="text-sm text-muted-foreground">Publicadas</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/10">
                    <Users className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{new Set(proposals.map(p => p.publico_alvo).filter(Boolean)).size}</p>
                    <p className="text-sm text-muted-foreground">Públicos-Alvo</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <AdminPieChart title="Por Status" data={statusStats} />
            <AdminPieChart title="Por Eixo" data={eixoStats} />
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar propostas..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div className="flex gap-2 flex-wrap">
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-[140px]">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos Status</SelectItem>
                      {Object.entries(statusLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Select value={filterEixo} onValueChange={setFilterEixo}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Eixo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Eixos</SelectItem>
                      {eixos.map(eixo => (
                        <SelectItem key={eixo.id} value={eixo.id}>
                          {eixo.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={filterVisibility} onValueChange={setFilterVisibility}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Visibilidade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="public">Públicas</SelectItem>
                      <SelectItem value="private">Privadas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">#</TableHead>
                      <TableHead>Título</TableHead>
                      <TableHead>Eixo</TableHead>
                      <TableHead>Público-Alvo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Visibilidade</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProposals.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          Nenhuma proposta encontrada
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredProposals.map((proposal) => (
                        <TableRow key={proposal.id}>
                          <TableCell className="font-medium">{proposal.ordem_exibicao}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{proposal.titulo}</p>
                              {proposal.resumo && (
                                <p className="text-sm text-muted-foreground line-clamp-1">
                                  {proposal.resumo}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{getEixoNome(proposal.eixo_id)}</Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {proposal.publico_alvo || '-'}
                          </TableCell>
                          <TableCell>
                            <Badge className={statusColors[proposal.status]}>
                              {statusLabels[proposal.status]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {proposal.visivel_publico ? (
                              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                Público
                              </Badge>
                            ) : (
                              <Badge variant="outline">Privado</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {canManage && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEdit(proposal)}
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDelete(proposal.id)}
                                    className="text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
};

export default AdminPropostasPoliticas;
