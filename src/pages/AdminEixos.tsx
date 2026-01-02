import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  Target,
  Edit,
  Trash2,
  Users
} from 'lucide-react';
import AdminPieChart from '@/components/admin/AdminPieChart';
import TimelineChart from '@/components/admin/TimelineChart';

interface Eixo {
  id: string;
  nome: string;
  descricao: string | null;
  lider_id: string | null;
  created_at: string;
}

interface ProposalCount {
  eixo_id: string;
  count: number;
}

interface SugestaoCount {
  eixo: string;
  count: number;
}

const AdminEixos = () => {
  const { user, isLoading: authLoading, isAdmin } = useAuth();
  const navigate = useNavigate();
  
  const [eixos, setEixos] = useState<Eixo[]>([]);
  const [proposalCounts, setProposalCounts] = useState<Record<string, number>>({});
  const [sugestaoCounts, setSugestaoCounts] = useState<Record<string, number>>({});
  const [propostas, setPropostas] = useState<{ created_at: string }[]>([]);
  const [sugestoes, setSugestoes] = useState<{ created_at: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Form state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEixo, setEditingEixo] = useState<Eixo | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setIsLoading(true);
    
    // Fetch eixos
    const { data: eixosData, error: eixosError } = await supabase
      .from('eixos_tematicos')
      .select('*')
      .order('nome');
    
    if (eixosError) {
      toast.error('Erro ao carregar eixos');
      console.error(eixosError);
    } else {
      setEixos(eixosData || []);
    }

    // Fetch proposal counts per eixo
    const { data: propostasData } = await supabase
      .from('propostas_tecnicas')
      .select('eixo_id, created_at');
    
    if (propostasData) {
      const counts: Record<string, number> = {};
      propostasData.forEach(p => {
        counts[p.eixo_id] = (counts[p.eixo_id] || 0) + 1;
      });
      setProposalCounts(counts);
      setPropostas(propostasData);
    }

    // Fetch sugestao counts per eixo
    const { data: sugestoesData } = await supabase
      .from('sugestoes_populares')
      .select('eixo, created_at');
    
    if (sugestoesData) {
      const counts: Record<string, number> = {};
      sugestoesData.forEach(s => {
        counts[s.eixo] = (counts[s.eixo] || 0) + 1;
      });
      setSugestaoCounts(counts);
      setSugestoes(sugestoesData);
    }
    
    setIsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome) {
      toast.error('Nome é obrigatório');
      return;
    }

    if (editingEixo) {
      const { error } = await supabase
        .from('eixos_tematicos')
        .update({
          nome: formData.nome,
          descricao: formData.descricao || null,
        })
        .eq('id', editingEixo.id);
      
      if (error) {
        toast.error('Erro ao atualizar eixo');
        console.error(error);
      } else {
        toast.success('Eixo atualizado com sucesso');
        setIsDialogOpen(false);
        fetchData();
      }
    } else {
      const { error } = await supabase
        .from('eixos_tematicos')
        .insert({
          nome: formData.nome,
          descricao: formData.descricao || null,
        });
      
      if (error) {
        toast.error('Erro ao criar eixo');
        console.error(error);
      } else {
        toast.success('Eixo criado com sucesso');
        setIsDialogOpen(false);
        fetchData();
      }
    }
    
    resetForm();
  };

  const handleEdit = (eixo: Eixo) => {
    setEditingEixo(eixo);
    setFormData({
      nome: eixo.nome,
      descricao: eixo.descricao || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este eixo?')) return;
    
    const { error } = await supabase
      .from('eixos_tematicos')
      .delete()
      .eq('id', id);
    
    if (error) {
      toast.error('Erro ao excluir eixo. Verifique se não há propostas vinculadas.');
    } else {
      toast.success('Eixo excluído');
      fetchData();
    }
  };

  const resetForm = () => {
    setEditingEixo(null);
    setFormData({
      nome: '',
      descricao: '',
    });
  };

  const totalPropostas = Object.values(proposalCounts).reduce((a, b) => a + b, 0);
  const totalSugestoes = Object.values(sugestaoCounts).reduce((a, b) => a + b, 0);

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
                <h1 className="text-xl font-display font-bold">Eixos Temáticos</h1>
                <p className="text-sm text-muted-foreground">Gerenciar os 8 eixos temáticos</p>
              </div>
            </div>
            
            {isAdmin && (
              <Dialog open={isDialogOpen} onOpenChange={(open) => {
                setIsDialogOpen(open);
                if (!open) resetForm();
              }}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Eixo
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingEixo ? 'Editar Eixo' : 'Novo Eixo Temático'}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="nome">Nome *</Label>
                      <Input
                        id="nome"
                        value={formData.nome}
                        onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                        placeholder="Nome do eixo"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="descricao">Descrição</Label>
                      <Textarea
                        id="descricao"
                        value={formData.descricao}
                        onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                        placeholder="Descrição do eixo"
                        rows={3}
                      />
                    </div>
                    
                    <div className="flex justify-end gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button type="submit">
                        {editingEixo ? 'Salvar Alterações' : 'Criar Eixo'}
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
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="py-6 text-center">
                <Target className="w-8 h-8 mx-auto mb-2 text-primary" />
                <p className="text-3xl font-bold">{eixos.length}</p>
                <p className="text-sm text-muted-foreground">Eixos Temáticos</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-6 text-center">
                <p className="text-3xl font-bold">{totalPropostas}</p>
                <p className="text-sm text-muted-foreground">Propostas Técnicas</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-6 text-center">
                <Users className="w-8 h-8 mx-auto mb-2 text-accent" />
                <p className="text-3xl font-bold">{totalSugestoes}</p>
                <p className="text-sm text-muted-foreground">Sugestões Populares</p>
              </CardContent>
            </Card>
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
                  data: propostas,
                },
                {
                  key: 'sugestoes',
                  label: 'Sugestões Populares',
                  color: 'hsl(210, 100%, 50%)',
                  data: sugestoes,
                },
              ]}
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <AdminPieChart
              title="Propostas por Eixo"
              data={eixos.map(eixo => ({
                name: eixo.nome,
                value: proposalCounts[eixo.id] || 0,
              }))}
            />
            <AdminPieChart
              title="Sugestões por Eixo"
              data={eixos.map(eixo => ({
                name: eixo.nome,
                value: sugestaoCounts[eixo.nome] || 0,
              }))}
            />
          </div>

          {/* Eixos Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {eixos.map((eixo, index) => (
              <motion.div
                key={eixo.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <Card className="h-full hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Target className="w-5 h-5 text-primary" />
                      </div>
                      {isAdmin && (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(eixo)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(eixo.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                    <CardTitle className="text-base">{eixo.nome}</CardTitle>
                    {eixo.descricao && (
                      <CardDescription className="text-xs line-clamp-2">
                        {eixo.descricao}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between text-sm">
                      <div>
                        <p className="font-semibold">{proposalCounts[eixo.id] || 0}</p>
                        <p className="text-xs text-muted-foreground">Propostas</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{sugestaoCounts[eixo.nome] || 0}</p>
                        <p className="text-xs text-muted-foreground">Sugestões</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default AdminEixos;
