import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
import AdminPieChart from '@/components/admin/AdminPieChart';
import { 
  ArrowLeft, 
  Users, 
  MessageCircle, 
  FileText, 
  ClipboardList,
  Download,
  Search,
  Calendar
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Json } from '@/integrations/supabase/types';

interface Lead {
  id: string;
  nome: string | null;
  email: string | null;
  whatsapp: string | null;
  municipio: string | null;
  origem: 'formulario' | 'chatbot' | 'proposta';
  created_at: string;
  metadata: Json;
}

const AdminLeads = () => {
  const { user, roles, isLoading: authLoading, isAdmin } = useAuth();
  const navigate = useNavigate();
  
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [origemFilter, setOrigemFilter] = useState<string>('all');
  const [municipioFilter, setMunicipioFilter] = useState<string>('all');
  const [municipios, setMunicipios] = useState<string[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        const { data, error } = await supabase
          .from('leads')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        setLeads(data || []);
        setFilteredLeads(data || []);

        // Extract unique municipios
        const uniqueMunicipios = [...new Set(
          (data || [])
            .map(lead => lead.municipio)
            .filter((m): m is string => !!m)
        )].sort();
        setMunicipios(uniqueMunicipios);
      } catch (error) {
        console.error('Error fetching leads:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchLeads();
    }
  }, [user]);

  useEffect(() => {
    let filtered = leads;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(lead =>
        lead.nome?.toLowerCase().includes(term) ||
        lead.email?.toLowerCase().includes(term) ||
        lead.whatsapp?.includes(term) ||
        lead.municipio?.toLowerCase().includes(term)
      );
    }

    if (origemFilter !== 'all') {
      filtered = filtered.filter(lead => lead.origem === origemFilter);
    }

    if (municipioFilter !== 'all') {
      filtered = filtered.filter(lead => lead.municipio === municipioFilter);
    }

    setFilteredLeads(filtered);
  }, [leads, searchTerm, origemFilter, municipioFilter]);

  const hasAccess = isAdmin || 
    roles.includes('lider_tematico') || 
    roles.includes('curador_municipal');

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin text-4xl">⏳</div>
      </div>
    );
  }

  if (!user || !hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Você não tem permissão para acessar esta página.</p>
            <Button className="mt-4" onClick={() => navigate('/admin')}>
              Voltar ao Painel
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate stats
  const totalLeads = leads.length;
  const leadsByOrigem = {
    formulario: leads.filter(l => l.origem === 'formulario').length,
    chatbot: leads.filter(l => l.origem === 'chatbot').length,
    proposta: leads.filter(l => l.origem === 'proposta').length,
  };

  const origemChartData = [
    { name: 'Formulário', value: leadsByOrigem.formulario, color: 'hsl(var(--primary))' },
    { name: 'Chatbot', value: leadsByOrigem.chatbot, color: 'hsl(var(--accent))' },
    { name: 'Proposta', value: leadsByOrigem.proposta, color: 'hsl(var(--secondary))' },
  ].filter(d => d.value > 0);

  // Get leads by top 5 municipios
  const leadsByMunicipio = leads.reduce((acc, lead) => {
    if (lead.municipio) {
      acc[lead.municipio] = (acc[lead.municipio] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const topMunicipiosData = Object.entries(leadsByMunicipio)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, value], i) => ({
      name,
      value,
      color: ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--secondary))', 'hsl(142 76% 36%)', 'hsl(280 65% 60%)'][i],
    }));

  const getOrigemLabel = (origem: string) => {
    switch (origem) {
      case 'formulario': return 'Formulário';
      case 'chatbot': return 'Chatbot';
      case 'proposta': return 'Proposta';
      default: return origem;
    }
  };

  const getOrigemIcon = (origem: string) => {
    switch (origem) {
      case 'formulario': return <ClipboardList className="w-4 h-4" />;
      case 'chatbot': return <MessageCircle className="w-4 h-4" />;
      case 'proposta': return <FileText className="w-4 h-4" />;
      default: return null;
    }
  };

  const handleExportCSV = () => {
    const headers = ['Nome', 'Email', 'WhatsApp', 'Município', 'Origem', 'Data'];
    const rows = filteredLeads.map(lead => [
      lead.nome || '',
      lead.email || '',
      lead.whatsapp || '',
      lead.municipio || '',
      getOrigemLabel(lead.origem),
      format(new Date(lead.created_at), 'dd/MM/yyyy HH:mm'),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `leads_rota399_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

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
              <h1 className="text-xl font-display font-bold">Gestão de Leads</h1>
            </div>
            <Button onClick={handleExportCSV} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total de Leads</p>
                    <p className="text-2xl font-bold">{totalLeads}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <ClipboardList className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Via Formulário</p>
                    <p className="text-2xl font-bold">{leadsByOrigem.formulario}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center">
                    <MessageCircle className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Via Chatbot</p>
                    <p className="text-2xl font-bold">{leadsByOrigem.chatbot}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-secondary/10 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-secondary-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Via Proposta</p>
                    <p className="text-2xl font-bold">{leadsByOrigem.proposta}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <AdminPieChart title="Distribuição por Origem" data={origemChartData} />
            <AdminPieChart title="Top 5 Municípios" data={topMunicipiosData} />
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome, email, whatsapp ou município..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={origemFilter} onValueChange={setOrigemFilter}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Filtrar por origem" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas origens</SelectItem>
                    <SelectItem value="formulario">Formulário</SelectItem>
                    <SelectItem value="chatbot">Chatbot</SelectItem>
                    <SelectItem value="proposta">Proposta</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={municipioFilter} onValueChange={setMunicipioFilter}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Filtrar por município" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos municípios</SelectItem>
                    {municipios.map((municipio) => (
                      <SelectItem key={municipio} value={municipio}>
                        {municipio}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Leads Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Lista de Leads</span>
                <span className="text-sm font-normal text-muted-foreground">
                  {filteredLeads.length} resultado(s)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Contato</TableHead>
                      <TableHead>Município</TableHead>
                      <TableHead>Origem</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLeads.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          Nenhum lead encontrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredLeads.map((lead) => (
                        <TableRow key={lead.id}>
                          <TableCell className="font-medium">
                            {lead.nome || <span className="text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {lead.email && <p className="text-sm">{lead.email}</p>}
                              {lead.whatsapp && (
                                <p className="text-sm text-muted-foreground">{lead.whatsapp}</p>
                              )}
                              {!lead.email && !lead.whatsapp && (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {lead.municipio || <span className="text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getOrigemIcon(lead.origem)}
                              <span>{getOrigemLabel(lead.origem)}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Calendar className="w-4 h-4" />
                              <span>{format(new Date(lead.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
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

export default AdminLeads;
