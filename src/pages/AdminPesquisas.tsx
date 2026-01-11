import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ArrowLeft, 
  Plus, 
  Search, 
  BarChart2, 
  Calendar,
  Building2,
  Users,
  FileSpreadsheet,
  Filter,
  Eye,
  Trash2,
  Edit,
  Sparkles,
  Loader2,
  Brain
} from 'lucide-react';
import { toast } from 'sonner';
import { PesquisaUploadModal } from '@/components/admin/PesquisaUploadModal';
import { PesquisaDetailModal } from '@/components/admin/PesquisaDetailModal';
import { ResearchAnalystChat } from '@/components/ai-hub/ResearchAnalystChat';

interface Pesquisa {
  id: string;
  titulo: string;
  instituto: string;
  tipo_pesquisa: 'quantitativa' | 'qualitativa' | 'mista';
  data_campo_inicio: string | null;
  data_campo_fim: string | null;
  data_publicacao: string | null;
  registro_tse: string | null;
  universo: string | null;
  amostra_total: number | null;
  margem_erro: number | null;
  nivel_confianca: number | null;
  abrangencia: string | null;
  status: 'rascunho' | 'processando' | 'ativa' | 'arquivada';
  is_active: boolean;
  created_at: string;
  file_url: string | null;
  content: string | null;
}

const INSTITUTOS = [
  'Datafolha',
  'IPEC',
  'Quaest',
  'Real Time Big Data',
  'Paraná Pesquisas',
  'Atlas Intel',
  'Outro'
];

