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
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Plus, 
  Target,
  Edit,
  Trash2,
  Users,
  ChevronRight,
  FileText,
  Heart,
  TrendingUp,
  Building2,
  FileCheck,
  Shield,
} from 'lucide-react';
import AdminPieChart from '@/components/admin/AdminPieChart';
import TimelineChart from '@/components/admin/TimelineChart';
import { getEixoColor, type Eixo, type Tema, type Subtema } from '@/utils/eixoHelpers';

// Ícone por eixo
const EIXO_ICONS: Record<number, typeof Heart> = {
  1: Heart,      // Desenvolvimento Social
  2: TrendingUp, // Desenvolvimento Econômico
  3: Building2,  // Cidades e Infraestrutura
  4: FileCheck,  // Gestão Pública
  5: Shield,     // Segurança
};

interface EixoWithTemas extends Eixo {
  temas?: TemaWithSubtemas[];
}

interface TemaWithSubtemas extends Tema {
  subtemas?: Subtema[];
  propostas_count?: number;
  sugestoes_count?: number;
}

const AdminEixos = () => {
  const { user, isLoading: authLoading, isAdmin } = useAuth();
  const navigate = useNavigate();
  
  const [eixos, setEixos] = useState<EixoWithTemas[]>([]);
  const [propostas, setPropostas] = useState<{ created_at: string; eixo_id: string | null }[]>([]);
  const [sugestoes, setSugestoes] = useState<{ created_at: string; eixo: string; tema_id?: string | null }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Form state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'eixo' | 'tema' | 'subtema'>('eixo');
  const [editingEixo, setEditingEixo] = useState<Eixo | null>(null);
  const [editingTema, setEditingTema] = useState<Tema | null>(null);
  const [editingSubtema, setEditingSubtema] = useState<Subtema | null>(null);
  const [parentEixoId, setParentEixoId] = useState<string | null>(null);
  const [parentTemaId, setParentTemaId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    subtitulo: '',
    codigo: '',
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
    
    try {
      // Fetch eixos with temas and subtemas
      const { data: eixosData, error: eixosError } = await supabase
        .from('eixos_tematicos')
        .select('*')
        .order('ordem');
      
      if (eixosError) throw eixosError;

      const { data: temasData } = await supabase
        .from('temas')
        .select('*')
        .order('ordem');

      const { data: subtemasData } = await supabase
        .from('subtemas')
        .select('*')
        .order('ordem');

      // Fetch propostas and sugestoes
      const { data: propostasData } = await supabase
        .from('propostas_tecnicas')
        .select('eixo_id, tema_id, created_at');
      
      const { data: sugestoesData } = await supabase
        .from('sugestoes_populares')
        .select('eixo, tema_id, created_at');

      // Build hierarchical structure
      const eixosWithTemas: EixoWithTemas[] = (eixosData || []).map(eixo => {
        const temas = (temasData || [])
          .filter(t => t.eixo_id === eixo.id)
          .map(tema => ({
            ...tema,
            subtemas: (subtemasData || []).filter(s => s.tema_id === tema.id),
            propostas_count: (propostasData || []).filter(p => p.tema_id === tema.id).length,
            sugestoes_count: (sugestoesData || []).filter(s => s.tema_id === tema.id).length,
          }));
        return { ...eixo, temas };
      });

      setEixos(eixosWithTemas);
      setPropostas(propostasData || []);
      setSugestoes(sugestoesData || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados');
    }
    
    setIsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (dialogMode === 'eixo') {
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
              subtitulo: formData.subtitulo || null,
            })
            .eq('id', editingEixo.id);
          
          if (error) throw error;
          toast.success('Eixo atualizado');
        }
      } else if (dialogMode === 'tema') {
        if (!formData.nome || !formData.codigo) {
          toast.error('Nome e código são obrigatórios');
          return;
        }

        if (editingTema) {
          const { error } = await supabase
            .from('temas')
            .update({ nome: formData.nome, codigo: formData.codigo })
            .eq('id', editingTema.id);
          if (error) throw error;
          toast.success('Tema atualizado');
        } else if (parentEixoId) {
          const maxOrdem = eixos.find(e => e.id === parentEixoId)?.temas?.length || 0;
          const { error } = await supabase
            .from('temas')
            .insert({
              eixo_id: parentEixoId,
              nome: formData.nome,
              codigo: formData.codigo,
              ordem: maxOrdem + 1,
            });
          if (error) throw error;
          toast.success('Tema criado');
        }
      } else if (dialogMode === 'subtema') {
        if (!formData.nome) {
          toast.error('Nome é obrigatório');
          return;
        }

        if (editingSubtema) {
          const { error } = await supabase
            .from('subtemas')
            .update({ nome: formData.nome })
            .eq('id', editingSubtema.id);
          if (error) throw error;
          toast.success('Subtema atualizado');
        } else if (parentTemaId) {
          const tema = eixos.flatMap(e => e.temas || []).find(t => t.id === parentTemaId);
          const maxOrdem = tema?.subtemas?.length || 0;
          const { error } = await supabase
            .from('subtemas')
            .insert({
              tema_id: parentTemaId,
              nome: formData.nome,
              ordem: maxOrdem + 1,
            });
          if (error) throw error;
          toast.success('Subtema criado');
        }
      }

      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao salvar');
    }
  };

  const handleEditEixo = (eixo: Eixo) => {
    setDialogMode('eixo');
    setEditingEixo(eixo);
    setFormData({
      nome: eixo.nome,
      descricao: eixo.descricao || '',
      subtitulo: (eixo as any).subtitulo || '',
      codigo: '',
    });
    setIsDialogOpen(true);
  };

  const handleEditTema = (tema: Tema) => {
    setDialogMode('tema');
    setEditingTema(tema);
    setFormData({
      nome: tema.nome,
      descricao: '',
      subtitulo: '',
      codigo: tema.codigo,
    });
    setIsDialogOpen(true);
  };

  const handleAddTema = (eixoId: string) => {
    setDialogMode('tema');
    setParentEixoId(eixoId);
    resetForm();
    setIsDialogOpen(true);
  };

  const handleAddSubtema = (temaId: string) => {
    setDialogMode('subtema');
    setParentTemaId(temaId);
    resetForm();
    setIsDialogOpen(true);
  };

  const handleDeleteTema = async (id: string) => {
    if (!confirm('Excluir este tema? Os subtemas também serão excluídos.')) return;
    const { error } = await supabase.from('temas').delete().eq('id', id);
    if (error) {
      toast.error('Erro ao excluir tema');
    } else {
      toast.success('Tema excluído');
      fetchData();
    }
  };

  const handleDeleteSubtema = async (id: string) => {
    if (!confirm('Excluir este subtema?')) return;
    const { error } = await supabase.from('subtemas').delete().eq('id', id);
    if (error) {
      toast.error('Erro ao excluir subtema');
    } else {
      toast.success('Subtema excluído');
      fetchData();
    }
  };

  const resetForm = () => {
    setEditingEixo(null);
    setEditingTema(null);
    setEditingSubtema(null);
    setParentEixoId(null);
    setParentTemaId(null);
    setFormData({ nome: '', descricao: '', subtitulo: '', codigo: '' });
  };

  // Stats
  const totalTemas = eixos.reduce((acc, e) => acc + (e.temas?.length || 0), 0);
  const totalSubtemas = eixos.reduce((acc, e) => 
    acc + (e.temas?.reduce((a, t) => a + (t.subtemas?.length || 0), 0) || 0), 0);
  const totalPropostas = propostas.length;
  const totalSugestoes = sugestoes.length;

  // Chart data
  const chartData = eixos.map(eixo => ({
    name: eixo.nome.replace('Desenvolvimento ', '').replace(' Sustentável', ''),
    value: propostas.filter(p => p.eixo_id === eixo.id).length,
  }));

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
                <p className="text-sm text-muted-foreground">
                  {eixos.length} eixos • {totalTemas} temas • {totalSubtemas} subtemas
                </p>
              </div>
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
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="py-4 text-center">
                <Target className="w-6 h-6 mx-auto mb-1 text-primary" />
                <p className="text-2xl font-bold">{eixos.length}</p>
                <p className="text-xs text-muted-foreground">Eixos</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4 text-center">
                <ChevronRight className="w-6 h-6 mx-auto mb-1 text-primary" />
                <p className="text-2xl font-bold">{totalTemas}</p>
                <p className="text-xs text-muted-foreground">Temas</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4 text-center">
                <FileText className="w-6 h-6 mx-auto mb-1 text-primary" />
                <p className="text-2xl font-bold">{totalPropostas}</p>
                <p className="text-xs text-muted-foreground">Propostas</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4 text-center">
                <Users className="w-6 h-6 mx-auto mb-1 text-primary" />
                <p className="text-2xl font-bold">{totalSugestoes}</p>
                <p className="text-xs text-muted-foreground">Sugestões</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <AdminPieChart title="Propostas por Eixo" data={chartData} />
            <TimelineChart
              title="Evolução de Cadastros"
              series={[
                { key: 'propostas', label: 'Propostas', color: 'hsl(152, 60%, 40%)', data: propostas },
                { key: 'sugestoes', label: 'Sugestões', color: 'hsl(210, 100%, 50%)', data: sugestoes },
              ]}
            />
          </div>

          {/* Hierarchical Eixos */}
          <Card>
            <CardHeader>
              <CardTitle>Estrutura Hierárquica</CardTitle>
              <CardDescription>
                5 Eixos Temáticos com seus temas e subtemas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="multiple" className="w-full">
                {eixos.map((eixo) => {
                  const Icon = EIXO_ICONS[eixo.ordem] || Target;
                  const eixoPropostas = propostas.filter(p => p.eixo_id === eixo.id).length;
                  const eixoSugestoes = sugestoes.filter(s => 
                    s.eixo === eixo.nome || 
                    eixo.temas?.some(t => t.id === s.tema_id)
                  ).length;

                  return (
                    <AccordionItem key={eixo.id} value={eixo.id}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-3 w-full pr-4">
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: `${getEixoColor(eixo.nome)}20` }}
                          >
                            <Icon className="w-5 h-5" style={{ color: getEixoColor(eixo.nome) }} />
                          </div>
                          <div className="flex-1 text-left">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">
                                {eixo.ordem}. {eixo.nome}
                              </span>
                              {(eixo as any).subtitulo && (
                                <span className="text-xs text-muted-foreground">
                                  – {(eixo as any).subtitulo}
                                </span>
                              )}
                            </div>
                            <div className="flex gap-3 mt-1">
                              <Badge variant="secondary" className="text-xs">
                                {eixo.temas?.length || 0} temas
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {eixoPropostas} propostas
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {eixoSugestoes} sugestões
                              </Badge>
                            </div>
                          </div>
                          {isAdmin && (
                            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="sm" onClick={() => handleEditEixo(eixo)}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleAddTema(eixo.id)}>
                                <Plus className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="pl-14 space-y-2">
                          {eixo.temas?.map((tema) => (
                            <div key={tema.id} className="border rounded-lg p-3">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-sm">{tema.codigo}</span>
                                    <span className="text-sm">{tema.nome}</span>
                                    <Badge variant="secondary" className="text-xs">
                                      {tema.subtemas?.length || 0} subtemas
                                    </Badge>
                                    {(tema.propostas_count || 0) > 0 && (
                                      <Badge variant="outline" className="text-xs">
                                        {tema.propostas_count} propostas
                                      </Badge>
                                    )}
                                  </div>
                                  {tema.subtemas && tema.subtemas.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-1">
                                      {tema.subtemas.map((subtema) => (
                                        <Badge
                                          key={subtema.id}
                                          variant="outline"
                                          className="text-xs font-normal group"
                                        >
                                          {subtema.nome}
                                          {isAdmin && (
                                            <button
                                              onClick={() => handleDeleteSubtema(subtema.id)}
                                              className="ml-1 opacity-0 group-hover:opacity-100 text-destructive"
                                            >
                                              ×
                                            </button>
                                          )}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                {isAdmin && (
                                  <div className="flex gap-1">
                                    <Button variant="ghost" size="sm" onClick={() => handleEditTema(tema)}>
                                      <Edit className="w-3 h-3" />
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => handleAddSubtema(tema.id)}>
                                      <Plus className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDeleteTema(tema.id)}
                                      className="text-destructive"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                          {(!eixo.temas || eixo.temas.length === 0) && (
                            <p className="text-sm text-muted-foreground py-2">
                              Nenhum tema cadastrado
                            </p>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </CardContent>
          </Card>
        </motion.div>
      </main>

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogMode === 'eixo' && (editingEixo ? 'Editar Eixo' : 'Novo Eixo')}
              {dialogMode === 'tema' && (editingTema ? 'Editar Tema' : 'Novo Tema')}
              {dialogMode === 'subtema' && (editingSubtema ? 'Editar Subtema' : 'Novo Subtema')}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {dialogMode === 'tema' && (
              <div className="space-y-2">
                <Label htmlFor="codigo">Código *</Label>
                <Input
                  id="codigo"
                  value={formData.codigo}
                  onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                  placeholder="Ex: 1.1, 2.3"
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Nome"
              />
            </div>
            
            {dialogMode === 'eixo' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="subtitulo">Subtítulo</Label>
                  <Input
                    id="subtitulo"
                    value={formData.subtitulo}
                    onChange={(e) => setFormData({ ...formData, subtitulo: e.target.value })}
                    placeholder="Ex: Qualidade de Vida"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="descricao">Descrição</Label>
                  <Textarea
                    id="descricao"
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    placeholder="Descrição"
                    rows={3}
                  />
                </div>
              </>
            )}
            
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Salvar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminEixos;
