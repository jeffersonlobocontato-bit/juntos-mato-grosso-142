// Portado (adaptado ao padrão de chat já usado na plataforma MT, em vez do
// kit "ai-elements" do Politiza, que não existe aqui) da plataforma Politiza
// IA (politiza.ia.br).
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Sparkles, Send, Loader2, Trash2 } from 'lucide-react';
import MarkdownRenderer from '@/components/admin/MarkdownRenderer';
import { SUGESTOES_ANALISE } from './prompts';

interface Msg { role: 'user' | 'assistant'; content: string }

export default function AnaliseIAChat({ context }: { context: unknown }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || loading) return;
    setInput('');
    const next = [...messages, { role: 'user' as const, content: question }];
    setMessages(next);
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('chat-inteligencia-mt', {
        body: { messages: next, context },
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setMessages([...next, { role: 'assistant', content: (data as any)?.content || 'Sem resposta.' }]);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Erro ao consultar o analista de inteligência');
      setMessages(next);
    } finally {
      setLoading(false);
    }
  };

  const limpar = () => setMessages([]);

  return (
    <Card className="border-l-4 shadow-sm" style={{ borderLeftColor: 'hsl(var(--accent))' }}>
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <span className="w-9 h-9 rounded-full flex items-center justify-center bg-primary/10">
            <Sparkles className="w-4 h-4 text-primary" />
          </span>
          <div className="leading-tight">
            <p className="font-display font-bold text-sm text-primary">Analista de Inteligência</p>
            <p className="text-[11px] text-muted-foreground">
              Responde só com base nas pesquisas cadastradas no painel — não inventa números.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {SUGESTOES_ANALISE.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => send(s)}
              className="text-[11px] rounded-full border border-border px-3 py-1 hover:bg-muted transition-colors"
            >
              {s}
            </button>
          ))}
          {messages.length > 0 && (
            <button type="button" onClick={limpar} className="text-[11px] text-muted-foreground hover:text-destructive flex items-center gap-1">
              <Trash2 className="w-3 h-3" />limpar conversa
            </button>
          )}
        </div>

        {(messages.length > 0 || loading) && (
          <div ref={scrollRef} className="max-h-[50vh] overflow-y-auto space-y-4 border-t border-border pt-3">
            {messages.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'flex justify-end' : ''}>
                {m.role === 'user' ? (
                  <div className="rounded-lg px-3 py-2 text-sm bg-primary text-primary-foreground max-w-[80%]">
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
                <Loader2 className="w-3 h-3 animate-spin" />analisando os dados do painel...
              </p>
            )}
          </div>
        )}

        <form className="flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); send(input); }}>
          <Textarea
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }}
            placeholder="Pergunte sobre os dados do painel..."
            className="resize-none"
          />
          <Button type="submit" size="icon" disabled={loading || !input.trim()}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </form>
      </div>
    </Card>
  );
}
