import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Send, Bot, User, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AgentChatProps {
  agent: AIAgent;
  onClose: () => void;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-hub-chat`;

export const AgentChat = ({ agent, onClose }: AgentChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: content.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    let assistantContent = '';

    try {
      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          agent_id: agent.id,
          messages: [...messages, userMessage],
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
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

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
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setMessages(prev => {
                const newMessages = [...prev];
                const lastMessage = newMessages[newMessages.length - 1];
                if (lastMessage?.role === 'assistant') {
                  lastMessage.content = assistantContent;
                }
                return newMessages;
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
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setMessages(prev => {
                const newMessages = [...prev];
                const lastMessage = newMessages[newMessages.length - 1];
                if (lastMessage?.role === 'assistant') {
                  lastMessage.content = assistantContent;
                }
                return newMessages;
              });
            }
          } catch {
            // Ignore
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      toast.error('Erro ao enviar mensagem. Tente novamente.');
      // Remove empty assistant message on error
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-lg border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onClose}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                {agent.avatar_url ? (
                  <img 
                    src={agent.avatar_url} 
                    alt={agent.name}
                    className="w-full h-full rounded-xl object-cover"
                  />
                ) : (
                  <Bot className="w-5 h-5 text-white" />
                )}
              </div>
              <div>
                <h1 className="text-lg font-semibold text-foreground">{agent.name}</h1>
                {agent.description && (
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {agent.description}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mb-4">
                <Bot className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-xl font-semibold mb-2">{agent.name}</h2>
              <p className="text-muted-foreground text-center max-w-md mb-6">
                {agent.description || 'Comece uma conversa enviando uma mensagem.'}
              </p>

              {/* Conversation Starters */}
              {Array.isArray(agent.conversation_starters) && agent.conversation_starters.length > 0 && (
                <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                  {agent.conversation_starters.map((starter, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleStarterClick(starter)}
                      className="px-4 py-2 bg-muted hover:bg-muted/80 rounded-full text-sm transition-colors flex items-center gap-2"
                    >
                      <Sparkles className="w-3 h-3 text-violet-400" />
                      {starter}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4 pb-4">
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
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                    )}
                    
                    <Card className={`max-w-[80%] p-4 ${
                      message.role === 'user' 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted'
                    }`}>
                      {message.content ? (
                        message.role === 'assistant' ? (
                          <div className="prose prose-sm dark:prose-invert max-w-none">
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
                              }}
                            >
                              {message.content}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        )
                      ) : (
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-sm">Pensando...</span>
                        </div>
                      )}
                    </Card>

                    {message.role === 'user' && (
                      <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </ScrollArea>

        {/* Input Area */}
        <div className="border-t border-border p-4 bg-background">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Digite sua mensagem..."
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
  );
};
