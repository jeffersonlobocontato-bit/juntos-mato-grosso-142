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
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Search, 
  Users,
  Eye,
  Trash2,
  Filter,
  Download,
  MessageSquare
} from 'lucide-react';

interface Sugestao {
  id: string;
  nome: string | null;
  email: string | null;
  whatsapp: string | null;
  municipio: string;
  eixo: string;
  descricao: string;
  publico: boolean;
  created_at: string;
}

const eixosList = [
  "Educação",
  "Saúde",
  "Segurança Pública",
  "Infraestrutura",
  "Agricultura e Meio Ambiente",
  "Economia e Turismo",
  "Desenvolvimento Social",
  "Tecnologia e Inovação",
];

const AdminSugestoes = () => {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [sugestoes, setSugestoes] = useState<Sugestao[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEixo, setFilterEixo] = useState<string>('all');
  
  // View dialog
  const [viewingSugestao, setViewingSugestao] = useState<Sugestao | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchSugestoes();
    }
  }, [user]);

  const fetchSugestoes = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('sugestoes_populares')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      toast.error('Erro ao carregar sugestões');
      console.error(error);
    } else {
      setSugestoes(data || []);
    }
    setIsLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta sugestão?')) return;
    
    const { error } = await supabase
      .from('sugestoes_populares')
      .delete()
      .eq('id', id);
    
    if (error) {
      toast.error('Erro ao excluir sugestão');
    } else {
      toast.success('Sugestão excluída');
      fetchSugestoes();
    }
  };

  const handleExportCSV = () => {
    const headers = ['Nome', 'Email', 'WhatsApp', 'Município', 'Eixo', 'Descrição', 'Data'];
    const rows = filteredSugestoes.map(s => [
      s.nome || '',
      s.email || '',
      s.whatsapp || '',
      s.municipio,
      s.eixo,
      s.descricao.replace(/"/g, '""'),
      new Date(s.created_at).toLocaleDateString('pt-BR')
    ]);
    
    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `sugestoes_rota399_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    toast.success('Arquivo CSV exportado com sucesso');
  };

  const filteredSugestoes = sugestoes.filter(s => {
    const matchesSearch = 
      (s.nome?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      s.municipio.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.descricao.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesEixo = filterEixo === 'all' || s.eixo === filterEixo;
    return matchesSearch && matchesEixo;
  });

  const countByEixo = (eixo: string) => sugestoes.filter(s => s.eixo === eixo).length;

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
                <h1 className="text-xl font-display font-bold">Sugestões Populares</h1>
                <p className="text-sm text-muted-foreground">Visualizar sugestões da população</p>
              </div>
            </div>
            
            <Button variant="outline" onClick={handleExportCSV}>
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
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
          {/* Stats by Eixo */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {eixosList.slice(0, 4).map(eixo => (
              <Card key={eixo}>
                <CardContent className="py-4 text-center">
                  <p className="text-2xl font-bold">{countByEixo(eixo)}</p>
                  <p className="text-xs text-muted-foreground truncate">{eixo}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="py-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome, município ou conteúdo..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={filterEixo} onValueChange={setFilterEixo}>
                  <SelectTrigger className="w-full md:w-[250px]">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Eixo temático" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os eixos</SelectItem>
                    {eixosList.map(eixo => (
                      <SelectItem key={eixo} value={eixo}>
                        {eixo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Total */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              <span className="font-medium">
                {filteredSugestoes.length} sugestões encontradas
              </span>
            </div>
          </div>

          {/* Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Sugestões Recebidas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredSugestoes.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma sugestão encontrada</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Município</TableHead>
                        <TableHead>Eixo</TableHead>
                        <TableHead>Prévia</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSugestoes.map(sugestao => (
                        <TableRow key={sugestao.id}>
                          <TableCell className="font-medium">
                            {sugestao.nome || <span className="text-muted-foreground italic">Anônimo</span>}
                          </TableCell>
                          <TableCell>{sugestao.municipio}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs">
                              {sugestao.eixo}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate text-muted-foreground">
                            {sugestao.descricao}
                          </TableCell>
                          <TableCell>
                            {new Date(sugestao.created_at).toLocaleDateString('pt-BR')}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setViewingSugestao(sugestao)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(sugestao.id)}
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

      {/* View Dialog */}
      <Dialog open={!!viewingSugestao} onOpenChange={() => setViewingSugestao(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes da Sugestão</DialogTitle>
          </DialogHeader>
          {viewingSugestao && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Nome</p>
                  <p className="font-medium">{viewingSugestao.nome || 'Anônimo'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Município</p>
                  <p className="font-medium">{viewingSugestao.municipio}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{viewingSugestao.email || 'Não informado'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">WhatsApp</p>
                  <p className="font-medium">{viewingSugestao.whatsapp || 'Não informado'}</p>
                </div>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground mb-1">Eixo Temático</p>
                <Badge variant="secondary">{viewingSugestao.eixo}</Badge>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground mb-1">Sugestão</p>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="whitespace-pre-wrap">{viewingSugestao.descricao}</p>
                </div>
              </div>
              
              <div className="text-sm text-muted-foreground">
                Enviado em {new Date(viewingSugestao.created_at).toLocaleString('pt-BR')}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSugestoes;
