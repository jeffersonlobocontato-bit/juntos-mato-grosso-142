import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import MarkdownRenderer from '@/components/admin/MarkdownRenderer';
import AIConfigPanel from '@/components/admin/AIConfigPanel';
import { 
  ArrowLeft, 
  Send, 
  Sparkles, 
  FileText, 
  Lightbulb,
  Copy,
  Loader2,
  MapPin,
  Target,
  Building2
} from 'lucide-react';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

type Municipio = {
  id: string;
  nome: string;
  regiao: string | null;
};

type Eixo = {
  id: string;
  nome: string;
};

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
  'Sudoeste'
];

const AdminPlanoGoverno = () => {
  const { user, roles, isLoading: authLoading, isAdmin, hasRole } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Mode state
  const [isBrainstormMode, setIsBrainstormMode] = useState(false);

  // Plan mode filters
  const [planScope, setPlanScope] = useState<'estadual' | 'regional'>('estadual');
  const [selectedRegion, setSelectedRegion] = useState<string>('');

  // Brainstorm mode filters
  const [locationFilter, setLocationFilter] = useState<'regiao' | 'cidade'>('regiao');
  const [brainstormRegion, setBrainstormRegion] = useState<string>('');
  const [brainstormCity, setBrainstormCity] = useState<string>('');
  const [brainstormEixo, setBrainstormEixo] = useState<string>('');

  // Data
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [eixos, setEixos] = useState<Eixo[]>([]);

  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);

  // Check authorization
  const isAuthorized = isAdmin || hasRole('lider_tematico');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    } else if (!authLoading && user && !isAuthorized) {
      toast({
        title: "Acesso negado",
        description: "Você não tem permissão para acessar esta página.",
        variant: "destructive"
      });
      navigate('/admin');
    }
  }, [user, authLoading, isAuthorized, navigate, toast]);

  // Fetch municipios and eixos
  useEffect(() => {
    const fetchData = async () => {
      const [municipiosRes, eixosRes] = await Promise.all([
        supabase.from('municipios').select('id, nome, regiao').order('nome'),
        supabase.from('eixos_tematicos').select('id, nome').order('nome')
      ]);

      if (municipiosRes.data) setMunicipios(municipiosRes.data);
      if (eixosRes.data) setEixos(eixosRes.data);
    };

    if (user && isAuthorized) {
      fetchData();
    }
  }, [user, isAuthorized]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Get filtered cities based on selected region
  const filteredCities = brainstormRegion 
    ? municipios.filter(m => m.regiao === brainstormRegion)
    : municipios;

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isStreaming) return;

    const userMessage: Message = { role: 'user', content: inputMessage };
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsStreaming(true);

    try {
      const payload = {
        messages: [...messages, userMessage],
        mode: isBrainstormMode ? 'brainstorm' : 'plano',
        filters: isBrainstormMode 
          ? {
              locationType: locationFilter,
              regiao: locationFilter === 'regiao' ? brainstormRegion : undefined,
              cidade: locationFilter === 'cidade' ? brainstormCity : undefined,
              eixo: brainstormEixo
            }
          : {
              scope: planScope,
              regiao: planScope === 'regional' ? selectedRegion : undefined
            }
      };

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/plano-governo-ai`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
          },
          body: JSON.stringify(payload)
        }
      );

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Acesso não autorizado');
        }
        if (response.status === 429) {
          throw new Error('Limite de requisições excedido. Tente novamente em alguns minutos.');
        }
        throw new Error('Erro ao processar mensagem');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Stream não disponível');

      const decoder = new TextDecoder();
      let assistantContent = '';

      // Add empty assistant message
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                assistantContent += content;
                setMessages(prev => {
                  const newMessages = [...prev];
                  newMessages[newMessages.length - 1] = {
                    role: 'assistant',
                    content: assistantContent
                  };
                  return newMessages;
                });
              }
            } catch {
              // Ignore parse errors for incomplete chunks
            }
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao enviar mensagem",
        variant: "destructive"
      });
      // Remove the empty assistant message if error
      setMessages(prev => prev.filter(m => m.content !== ''));
    } finally {
      setIsStreaming(false);
    }
  };

  const handleCopyLastResponse = () => {
    const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant');
    if (lastAssistant) {
      navigator.clipboard.writeText(lastAssistant.content);
      toast({
        title: "Copiado!",
        description: "Resposta copiada para a área de transferência"
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !isAuthorized) {
    return null;
  }

  return (
    <div className="min-h-screen bg-muted/20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/admin">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-display font-bold flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Gerador de Plano de Governo
                </h1>
                <p className="text-sm text-muted-foreground">
                  IA para criar planos e brainstorming de propostas
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="max-w-5xl mx-auto">
          {/* Mode Toggle */}
          <Card className="mb-6">
            <CardContent className="py-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={`flex items-center gap-2 ${!isBrainstormMode ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                    <FileText className="w-5 h-5" />
                    <span>Modo Plano</span>
                  </div>
                  <Switch
                    checked={isBrainstormMode}
                    onCheckedChange={(checked) => {
                      setIsBrainstormMode(checked);
                      clearChat();
                    }}
                  />
                  <div className={`flex items-center gap-2 ${isBrainstormMode ? 'text-accent font-medium' : 'text-muted-foreground'}`}>
                    <Lightbulb className="w-5 h-5" />
                    <span>Modo Brainstorming</span>
                  </div>
                </div>

                {messages.length > 0 && (
                  <Button variant="outline" size="sm" onClick={clearChat}>
                    Limpar Chat
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* AI Configuration Panel - Admin Only */}
          <AIConfigPanel isAdmin={isAdmin} />

          {/* Filters */}
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                {isBrainstormMode ? (
                  <>
                    <Lightbulb className="w-4 h-4 text-accent" />
                    Filtros de Brainstorming
                  </>
                ) : (
                  <>
                    <Target className="w-4 h-4 text-primary" />
                    Escopo do Plano
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!isBrainstormMode ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Abrangência</Label>
                    <Select value={planScope} onValueChange={(v) => setPlanScope(v as 'estadual' | 'regional')}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="estadual">
                          <span className="flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            Plano Estadual
                          </span>
                        </SelectItem>
                        <SelectItem value="regional">
                          <span className="flex items-center gap-2">
                            <Building2 className="w-4 h-4" />
                            Plano Regional
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {planScope === 'regional' && (
                    <div className="space-y-2">
                      <Label>Região</Label>
                      <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a região" />
                        </SelectTrigger>
                        <SelectContent>
                          {REGIOES.map(regiao => (
                            <SelectItem key={regiao} value={regiao}>{regiao}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Filtrar por</Label>
                    <Select value={locationFilter} onValueChange={(v) => {
                      setLocationFilter(v as 'regiao' | 'cidade');
                      setBrainstormCity('');
                    }}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="regiao">Região</SelectItem>
                        <SelectItem value="cidade">Cidade</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {locationFilter === 'regiao' ? (
                    <div className="space-y-2">
                      <Label>Região</Label>
                      <Select value={brainstormRegion} onValueChange={setBrainstormRegion}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a região" />
                        </SelectTrigger>
                        <SelectContent>
                          {REGIOES.map(regiao => (
                            <SelectItem key={regiao} value={regiao}>{regiao}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label>Região (opcional)</Label>
                      <Select value={brainstormRegion || "__all__"} onValueChange={(v) => {
                          setBrainstormRegion(v === "__all__" ? "" : v);
                          setBrainstormCity('');
                        }}>
                          <SelectTrigger>
                            <SelectValue placeholder="Filtrar por região" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__all__">Todas as regiões</SelectItem>
                            {REGIOES.map(regiao => (
                              <SelectItem key={regiao} value={regiao}>{regiao}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Cidade</Label>
                        <Select value={brainstormCity} onValueChange={setBrainstormCity}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a cidade" />
                          </SelectTrigger>
                          <SelectContent>
                            {filteredCities.filter(cidade => cidade.nome).map(cidade => (
                              <SelectItem key={cidade.id} value={cidade.nome}>{cidade.nome}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}

                  <div className="space-y-2">
                    <Label>Eixo Temático</Label>
                    <Select value={brainstormEixo || "__all__"} onValueChange={(v) => setBrainstormEixo(v === "__all__" ? "" : v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o eixo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">Todos os eixos</SelectItem>
                        {eixos.map(eixo => (
                          <SelectItem key={eixo.id} value={eixo.nome}>{eixo.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Chat Area */}
          <Card className="mb-4">
            <CardContent className="p-0">
              <ScrollArea className="h-[400px] p-4">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground">
                    <Sparkles className="w-12 h-12 mb-4 text-primary/30" />
                    <h3 className="text-lg font-medium mb-2">
                      {isBrainstormMode 
                        ? 'Modo Brainstorming Ativo' 
                        : 'Gerador de Plano de Governo'}
                    </h3>
                    <p className="max-w-md">
                      {isBrainstormMode 
                        ? 'Peça ideias de propostas e discursos baseados nas sugestões da população e propostas técnicas existentes.'
                        : 'Solicite a criação de planos de governo técnicos seguindo melhores práticas de políticas públicas.'}
                    </p>
                    <div className="mt-4 text-sm">
                      <p className="font-medium text-foreground mb-1">Exemplos de perguntas:</p>
                      {isBrainstormMode ? (
                        <ul className="space-y-1">
                          <li>• "Sugira propostas para saúde baseadas nas demandas da população"</li>
                          <li>• "Crie pontos de discurso sobre educação para esta região"</li>
                          <li>• "Quais são as principais demandas da população sobre infraestrutura?"</li>
                        </ul>
                      ) : (
                        <ul className="space-y-1">
                          <li>• "Crie um plano de governo para o eixo de saúde"</li>
                          <li>• "Elabore metas e indicadores para educação"</li>
                          <li>• "Estruture um plano integrado para desenvolvimento econômico"</li>
                        </ul>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((message, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-lg px-4 py-3 ${
                            message.role === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          {message.role === 'assistant' ? (
                            message.content ? (
                              <MarkdownRenderer content={message.content} />
                            ) : (
                              <span className="flex items-center gap-2 text-muted-foreground text-sm">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Pensando...
                              </span>
                            )
                          ) : (
                            <div className="whitespace-pre-wrap text-sm">
                              {message.content}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Input Area */}
          <div className="flex gap-2">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={
                isBrainstormMode 
                  ? "Peça ideias de propostas ou discursos..." 
                  : "Solicite a criação de um plano de governo..."
              }
              disabled={isStreaming}
              className="flex-1"
            />
            {messages.some(m => m.role === 'assistant' && m.content) && (
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyLastResponse}
                title="Copiar última resposta"
              >
                <Copy className="w-4 h-4" />
              </Button>
            )}
            <Button 
              onClick={handleSendMessage} 
              disabled={!inputMessage.trim() || isStreaming}
            >
              {isStreaming ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminPlanoGoverno;
