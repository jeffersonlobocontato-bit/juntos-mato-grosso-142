import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Compass, ChevronDown, ChevronUp, Send, Loader2, Trash2 } from 'lucide-react';
import MarkdownRenderer from '@/components/admin/MarkdownRenderer';

const NAVY = '#1F3864';

interface Msg { role: 'user' | 'assistant'; content: string }

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
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open, loading]);

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || loading) return;
    setOpen(true);
    setInput('');
    const next = [...messages, { role: 'user' as const, content: question }];
    setMessages(next);
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('cruzamento-territorial-ai', {
        body: { messages: next },
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setMessages([...next, { role: 'assistant', content: (data as any)?.content || 'Sem resposta.' }]);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Erro ao consultar o agente');
      setMessages(next);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sticky top-[73px] z-40 bg-muted/20/ backdrop-blur-md pt-3 pb-2">
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
                <Button variant="ghost" size="sm" className="h-6 text-[11px]" onClick={() => setMessages([])}>
                  <Trash2 className="w-3 h-3 mr-1" />limpar
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
