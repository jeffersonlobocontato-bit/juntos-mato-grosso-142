import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Plus, 
  Search, 
  MapPin,
  Edit,
  Trash2,
  Filter,
  Upload
} from 'lucide-react';
import AdminPieChart from '@/components/admin/AdminPieChart';
import TimelineChart from '@/components/admin/TimelineChart';

interface Municipio {
  id: string;
  nome: string;
  codigo_ibge: string | null;
  regiao: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
}

const regioes = [
  'Curitiba e Região Metropolitana',
  'Norte Central',
  'Norte Pioneiro',
  'Noroeste',
  'Centro-Oeste',
  'Centro-Sul',
  'Oeste',
  'Sudoeste',
  'Campos Gerais',
  'Litoral',
];

const AdminMunicipios = () => {
  const { user, isLoading: authLoading, isAdmin } = useAuth();
  const navigate = useNavigate();
  
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [sugestaoCounts, setSugestaoCounts] = useState<Record<string, number>>({});
  const [propostaTecnicaCounts, setPropostaTecnicaCounts] = useState<Record<string, number>>({});
  const [propostaPoliticaTotal, setPropostaPoliticaTotal] = useState(0);
  const [sugestoes, setSugestoes] = useState<{ created_at: string }[]>([]);
  const [totalPropostasTecnicas, setTotalPropostasTecnicas] = useState(0);
  const [totalSugestoes, setTotalSugestoes] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRegiao, setFilterRegiao] = useState<string>('all');
  
  // Form state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMunicipio, setEditingMunicipio] = useState<Municipio | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    codigo_ibge: '',
    regiao: '',
    latitude: '',
    longitude: '',
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
    
    const { data, error } = await supabase
      .from('municipios')
      .select('*')
      .order('nome');
    
    if (error) {
      toast.error('Erro ao carregar municípios');
      console.error(error);
    } else {
      setMunicipios(data || []);
    }

    // Fetch sugestao counts per municipio
    const { data: sugestoesData } = await supabase
      .from('sugestoes_populares')
      .select('municipio, created_at');
    
    if (sugestoesData) {
      const counts: Record<string, number> = {};
      sugestoesData.forEach(s => {
        counts[s.municipio] = (counts[s.municipio] || 0) + 1;
      });
      setSugestaoCounts(counts);
      setSugestoes(sugestoesData);
      setTotalSugestoes(sugestoesData.length);
    }

    // Fetch propostas técnicas counts per municipio
    const { data: propostasData } = await supabase
      .from('propostas_tecnicas')
      .select('municipio_id');
    
    if (propostasData) {
      const counts: Record<string, number> = {};
      propostasData.forEach(p => {
        if (p.municipio_id) {
          counts[p.municipio_id] = (counts[p.municipio_id] || 0) + 1;
        }
      });
      setPropostaTecnicaCounts(counts);
      setTotalPropostasTecnicas(propostasData.length);
    }

    // Fetch propostas políticas total
    const { count: politicasCount } = await supabase
      .from('propostas_politicas')
      .select('id', { count: 'exact', head: true });
    
    setPropostaPoliticaTotal(politicasCount || 0);
    
    setIsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome) {
      toast.error('Nome é obrigatório');
      return;
    }

    const payload = {
      nome: formData.nome,
      codigo_ibge: formData.codigo_ibge || null,
      regiao: formData.regiao || null,
      latitude: formData.latitude ? parseFloat(formData.latitude) : null,
      longitude: formData.longitude ? parseFloat(formData.longitude) : null,
    };

    if (editingMunicipio) {
      const { error } = await supabase
        .from('municipios')
        .update(payload)
        .eq('id', editingMunicipio.id);
      
      if (error) {
        toast.error('Erro ao atualizar município');
        console.error(error);
      } else {
        toast.success('Município atualizado com sucesso');
        setIsDialogOpen(false);
        fetchData();
      }
    } else {
      const { error } = await supabase
        .from('municipios')
        .insert(payload);
      
      if (error) {
        toast.error('Erro ao criar município');
        console.error(error);
      } else {
        toast.success('Município criado com sucesso');
        setIsDialogOpen(false);
        fetchData();
      }
    }
    
    resetForm();
  };

  const handleEdit = (municipio: Municipio) => {
    setEditingMunicipio(municipio);
    setFormData({
      nome: municipio.nome,
      codigo_ibge: municipio.codigo_ibge || '',
      regiao: municipio.regiao || '',
      latitude: municipio.latitude?.toString() || '',
      longitude: municipio.longitude?.toString() || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este município?')) return;
    
    const { error } = await supabase
      .from('municipios')
      .delete()
      .eq('id', id);
    
    if (error) {
      toast.error('Erro ao excluir município');
    } else {
      toast.success('Município excluído');
      fetchData();
    }
  };

  const resetForm = () => {
    setEditingMunicipio(null);
    setFormData({
      nome: '',
      codigo_ibge: '',
      regiao: '',
      latitude: '',
      longitude: '',
    });
  };

  const filteredMunicipios = municipios.filter(m => {
    const matchesSearch = m.nome.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRegiao = filterRegiao === 'all' || m.regiao === filterRegiao;
    return matchesSearch && matchesRegiao;
  });

  // Count by region
  const countByRegiao = regioes.map(regiao => ({
    name: regiao.split(' ')[0], // Shorten name for chart
    value: municipios.filter(m => m.regiao === regiao).length,
  })).filter(r => r.value > 0);

  // Top municipalities with all proposals combined
  const topMunicipios = municipios
    .map(m => ({
      name: m.nome,
      value: (sugestaoCounts[m.nome] || 0) + (propostaTecnicaCounts[m.id] || 0),
    }))
    .filter(r => r.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

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
                <h1 className="text-xl font-display font-bold">Municípios</h1>
                <p className="text-sm text-muted-foreground">
                  {municipios.length} de 399 municípios cadastrados
                </p>
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
                    Novo Município
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingMunicipio ? 'Editar Município' : 'Novo Município'}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="nome">Nome *</Label>
                      <Input
                        id="nome"
                        value={formData.nome}
                        onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                        placeholder="Nome do município"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="codigo_ibge">Código IBGE</Label>
                        <Input
                          id="codigo_ibge"
                          value={formData.codigo_ibge}
                          onChange={(e) => setFormData({ ...formData, codigo_ibge: e.target.value })}
                          placeholder="4106902"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="regiao">Região</Label>
                        <Select
                          value={formData.regiao}
                          onValueChange={(value) => setFormData({ ...formData, regiao: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            {regioes.map(r => (
                              <SelectItem key={r} value={r}>{r}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="latitude">Latitude</Label>
                        <Input
                          id="latitude"
                          type="number"
                          step="any"
                          value={formData.latitude}
                          onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                          placeholder="-25.4284"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="longitude">Longitude</Label>
                        <Input
                          id="longitude"
                          type="number"
                          step="any"
                          value={formData.longitude}
                          onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                          placeholder="-49.2733"
                        />
                      </div>
                    </div>
                    
                    <div className="flex justify-end gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button type="submit">
                        {editingMunicipio ? 'Salvar Alterações' : 'Criar Município'}
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
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <Card>
              <CardContent className="py-6 text-center">
                <MapPin className="w-8 h-8 mx-auto mb-2 text-primary" />
                <p className="text-3xl font-bold">{municipios.length}</p>
                <p className="text-sm text-muted-foreground">Municípios Cadastrados</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-6 text-center">
                <p className="text-3xl font-bold">{399 - municipios.length}</p>
                <p className="text-sm text-muted-foreground">Faltam Cadastrar</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-6 text-center">
                <p className="text-3xl font-bold text-blue-600">{totalPropostasTecnicas}</p>
                <p className="text-sm text-muted-foreground">Propostas Técnicas</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-6 text-center">
                <p className="text-3xl font-bold text-purple-600">{propostaPoliticaTotal}</p>
                <p className="text-sm text-muted-foreground">Propostas Políticas</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-6 text-center">
                <p className="text-3xl font-bold text-emerald-600">{totalSugestoes}</p>
                <p className="text-sm text-muted-foreground">Sugestões Populares</p>
              </CardContent>
            </Card>
          </div>

          {/* Timeline Chart */}
          <div className="mb-6">
            <TimelineChart
              title="Evolução de Sugestões por Município"
              series={[
                {
                  key: 'sugestoes',
                  label: 'Sugestões Recebidas',
                  color: 'hsl(210, 100%, 50%)',
                  data: sugestoes,
                },
              ]}
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <AdminPieChart
              title="Municípios por Região"
              data={countByRegiao}
            />
            <AdminPieChart
              title="Top Municípios com Sugestões"
              data={topMunicipios}
            />
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="py-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar municípios..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={filterRegiao} onValueChange={setFilterRegiao}>
                  <SelectTrigger className="w-full md:w-[250px]">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Região" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as regiões</SelectItem>
                    {regioes.map(r => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Municípios ({filteredMunicipios.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredMunicipios.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum município encontrado</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Região</TableHead>
                        <TableHead className="text-center">Prop. Técnicas</TableHead>
                        <TableHead className="text-center">Sugestões Pop.</TableHead>
                        <TableHead className="text-center">Total</TableHead>
                        {isAdmin && <TableHead className="text-right">Ações</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMunicipios.slice(0, 50).map(municipio => {
                        const tecnicas = propostaTecnicaCounts[municipio.id] || 0;
                        const populares = sugestaoCounts[municipio.nome] || 0;
                        const total = tecnicas + populares;
                        return (
                        <TableRow key={municipio.id}>
                          <TableCell className="font-medium">{municipio.nome}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {municipio.regiao || '-'}
                          </TableCell>
                          <TableCell className="text-center">{tecnicas}</TableCell>
                          <TableCell className="text-center">{populares}</TableCell>
                          <TableCell className="text-center font-bold">{total}</TableCell>
                          {isAdmin && (
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEdit(municipio)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(municipio.id)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  {filteredMunicipios.length > 50 && (
                    <p className="text-center text-sm text-muted-foreground py-4">
                      Mostrando 50 de {filteredMunicipios.length} municípios
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
};

export default AdminMunicipios;
