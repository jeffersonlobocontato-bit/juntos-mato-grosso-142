import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2, Sparkles, X, BarChart3, User, Maximize2, Minimize2, Presentation, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ResearchChartRenderer, ChartData, parseChartDataFromMessage } from './ResearchChartRenderer';
import { PesquisaSelector } from './PesquisaSelector';
import { ConversationSidebar } from './ConversationSidebar';
import { PresentationViewer } from './PresentationViewer';
import { useConversations } from '@/hooks/useConversations';
import { supabase } from '@/integrations/supabase/client';
import { Presentation as PresentationType } from './slides/types';

interface AIAgent {
  id: string;
  name: string;
  description: string | null;
  system_prompt: string;
  agent_type: string;
  is_active: boolean;
  avatar_url: string | null;
  conversation_starters: string[];
  target_audience: string | null;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

interface ParsedMessage {
  role: 'user' | 'assistant';
  content: string;
  text: string;
  charts: ChartData[];
}

interface Pesquisa {
  id: string;
  titulo: string;
  instituto: string;
  data_publicacao: string | null;
  tipo_pesquisa: string;
}

interface ResearchAnalystChatProps {
  agent: AIAgent;
  onClose: () => void;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-hub-chat`;

export const ResearchAnalystChat = ({ agent, onClose }: ResearchAnalystChatProps) => {
  const [messages, setMessages] = useState<ParsedMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [availablePesquisas, setAvailablePesquisas] = useState<Pesquisa[]>([]);
  const [selectedPesquisaIds, setSelectedPesquisaIds] = useState<string[]>([]);
  const [loadingPesquisas, setLoadingPesquisas] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [generatingPresentation, setGeneratingPresentation] = useState(false);
  const [showPresentation, setShowPresentation] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    conversations,
    isLoading: conversationsLoading,
    activeConversationId,
    activeConversation,
    createConversation,
    updateConversation,
    deleteConversation,
    deletePresentation,
    selectConversation,
  } = useConversations(agent.id);

  // Fetch available pesquisas on mount
  useEffect(() => {
    const fetchPesquisas = async () => {
      try {
        const { data, error } = await supabase
          .from('pesquisas_eleitorais')
          .select('id, titulo, instituto, data_publicacao, tipo_pesquisa')
          .eq('is_active', true)
          .eq('status', 'ativa')
          .order('data_publicacao', { ascending: false });

        if (error) throw error;

        setAvailablePesquisas(data || []);
        // Select all by default
        setSelectedPesquisaIds(data?.map(p => p.id) || []);
      } catch (error) {
        console.error('Error fetching pesquisas:', error);
      } finally {
        setLoadingPesquisas(false);
      }
    };

    fetchPesquisas();
  }, []);

  // Load conversation when selected
  useEffect(() => {
    if (activeConversation) {
      const parsedMessages: ParsedMessage[] = activeConversation.messages.map(msg => {
        const { text, charts } = msg.role === 'assistant' 
          ? parseChartDataFromMessage(msg.content)
          : { text: msg.content, charts: [] };
        return {
          role: msg.role,
          content: msg.content,
          text,
          charts,
        };
      });
      setMessages(parsedMessages);
      
      if (activeConversation.selected_pesquisa_ids.length > 0) {
        setSelectedPesquisaIds(activeConversation.selected_pesquisa_ids);
      }
    }
  }, [activeConversation]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const generateTitle = (firstMessage: string): string => {
    // Truncate to max 50 chars, break at word boundary
    const maxLength = 50;
    if (firstMessage.length <= maxLength) return firstMessage;
    
    const truncated = firstMessage.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    return (lastSpace > 20 ? truncated.substring(0, lastSpace) : truncated) + '...';
  };

  const saveConversation = useCallback(async (
    allMessages: ParsedMessage[],
    isNewConversation: boolean,
    currentConversationId: string | null
  ) => {
    const messagesToSave = allMessages.map(m => ({ role: m.role, content: m.content }));
    
    if (isNewConversation && !currentConversationId) {
      // Find first user message for title
      const firstUserMessage = allMessages.find(m => m.role === 'user');
      const title = firstUserMessage ? generateTitle(firstUserMessage.content) : 'Nova Conversa';
      
      await createConversation({
        agentId: agent.id,
        title,
        messages: messagesToSave,
        selectedPesquisaIds,
      });
    } else if (currentConversationId) {
      await updateConversation(currentConversationId, {
        messages: messagesToSave,
        selectedPesquisaIds,
      });
    }
  }, [agent.id, createConversation, updateConversation, selectedPesquisaIds]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: ParsedMessage = { 
      role: 'user', 
      content: content.trim(),
      text: content.trim(),
      charts: []
    };
    
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    let assistantContent = '';
    const isNewConversation = !activeConversationId;

    try {
      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          agent_id: agent.id,
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          selected_pesquisa_ids: selectedPesquisaIds,
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          toast.error('Limite de requisições excedido. Tente novamente em alguns segundos.');
          setIsLoading(false);
          return;
        }
        if (response.status === 402) {
          toast.error('Créditos de IA esgotados. Entre em contato com o administrador.');
          setIsLoading(false);
          return;
        }
        throw new Error('Failed to start stream');
      }

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let streamDone = false;

      // Add empty assistant message
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: '', 
        text: '',
        charts: []
      }]);

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const contentDelta = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (contentDelta) {
              assistantContent += contentDelta;
              const { text, charts } = parseChartDataFromMessage(assistantContent);
              
              setMessages(prev => {
                const updatedMessages = [...prev];
                const lastMessage = updatedMessages[updatedMessages.length - 1];
                if (lastMessage?.role === 'assistant') {
                  lastMessage.content = assistantContent;
                  lastMessage.text = text;
                  lastMessage.charts = charts;
                }
                return updatedMessages;
              });
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Final flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split('\n')) {
          if (!raw) continue;
          if (raw.endsWith('\r')) raw = raw.slice(0, -1);
          if (raw.startsWith(':') || raw.trim() === '') continue;
          if (!raw.startsWith('data: ')) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const contentDelta = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (contentDelta) {
              assistantContent += contentDelta;
              const { text, charts } = parseChartDataFromMessage(assistantContent);
              
              setMessages(prev => {
                const updatedMessages = [...prev];
                const lastMessage = updatedMessages[updatedMessages.length - 1];
                if (lastMessage?.role === 'assistant') {
                  lastMessage.content = assistantContent;
                  lastMessage.text = text;
                  lastMessage.charts = charts;
                }
                return updatedMessages;
              });
            }
          } catch {
            // Ignore
          }
        }
      }

      // Save conversation after AI response
      setMessages(currentMessages => {
        // Use setTimeout to ensure we have the final messages
        setTimeout(() => {
          saveConversation(currentMessages, isNewConversation, activeConversationId);
        }, 100);
        return currentMessages;
      });

    } catch (error) {
      console.error('Chat error:', error);
      toast.error('Erro ao enviar mensagem. Tente novamente.');
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant' && !last.content) {
          return prev.slice(0, -1);
        }
        return prev;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleStarterClick = (starter: string) => {
    sendMessage(starter);
  };

  const handleNewConversation = () => {
    selectConversation(null);
    setMessages([]);
  };

  const handleRenameConversation = (id: string, newTitle: string) => {
    updateConversation(id, { title: newTitle });
  };

  const handleGeneratePresentation = async () => {
    if (!activeConversationId || messages.length === 0) {
      toast.error('É necessário ter uma conversa ativa para gerar uma apresentação');
      return;
    }

    setGeneratingPresentation(true);

    try {
      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          agent_id: agent.id,
          messages: [
            ...messages.map(m => ({ role: m.role, content: m.content })),
            { 
              role: 'user', 
              content: `[[GENERATE_PRESENTATION]]
Gere uma apresentação executiva baseada na análise acima.

RETORNE APENAS um JSON válido no seguinte formato (sem texto adicional, markdown ou explicações):
{
  "slides": [
    {
      "id": "slide-1",
      "type": "cover",
      "title": "Título da Apresentação",
      "subtitle": "Subtítulo opcional",
      "content": "Informações adicionais separadas por \\n"
    },
    {
      "id": "slide-2", 
      "type": "content",
      "title": "Contexto da Análise",
      "bullets": ["Ponto 1", "Ponto 2", "Ponto 3"]
    },
    {
      "id": "slide-3",
      "type": "chart",
      "title": "Intenção de Voto",
      "subtitle": "Dados atuais",
      "chart": { "type": "pie", "title": "Intenção de Voto", "data": [{"name": "Candidato A", "value": 45}, {"name": "Candidato B", "value": 35}] }
    },
    {
      "id": "slide-4",
      "type": "conclusion",
      "title": "Conclusões",
      "bullets": ["Conclusão 1", "Conclusão 2"]
    },
    {
      "id": "slide-5",
      "type": "recommendations",
      "title": "Recomendações Estratégicas",
      "bullets": ["Recomendação 1", "Recomendação 2"]
    }
  ],
  "title": "Título da Apresentação",
  "theme": "default"
}

Tipos de slides permitidos: cover, content, chart, conclusion, recommendations
Tipos de gráficos permitidos: pie, bar, line, comparison

IMPORTANTE: Retorne APENAS o JSON, sem nenhum texto antes ou depois.`
            }
          ],
          selected_pesquisa_ids: selectedPesquisaIds,
        }),
      });

      if (!response.ok) {
        throw new Error('Falha ao gerar apresentação');
      }

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      let textBuffer = '';
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;

        // Accumulate chunks in buffer
        textBuffer += decoder.decode(value, { stream: true });

        // Process complete lines only
        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          // Clean line
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) fullContent += delta;
          } catch {
            // If parse fails, put line back in buffer (incomplete)
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Final flush - process any remaining data in buffer
      if (textBuffer.trim()) {
        const remainingLines = textBuffer.split('\n');
        for (let raw of remainingLines) {
          if (!raw) continue;
          if (raw.endsWith('\r')) raw = raw.slice(0, -1);
          if (raw.startsWith(':') || raw.trim() === '') continue;
          if (!raw.startsWith('data: ')) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) fullContent += delta;
          } catch {
            // Ignore incomplete final chunks
          }
        }
      }

      // Clean and parse the JSON from the response
      let cleanedContent = fullContent.trim();

      // Remove markdown code blocks if present
      cleanedContent = cleanedContent.replace(/^```json?\s*/i, '');
      cleanedContent = cleanedContent.replace(/```\s*$/i, '');
      cleanedContent = cleanedContent.replace(/```json\s*/gi, '');
      cleanedContent = cleanedContent.replace(/```\s*/gi, '');
      cleanedContent = cleanedContent.trim();

      // Remove any text before the first { and after the last }
      const jsonStart = cleanedContent.indexOf('{');
      const jsonEnd = cleanedContent.lastIndexOf('}');

      if (jsonStart === -1 || jsonEnd === -1) {
        console.error('JSON não encontrado na resposta:', fullContent.substring(0, 500));
        throw new Error('Não foi possível extrair JSON da resposta');
      }

      let jsonString = cleanedContent.substring(jsonStart, jsonEnd + 1);

      // Fix common JSON issues
      jsonString = jsonString
        .replace(/,\s*}/g, '}')  // Remove trailing commas before }
        .replace(/,\s*]/g, ']')  // Remove trailing commas before ]
        .replace(/[\u201C\u201D]/g, '"')  // Replace smart quotes
        .replace(/[\u2018\u2019]/g, "'"); // Replace smart apostrophes

      let presentationData;
      try {
        presentationData = JSON.parse(jsonString);
      } catch (parseError) {
        console.error('Erro ao parsear JSON:', parseError);
        console.error('JSON recebido:', jsonString.substring(0, 1000));
        throw new Error('JSON inválido na resposta da IA');
      }
      
      // Validate basic structure
      if (!presentationData.slides || !Array.isArray(presentationData.slides)) {
        throw new Error('Estrutura de apresentação inválida');
      }

      const presentation: PresentationType = {
        slides: presentationData.slides,
        title: presentationData.title || 'Apresentação de Análise',
        theme: presentationData.theme || 'default',
        generated_at: new Date().toISOString(),
      };

      // Save to conversation
      await updateConversation(activeConversationId, { presentation });

      toast.success('Apresentação gerada com sucesso!');
      setShowPresentation(true);

    } catch (error) {
      console.error('Error generating presentation:', error);
      toast.error('Erro ao gerar apresentação. Tente novamente.');
    } finally {
      setGeneratingPresentation(false);
    }
  };

  const handleDeletePresentation = async () => {
    if (activeConversationId) {
      await deletePresentation(activeConversationId);
      setShowPresentation(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
      <div className={`fixed bg-background border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ${
        isFullscreen 
          ? 'inset-2' 
          : 'inset-4 md:inset-8 lg:inset-12'
      }`}>
        {/* Header */}
        <header className="bg-card/80 backdrop-blur-lg border-b border-border px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">{agent.name}</h1>
              <p className="text-xs text-muted-foreground">
                Análise estratégica com visualizações dinâmicas
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
            >
              {isFullscreen ? (
                <Minimize2 className="h-5 w-5" />
              ) : (
                <Maximize2 className="h-5 w-5" />
              )}
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </header>

        {/* Pesquisa Selector Toolbar */}
        <PesquisaSelector
          pesquisas={availablePesquisas}
          selectedIds={selectedPesquisaIds}
          onSelectionChange={setSelectedPesquisaIds}
          isLoading={loadingPesquisas}
        />

        {/* Main Content Area with Sidebar */}
        <div className="flex-1 flex overflow-hidden">
          {/* Conversation Sidebar */}
          <ConversationSidebar
            conversations={conversations}
            activeConversationId={activeConversationId}
            onSelectConversation={selectConversation}
            onNewConversation={handleNewConversation}
            onRenameConversation={handleRenameConversation}
            onDeleteConversation={deleteConversation}
            isLoading={conversationsLoading}
            isCollapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          />

          {/* Chat Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center py-12">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center mb-4">
                    <BarChart3 className="w-10 h-10 text-primary-foreground" />
                  </div>
                  <h2 className="text-xl font-semibold mb-2">{agent.name}</h2>
                  <p className="text-muted-foreground text-center max-w-lg mb-6">
                    Analiso pesquisas eleitorais, identifico tendências e gero visualizações estratégicas automaticamente.
                  </p>

                  {/* Conversation Starters */}
                  {Array.isArray(agent.conversation_starters) && agent.conversation_starters.length > 0 && (
                    <div className="flex flex-wrap gap-2 justify-center max-w-2xl">
                      {agent.conversation_starters.map((starter, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleStarterClick(starter)}
                          className="px-4 py-2 bg-muted hover:bg-muted/80 rounded-full text-sm transition-colors flex items-center gap-2 text-left"
                        >
                          <Sparkles className="w-3 h-3 text-primary flex-shrink-0" />
                          <span className="line-clamp-1">{starter}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-6 pb-4 max-w-4xl mx-auto">
                  <AnimatePresence>
                    {messages.map((message, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        {message.role === 'assistant' && (
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center flex-shrink-0">
                            <BarChart3 className="w-4 h-4 text-primary-foreground" />
                          </div>
                        )}
                        
                        <div className={`${message.role === 'user' ? 'max-w-[75%]' : 'flex-1 min-w-0'}`}>
                          <Card className={`p-4 ${
                            message.role === 'user' 
                              ? 'bg-primary text-primary-foreground' 
                              : 'bg-muted'
                          }`}>
                            {message.text || message.content ? (
                              message.role === 'assistant' ? (
                                <div className="prose prose-sm dark:prose-invert max-w-none break-words overflow-hidden">
                                  <ReactMarkdown 
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                      table: ({ children }) => (
                                        <div className="overflow-x-auto my-2">
                                          <table className="min-w-full border-collapse text-xs">{children}</table>
                                        </div>
                                      ),
                                      th: ({ children }) => (
                                        <th className="border border-border bg-muted px-2 py-1 text-left font-medium">{children}</th>
                                      ),
                                      td: ({ children }) => (
                                        <td className="border border-border px-2 py-1">{children}</td>
                                      ),
                                      p: ({ children }) => (
                                        <p className="mb-2 last:mb-0">{children}</p>
                                      ),
                                      strong: ({ children }) => (
                                        <strong className="font-semibold text-foreground">{children}</strong>
                                      ),
                                      ul: ({ children }) => (
                                        <ul className="list-disc pl-4 my-2 space-y-1">{children}</ul>
                                      ),
                                      ol: ({ children }) => (
                                        <ol className="list-decimal pl-4 my-2 space-y-1">{children}</ol>
                                      ),
                                    }}
                                  >
                                    {message.text}
                                  </ReactMarkdown>
                                </div>
                              ) : (
                                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                              )
                            ) : (
                              <div className="flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span className="text-sm">Analisando dados...</span>
                              </div>
                            )}
                          </Card>
                          
                          {/* Charts below the message */}
                          {message.role === 'assistant' && message.charts.length > 0 && (
                            <ResearchChartRenderer charts={message.charts} />
                          )}
                        </div>

                        {message.role === 'user' && (
                          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                            <User className="w-4 h-4 text-primary" />
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {/* Presentation Action Bar */}
                  {messages.length > 0 && messages.some(m => m.role === 'assistant' && m.content) && activeConversationId && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-center gap-3 pt-6 pb-2"
                    >
                      {activeConversation?.presentation ? (
                        <Button
                          variant="outline"
                          onClick={() => setShowPresentation(true)}
                          className="gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          Ver Apresentação
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          onClick={handleGeneratePresentation}
                          disabled={generatingPresentation || isLoading}
                          className="gap-2"
                        >
                          {generatingPresentation ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Gerando...
                            </>
                          ) : (
                            <>
                              <Presentation className="w-4 h-4" />
                              Gerar Apresentação
                            </>
                          )}
                        </Button>
                      )}
                    </motion.div>
                  )}
                </div>
              )}
            </ScrollArea>

            {/* Input Area */}
            <div className="border-t border-border p-4 bg-background">
              <form onSubmit={handleSubmit} className="flex gap-2 max-w-4xl mx-auto">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Faça perguntas sobre as pesquisas eleitorais..."
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button type="submit" disabled={isLoading || !input.trim()}>
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Presentation Viewer Modal */}
      <AnimatePresence>
        {showPresentation && activeConversation?.presentation && (
          <PresentationViewer
            presentation={activeConversation.presentation}
            onClose={() => setShowPresentation(false)}
            onDelete={handleDeletePresentation}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
