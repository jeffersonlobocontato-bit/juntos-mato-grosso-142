import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Compass, ChevronDown, ChevronUp, Send, Loader2, Trash2, History, Plus, X } from 'lucide-react';
import MarkdownRenderer from '@/components/admin/MarkdownRenderer';

const NAVY = '#1F3864';

interface Msg { role: 'user' | 'assistant'; content: string }
interface Conversa { id: string; title: string; updatedAt: number; messages: Msg[] }

const STORAGE_KEY = 'cruzamento_territorial_chat_history';

function loadHistory(): Conversa[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveHistory(list: Conversa[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 50)));
  } catch { /* ignore quota */ }
}

const CHIPS = [
  'Qual região está mais engajada em segurança agora?',
  'O que Almirante Tamandaré está pedindo?',
  'Onde a demanda por saúde é maior do que a cobertura de propostas técnicas?',
  'Compare Oeste e Sudoeste Paranaense',
];

export default function CruzamentoTerritorialChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<Conversa[]>(() => loadHistory());
  const [showHistory, setShowHistory] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open, loading]);

  const persist = (id: string, msgs: Msg[]) => {
    setHistory(prev => {
      const title = msgs.find(m => m.role === 'user')?.content.slice(0, 80) || 'Conversa';
      const rest = prev.filter(c => c.id !== id);
      const next = [{ id, title, updatedAt: Date.now(), messages: msgs }, ...rest];
      saveHistory(next);
      return next;
    });
  };

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || loading) return;
    setOpen(true);
    setInput('');
    const convId = activeId ?? (crypto.randomUUID?.() || String(Date.now()));
    if (!activeId) setActiveId(convId);
    const next = [...messages, { role: 'user' as const, content: question }];
    setMessages(next);
    persist(convId, next);
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('cruzamento-territorial-ai', {
        body: { messages: next },
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const done: Msg[] = [...next, { role: 'assistant', content: (data as any)?.content || 'Sem resposta.' }];
      setMessages(done);
      persist(convId, done);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Erro ao consultar o agente');
      setMessages(next);
    } finally {
      setLoading(false);
    }
  };

  const novaConversa = () => {
    setMessages([]);
    setActiveId(null);
    setShowHistory(false);
    inputRef.current?.focus();
  };

  const abrirConversa = (c: Conversa) => {
    setMessages(c.messages);
    setActiveId(c.id);
    setShowHistory(false);
    setOpen(true);
  };

  const excluirConversa = (id: string) => {
    setHistory(prev => {
      const next = prev.filter(c => c.id !== id);
      saveHistory(next);
      return next;
    });
    if (activeId === id) { setMessages([]); setActiveId(null); }
  };

  return (
    <div className="sticky top-[73px] z-40 bg-muted/20 backdrop-blur-md pt-3 pb-2">
      <Card className="border-l-4 shadow-sm" style={{ borderLeftColor: NAVY }}>
        <div className="p-3 flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 shrink-0">
            <span className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${NAVY}15` }}>
              <Compass className="w-4 h-4" style={{ color: NAVY }} />
            </span>
            <div className="leading-tight">
              <p className="font-display font-bold text-sm" style={{ color: NAVY }}>Cruzamento Territorial IA</p>
              <p className="text-[11px] text-muted-foreground hidden sm:block">analista territorial das sugestões populares</p>
            </div>
          </div>

          <form
            className="flex-1 min-w-[240px] flex items-center gap-2"
            onSubmit={(e) => { e.preventDefault(); send(input); }}
          >
            <Textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onFocus={() => setOpen(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); }
              }}
              placeholder="Pergunte ao Cruzamento Territorial IA sobre qualquer região ou cidade"
              className="min-h-[40px] max-h-24 resize-none py-2"
            />
            <Button type="submit" size="icon" disabled={loading || !input.trim()} style={{ backgroundColor: NAVY }}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </form>

          <Button variant="ghost" size="sm" onClick={() => setOpen(o => !o)}>
            {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>

        {open && (
          <div className="border-t border-border">
            <div className="px-3 pt-3 flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-[11px]"
                onClick={() => setShowHistory(s => !s)}
              >
                <History className="w-3 h-3 mr-1" />
                Histórico de conversas ({history.length})
                {showHistory ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
              </Button>
              <Button variant="ghost" size="sm" className="h-7 text-[11px]" onClick={novaConversa}>
                <Plus className="w-3 h-3 mr-1" />nova conversa
              </Button>
            </div>

            {showHistory && (
              <div className="px-3 pt-2">
                <div className="rounded-md border border-border bg-muted/30 max-h-56 overflow-y-auto divide-y divide-border">
                  {history.length === 0 && (
                    <p className="p-3 text-[11px] text-muted-foreground">Nenhuma conversa salva ainda.</p>
                  )}
                  {history.map(c => (
                    <div key={c.id} className="flex items-center gap-2 px-3 py-2 hover:bg-muted/60">
                      <button
                        type="button"
                        onClick={() => abrirConversa(c)}
                        className="flex-1 text-left min-w-0"
                      >
                        <p className="text-xs truncate" style={{ color: NAVY }}>{c.title}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(c.updatedAt).toLocaleString('pt-BR')} · {c.messages.length} mensagens
                        </p>
                      </button>
                      <button
                        type="button"
                        aria-label="Excluir conversa"
                        onClick={() => excluirConversa(c.id)}
                        className="text-muted-foreground hover:text-destructive shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="p-3 flex flex-wrap gap-2">
              {CHIPS.map(c => (
                <Badge
                  key={c}
                  variant="outline"
                  onClick={() => send(c)}
                  className="cursor-pointer hover:bg-muted text-[11px] font-normal"
                >
                  {c}
                </Badge>
              ))}
              {messages.length > 0 && (
                <Button variant="ghost" size="sm" className="h-6 text-[11px]" onClick={novaConversa}>
                  <Trash2 className="w-3 h-3 mr-1" />limpar tela
                </Button>
              )}
            </div>

            {(messages.length > 0 || loading) && (
              <div ref={scrollRef} className="max-h-[45vh] overflow-y-auto px-4 pb-4 space-y-4">
                {messages.map((m, i) => (
                  <div key={i} className={m.role === 'user' ? 'flex justify-end' : ''}>
                    {m.role === 'user' ? (
                      <div className="rounded-lg px-3 py-2 text-sm text-primary-foreground max-w-[80%]" style={{ backgroundColor: NAVY }}>
                        {m.content}
                      </div>
                    ) : (
                      <div className="text-sm">
                        <MarkdownRenderer content={m.content} />
                      </div>
                    )}
                  </div>
                ))}
                {loading && (
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin" />consultando as bases do painel...
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