const AdminPesquisas = () => {
  const { user, isLoading: authLoading, isAdmin, hasRole } = useAuth();
  const navigate = useNavigate();
  
  const [pesquisas, setPesquisas] = useState<Pesquisa[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterInstituto, setFilterInstituto] = useState<string>('all');
  const [filterTipo, setFilterTipo] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedPesquisa, setSelectedPesquisa] = useState<Pesquisa | null>(null);
  const [editingPesquisa, setEditingPesquisa] = useState<Pesquisa | null>(null);
  const [showAnalystChat, setShowAnalystChat] = useState(false);
  const [analystAgent, setAnalystAgent] = useState<any>(null);

  const isAdminMaster = hasRole('admin_master');
  const canAccess = isAdmin || isAdminMaster || hasRole('lider_tematico');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    } else if (!authLoading && user && !canAccess) {
      navigate('/admin');
      toast.error('Acesso não autorizado');
    }
  }, [user, authLoading, navigate, canAccess]);

  useEffect(() => {
    if (user && canAccess) {
      fetchPesquisas();
      fetchAnalystAgent();
    }
  }, [user, canAccess]);

  const fetchAnalystAgent = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_agent_config')
        .select('*')
        .eq('agent_type', 'pesquisas')
        .eq('is_active', true)
        .single();
      
      if (data) {
        // Parse conversation_starters if it's a string
        const parsedAgent = {
          ...data,
          conversation_starters: Array.isArray(data.conversation_starters) 
            ? data.conversation_starters 
            : typeof data.conversation_starters === 'string'
              ? JSON.parse(data.conversation_starters)
              : [],
          config: data.config || {}
        };
        setAnalystAgent(parsedAgent);
      }
    } catch (error) {
      console.error('Error fetching analyst agent:', error);
    }
  };

  const fetchPesquisas = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('pesquisas_eleitorais')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPesquisas((data as Pesquisa[]) || []);
    } catch (error) {
      console.error('Error fetching pesquisas:', error);
      toast.error('Erro ao carregar pesquisas');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta pesquisa?')) return;
    
    try {
      const { error } = await supabase
        .from('pesquisas_eleitorais')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Pesquisa excluída com sucesso');
      fetchPesquisas();
    } catch (error) {
      console.error('Error deleting pesquisa:', error);
      toast.error('Erro ao excluir pesquisa');
    }
  };

  const handleViewDetails = (pesquisa: Pesquisa) => {
    setSelectedPesquisa(pesquisa);
    setDetailModalOpen(true);
  };

  const handleEdit = (pesquisa: Pesquisa) => {
    setEditingPesquisa(pesquisa);
    setUploadModalOpen(true);
  };

  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleProcessWithAI = async (pesquisa: Pesquisa) => {
    if (!pesquisa.file_url && !pesquisa.content) {
      toast.error('A pesquisa não possui arquivo ou conteúdo para processar');
      return;
    }

    setProcessingId(pesquisa.id);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-pesquisa`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            pesquisa_id: pesquisa.id,
            file_url: pesquisa.file_url,
            content_text: pesquisa.content,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          toast.error('Limite de requisições excedido. Tente novamente mais tarde.');
        } else if (response.status === 402) {
          toast.error('Créditos insuficientes. Adicione créditos ao workspace.');
        } else {
          toast.error(data.error || 'Erro ao processar pesquisa');
        }
        return;
      }

      toast.success(`Pesquisa processada! ${data.data.resultados_count} resultados extraídos.`);
      fetchPesquisas();
    } catch (error) {
      console.error('Error processing pesquisa:', error);
      toast.error('Erro ao processar pesquisa com IA');
    } finally {
      setProcessingId(null);
    }
  };

  const filteredPesquisas = pesquisas.filter(p => {
    const matchesSearch = p.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.instituto.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesInstituto = filterInstituto === 'all' || p.instituto === filterInstituto;
    const matchesTipo = filterTipo === 'all' || p.tipo_pesquisa === filterTipo;
    const matchesStatus = filterStatus === 'all' || p.status === filterStatus;
    
    return matchesSearch && matchesInstituto && matchesTipo && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; label: string }> = {
      rascunho: { variant: 'outline', label: 'Rascunho' },
      processando: { variant: 'secondary', label: 'Processando' },
      ativa: { variant: 'default', label: 'Ativa' },
      arquivada: { variant: 'destructive', label: 'Arquivada' }
    };
    const { variant, label } = variants[status] || { variant: 'outline', label: status };
    return <Badge variant={variant}>{label}</Badge>;
  };

  const getTipoBadge = (tipo: string) => {
    const colors: Record<string, string> = {
      quantitativa: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
      qualitativa: 'bg-purple-500/10 text-purple-500 border-purple-500/30',
      mista: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
    };
    return (
      <Badge variant="outline" className={colors[tipo] || ''}>
        {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
      </Badge>
    );
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('pt-BR');
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin text-4xl">⏳</div>
      </div>
    );
  }

  if (!user || !canAccess) return null;

  return (
    <div className="min-h-screen bg-muted/20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/admin" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Voltar</span>
              </Link>
              <span className="text-muted-foreground">|</span>
              <div className="flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-primary" />
                <span className="font-display font-bold">Pesquisas Eleitorais</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {analystAgent && (
                <Button 
                  variant="outline" 
                  onClick={() => setShowAnalystChat(true)}
                  className="gap-2 border-emerald-500/50 text-emerald-600 hover:bg-emerald-500/10"
                >
                  <Brain className="w-4 h-4" />
                  <span className="hidden sm:inline">Analisar com IA</span>
                </Button>
              )}
              <Button onClick={() => { setEditingPesquisa(null); setUploadModalOpen(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                Nova Pesquisa
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
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileSpreadsheet className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{pesquisas.length}</p>
                    <p className="text-xs text-muted-foreground">Total de Pesquisas</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <BarChart2 className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {pesquisas.filter(p => p.tipo_pesquisa === 'quantitativa').length}
                    </p>
                    <p className="text-xs text-muted-foreground">Quantitativas</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {pesquisas.filter(p => p.tipo_pesquisa === 'qualitativa').length}
                    </p>
                    <p className="text-xs text-muted-foreground">Qualitativas</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {new Set(pesquisas.map(p => p.instituto)).size}
                    </p>
                    <p className="text-xs text-muted-foreground">Institutos</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por título ou instituto..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={filterInstituto} onValueChange={setFilterInstituto}>
                  <SelectTrigger className="w-full md:w-48">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Instituto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos Institutos</SelectItem>
                    {INSTITUTOS.map(inst => (
                      <SelectItem key={inst} value={inst}>{inst}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterTipo} onValueChange={setFilterTipo}>
                  <SelectTrigger className="w-full md:w-40">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos Tipos</SelectItem>
                    <SelectItem value="quantitativa">Quantitativa</SelectItem>
                    <SelectItem value="qualitativa">Qualitativa</SelectItem>
                    <SelectItem value="mista">Mista</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-full md:w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos Status</SelectItem>
                    <SelectItem value="ativa">Ativa</SelectItem>
                    <SelectItem value="rascunho">Rascunho</SelectItem>
                    <SelectItem value="processando">Processando</SelectItem>
                    <SelectItem value="arquivada">Arquivada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Pesquisas List */}
          {filteredPesquisas.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <BarChart2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhuma pesquisa encontrada</h3>
                <p className="text-muted-foreground mb-4">
                  {pesquisas.length === 0 
                    ? 'Comece adicionando sua primeira pesquisa eleitoral.'
                    : 'Ajuste os filtros para ver mais resultados.'}
                </p>
                {pesquisas.length === 0 && (
                  <Button onClick={() => setUploadModalOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Pesquisa
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredPesquisas.map((pesquisa, index) => (
                <motion.div
                  key={pesquisa.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <Card className="hover:shadow-lg transition-all duration-300">
                    <CardContent className="py-4">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-lg">{pesquisa.titulo}</h3>
                            {getTipoBadge(pesquisa.tipo_pesquisa)}
                            {getStatusBadge(pesquisa.status)}
                          </div>
                          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Building2 className="w-4 h-4" />
                              {pesquisa.instituto}
                            </span>
                            {pesquisa.data_campo_inicio && pesquisa.data_campo_fim && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {formatDate(pesquisa.data_campo_inicio)} - {formatDate(pesquisa.data_campo_fim)}
                              </span>
                            )}
                            {pesquisa.amostra_total && (
                              <span className="flex items-center gap-1">
                                <Users className="w-4 h-4" />
                                {pesquisa.amostra_total.toLocaleString()} entrevistados
                              </span>
                            )}
                            {pesquisa.margem_erro && (
                              <span>
                                ±{pesquisa.margem_erro}% margem
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {(pesquisa.file_url || pesquisa.content) && pesquisa.status !== 'ativa' && (
                            <Button 
                              variant="default" 
                              size="sm"
                              onClick={() => handleProcessWithAI(pesquisa)}
                              disabled={processingId === pesquisa.id || pesquisa.status === 'processando'}
                              className="bg-violet-600 hover:bg-violet-700"
                            >
                              {(processingId === pesquisa.id || pesquisa.status === 'processando') ? (
                                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                              ) : (
                                <Sparkles className="w-4 h-4 mr-1" />
                              )}
                              Processar IA
                            </Button>
                          )}
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleViewDetails(pesquisa)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Ver
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleEdit(pesquisa)}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Editar
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDelete(pesquisa.id)}
                            className="text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </main>

      {/* Modals */}
      <PesquisaUploadModal 
        open={uploadModalOpen}
        onOpenChange={(open) => {
          setUploadModalOpen(open);
          if (!open) setEditingPesquisa(null);
        }}
        pesquisa={editingPesquisa}
        onSuccess={() => {
          fetchPesquisas();
          setUploadModalOpen(false);
          setEditingPesquisa(null);
        }}
      />

      <PesquisaDetailModal
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        pesquisa={selectedPesquisa}
      />

      {/* AI Analyst Chat */}
      {showAnalystChat && analystAgent && (
        <ResearchAnalystChat 
          agent={analystAgent}
          onClose={() => setShowAnalystChat(false)}
        />
      )}
    </div>
  );
};

export default AdminPesquisas;
