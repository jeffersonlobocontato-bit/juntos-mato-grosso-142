import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  ArrowLeft, 
  Bell,
  Mail,
  MessageSquare,
  Send,
  Users,
  Clock,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Search
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface InactiveUser {
  user_id: string;
  full_name: string | null;
  email: string | null;
  last_activity_at: string;
  hours_inactive: number;
  roles: string[];
}

interface AdminMessage {
  id: string;
  sender_id: string;
  recipient_ids: string[];
  subject: string;
  content: string;
  channel: string;
  message_type: string;
  status: string;
  sent_at: string | null;
  created_at: string;
}

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
}

const AdminMensageria = () => {
  const { user, roles, isLoading: authLoading, isAdmin, hasRole } = useAuth();
  const navigate = useNavigate();

  const isLiderTematico = hasRole('lider_tematico');
  const canAccess = isAdmin || isLiderTematico;

  const [activeTab, setActiveTab] = useState('inactivos');
  const [inactiveUsers, setInactiveUsers] = useState<InactiveUser[]>([]);
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [allUsers, setAllUsers] = useState<Profile[]>([]);
  const [userEixos, setUserEixos] = useState<string[]>([]);
  const [eixosUsers, setEixosUsers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [messageSubject, setMessageSubject] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [messageChannel, setMessageChannel] = useState<string>('email');
  const [isSending, setIsSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [hoursThreshold, setHoursThreshold] = useState(48);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && canAccess) {
      fetchData();
    }
  }, [user, canAccess]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchInactiveUsers(),
        fetchMessages(),
        fetchAllUsers()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchInactiveUsers = async () => {
    const { data, error } = await supabase.rpc('get_inactive_users', {
      hours_threshold: hoursThreshold
    });

    if (error) {
      console.error('Error fetching inactive users:', error);
      return;
    }

    setInactiveUsers(data || []);
  };

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('admin_messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching messages:', error);
      return;
    }

    setMessages(data || []);
  };

  const fetchAllUsers = async () => {
    // First, get current user's eixos if lider_tematico
    if (isLiderTematico && !isAdmin && user) {
      const { data: myEixos } = await supabase
        .from('user_eixos')
        .select('eixo_id')
        .eq('user_id', user.id);
      
      const eixoIds = myEixos?.map(e => e.eixo_id) || [];
      setUserEixos(eixoIds);

      if (eixoIds.length > 0) {
        // Get users that belong to these eixos
        const { data: usersInEixos } = await supabase
          .from('user_eixos')
          .select('user_id')
          .in('eixo_id', eixoIds);
        
        const userIds = [...new Set(usersInEixos?.map(u => u.user_id) || [])];
        setEixosUsers(userIds);

        // Fetch only those profiles
        if (userIds.length > 0) {
          const { data, error } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', userIds)
            .order('full_name');

          if (!error && data) {
            setAllUsers(data);
          }
        }
        return;
      }
    }

    // For admins, fetch all users
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .order('full_name');

    if (error) {
      console.error('Error fetching users:', error);
      return;
    }

    setAllUsers(data || []);
  };

  const handleSelectUser = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedUsers(prev => [...prev, userId]);
    } else {
      setSelectedUsers(prev => prev.filter(id => id !== userId));
    }
  };

  const handleSelectAllInactive = (checked: boolean) => {
    if (checked) {
      setSelectedUsers(inactiveUsers.map(u => u.user_id));
    } else {
      setSelectedUsers([]);
    }
  };

  const handleSendMessage = async () => {
    if (selectedUsers.length === 0) {
      toast.error('Selecione pelo menos um destinatário');
      return;
    }
    if (!messageSubject.trim()) {
      toast.error('Digite um assunto');
      return;
    }
    if (!messageContent.trim()) {
      toast.error('Digite o conteúdo da mensagem');
      return;
    }

    setIsSending(true);
    try {
      const { error } = await supabase
        .from('admin_messages')
        .insert({
          sender_id: user!.id,
          recipient_ids: selectedUsers,
          subject: messageSubject,
          content: messageContent,
          channel: messageChannel,
          message_type: 'manual',
          status: 'pending'
        });

      if (error) throw error;

      toast.success('Mensagem registrada com sucesso!');
      setMessageSubject('');
      setMessageContent('');
      setSelectedUsers([]);
      setIsDialogOpen(false);
      fetchMessages();
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Erro ao enviar mensagem');
    } finally {
      setIsSending(false);
    }
  };

  const handleSendInactivityAlert = async (userId: string) => {
    const user = inactiveUsers.find(u => u.user_id === userId);
    if (!user) return;

    const alertContent = `Olá ${user.full_name || 'participante'},

Identificamos que você está há ${user.hours_inactive} horas sem atividade na plataforma Rota 399.

Lembramos da importância de se manter ativo no engajamento de especialistas e lideranças nas cidades para popular as propostas do plano de governo popular.

Sua participação é fundamental para o sucesso desta iniciativa colaborativa!

Acesse a plataforma e continue contribuindo: ${window.location.origin}

Equipe Rota 399`;

    try {
      const { error } = await supabase
        .from('admin_messages')
        .insert({
          sender_id: user!.user_id,
          recipient_ids: [userId],
          subject: 'Lembrete de atividade - Rota 399',
          content: alertContent,
          channel: 'email',
          message_type: 'automatic_inactivity',
          status: 'pending'
        });

      if (error) throw error;

      await supabase
        .from('inactivity_alerts')
        .insert({
          user_id: userId,
          hours_inactive: user.hours_inactive,
          channel: 'email'
        });

      toast.success(`Alerta enviado para ${user.full_name || user.email}`);
      fetchMessages();
    } catch (error) {
      console.error('Error sending alert:', error);
      toast.error('Erro ao enviar alerta');
    }
  };

  const handleSendAlertToAll = async () => {
    if (inactiveUsers.length === 0) {
      toast.info('Não há usuários inativos no momento');
      return;
    }

    for (const user of inactiveUsers) {
      await handleSendInactivityAlert(user.user_id);
    }
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: 'Admin',
      lider_tematico: 'Líder Temático',
      curador_municipal: 'Curador Municipal',
      especialista: 'Especialista'
    };
    return labels[role] || role;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge className="bg-green-500">Enviado</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pendente</Badge>;
      case 'failed':
        return <Badge variant="destructive">Falhou</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email':
        return <Mail className="w-4 h-4" />;
      case 'whatsapp':
        return <MessageSquare className="w-4 h-4" />;
      case 'both':
        return (
          <div className="flex gap-1">
            <Mail className="w-4 h-4" />
            <MessageSquare className="w-4 h-4" />
          </div>
        );
      default:
        return null;
    }
  };

  const filteredAllUsers = allUsers.filter(u => 
    (u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
     u.email?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-muted/20 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className="min-h-screen bg-muted/20 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Acesso Restrito</h2>
            <p className="text-muted-foreground mb-4">
              Esta área é restrita a administradores e líderes temáticos.
            </p>
            <Button onClick={() => navigate('/admin')}>
              Voltar ao Painel
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/admin">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-display font-bold text-foreground">
                  Gestão de Tarefas e Mensageria
                </h1>
                <p className="text-sm text-muted-foreground">
                  Alertas automáticos e comunicação com membros técnicos
                </p>
              </div>
            </div>
            <Button onClick={fetchData} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-destructive/10">
                    <AlertTriangle className="w-6 h-6 text-destructive" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{inactiveUsers.length}</p>
                    <p className="text-sm text-muted-foreground">Usuários Inativos</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-primary/10">
                    <Mail className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{messages.filter(m => m.status === 'sent').length}</p>
                    <p className="text-sm text-muted-foreground">Mensagens Enviadas</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-yellow-500/10">
                    <Clock className="w-6 h-6 text-yellow-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{messages.filter(m => m.status === 'pending').length}</p>
                    <p className="text-sm text-muted-foreground">Pendentes</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-accent/10">
                    <Users className="w-6 h-6 text-accent-foreground" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{allUsers.length}</p>
                    <p className="text-sm text-muted-foreground">Total Usuários</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="inactivos" className="gap-2">
              <AlertTriangle className="w-4 h-4" />
              Usuários Inativos
            </TabsTrigger>
            <TabsTrigger value="mensagens" className="gap-2">
              <Mail className="w-4 h-4" />
              Enviar Mensagem
            </TabsTrigger>
            <TabsTrigger value="historico" className="gap-2">
              <Clock className="w-4 h-4" />
              Histórico
            </TabsTrigger>
          </TabsList>

          {/* Tab: Usuários Inativos */}
          <TabsContent value="inactivos">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-destructive" />
                      Usuários Inativos ({inactiveUsers.length})
                    </CardTitle>
                    <CardDescription>
                      Membros técnicos sem atividade há mais de {hoursThreshold} horas
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Limite:</span>
                      <Select
                        value={String(hoursThreshold)}
                        onValueChange={(v) => {
                          setHoursThreshold(Number(v));
                          setTimeout(fetchInactiveUsers, 100);
                        }}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="24">24h</SelectItem>
                          <SelectItem value="48">48h</SelectItem>
                          <SelectItem value="72">72h</SelectItem>
                          <SelectItem value="168">7 dias</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button 
                      onClick={handleSendAlertToAll}
                      disabled={inactiveUsers.length === 0}
                      className="gap-2"
                    >
                      <Bell className="w-4 h-4" />
                      Alertar Todos
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {inactiveUsers.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                    <p className="text-lg font-medium">Todos os usuários estão ativos!</p>
                    <p className="text-muted-foreground">
                      Nenhum membro técnico está inativo há mais de {hoursThreshold} horas.
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={selectedUsers.length === inactiveUsers.length}
                            onCheckedChange={handleSelectAllInactive}
                          />
                        </TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Funções</TableHead>
                        <TableHead>Última Atividade</TableHead>
                        <TableHead>Tempo Inativo</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inactiveUsers.map((u) => (
                        <TableRow key={u.user_id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedUsers.includes(u.user_id)}
                              onCheckedChange={(checked) => 
                                handleSelectUser(u.user_id, checked as boolean)
                              }
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            {u.full_name || 'Sem nome'}
                          </TableCell>
                          <TableCell>{u.email}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {u.roles?.map((role) => (
                                <Badge key={role} variant="outline" className="text-xs">
                                  {getRoleLabel(role)}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            {format(new Date(u.last_activity_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </TableCell>
                          <TableCell>
                            <Badge variant="destructive">
                              {u.hours_inactive}h inativo
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSendInactivityAlert(u.user_id)}
                              className="gap-1"
                            >
                              <Bell className="w-3 h-3" />
                              Alertar
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}

                {selectedUsers.length > 0 && (
                  <div className="mt-4 p-4 bg-muted rounded-lg flex items-center justify-between">
                    <span className="text-sm">
                      {selectedUsers.length} usuário(s) selecionado(s)
                    </span>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                      <DialogTrigger asChild>
                        <Button className="gap-2">
                          <Send className="w-4 h-4" />
                          Enviar Mensagem
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-lg">
                        <DialogHeader>
                          <DialogTitle>Enviar Mensagem</DialogTitle>
                          <DialogDescription>
                            Envie uma mensagem para {selectedUsers.length} usuário(s) selecionado(s)
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <label className="text-sm font-medium">Canal</label>
                            <Select value={messageChannel} onValueChange={setMessageChannel}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="email">Email</SelectItem>
                                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                                <SelectItem value="both">Ambos</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className="text-sm font-medium">Assunto</label>
                            <Input
                              value={messageSubject}
                              onChange={(e) => setMessageSubject(e.target.value)}
                              placeholder="Assunto da mensagem"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium">Mensagem</label>
                            <Textarea
                              value={messageContent}
                              onChange={(e) => setMessageContent(e.target.value)}
                              placeholder="Digite sua mensagem..."
                              rows={6}
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                            Cancelar
                          </Button>
                          <Button onClick={handleSendMessage} disabled={isSending}>
                            {isSending ? 'Enviando...' : 'Enviar'}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Enviar Mensagem */}
          <TabsContent value="mensagens">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="w-5 h-5 text-primary" />
                  Enviar Mensagem Manual
                </CardTitle>
                <CardDescription>
                  Selecione os destinatários e componha sua mensagem
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Lista de usuários */}
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Search className="w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar usuário..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <div className="border rounded-lg max-h-96 overflow-y-auto">
                      {filteredAllUsers.map((u) => (
                        <div
                          key={u.id}
                          className="flex items-center gap-3 p-3 border-b last:border-b-0 hover:bg-muted/50"
                        >
                          <Checkbox
                            checked={selectedUsers.includes(u.id)}
                            onCheckedChange={(checked) => 
                              handleSelectUser(u.id, checked as boolean)
                            }
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{u.full_name || 'Sem nome'}</p>
                            <p className="text-sm text-muted-foreground truncate">{u.email}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      {selectedUsers.length} selecionado(s)
                    </p>
                  </div>

                  {/* Formulário de mensagem */}
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Canal de Envio</label>
                      <Select value={messageChannel} onValueChange={setMessageChannel}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="email">
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4" /> Email
                            </div>
                          </SelectItem>
                          <SelectItem value="whatsapp">
                            <div className="flex items-center gap-2">
                              <MessageSquare className="w-4 h-4" /> WhatsApp
                            </div>
                          </SelectItem>
                          <SelectItem value="both">
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4" />
                              <MessageSquare className="w-4 h-4" /> Ambos
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Assunto</label>
                      <Input
                        value={messageSubject}
                        onChange={(e) => setMessageSubject(e.target.value)}
                        placeholder="Assunto da mensagem"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Mensagem</label>
                      <Textarea
                        value={messageContent}
                        onChange={(e) => setMessageContent(e.target.value)}
                        placeholder="Digite sua mensagem..."
                        rows={8}
                      />
                    </div>
                    <Button 
                      onClick={handleSendMessage} 
                      disabled={isSending || selectedUsers.length === 0}
                      className="w-full gap-2"
                    >
                      <Send className="w-4 h-4" />
                      {isSending ? 'Enviando...' : 'Enviar Mensagem'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Histórico */}
          <TabsContent value="historico">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  Histórico de Mensagens
                </CardTitle>
                <CardDescription>
                  Últimas 50 mensagens enviadas
                </CardDescription>
              </CardHeader>
              <CardContent>
                {messages.length === 0 ? (
                  <div className="text-center py-12">
                    <Mail className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-lg font-medium">Nenhuma mensagem enviada</p>
                    <p className="text-muted-foreground">
                      As mensagens enviadas aparecerão aqui.
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Canal</TableHead>
                        <TableHead>Assunto</TableHead>
                        <TableHead>Destinatários</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {messages.map((msg) => (
                        <TableRow key={msg.id}>
                          <TableCell className="whitespace-nowrap">
                            {format(new Date(msg.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                          </TableCell>
                          <TableCell>
                            <Badge variant={msg.message_type === 'automatic_inactivity' ? 'secondary' : 'default'}>
                              {msg.message_type === 'automatic_inactivity' ? 'Automático' : 'Manual'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {getChannelIcon(msg.channel)}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {msg.subject}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {msg.recipient_ids.length} usuário(s)
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(msg.status)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminMensageria;
