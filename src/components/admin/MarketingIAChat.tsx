import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Sparkles, Send, Loader2, BarChart3, Clapperboard, Film, PenLine, Trash2 } from 'lucide-react';
import MarkdownRenderer from '@/components/admin/MarkdownRenderer';

interface Msg { role: 'user' | 'assistant'; content: string }

type Modo = 'dados' | 'video' | 'reels' | 'copy';

const MODOS: { id: Modo; label: string; icon: typeof BarChart3; placeholder: string }[] = [
  { id: 'dados', label: 'Analisar dados', icon: BarChart3, placeholder: 'Ex: o que esse recorte revela sobre a principal dor do público?' },
  { id: 'video', label: 'Roteiro de vídeo', icon: Clapperboard, placeholder: 'Ex: roteiro de vídeo institucional sobre segurança pra esse público' },
  { id: 'reels', label: 'Roteiro de reels', icon: Film, placeholder: 'Ex: reels curto sobre educação pra esse recorte' },
  { id: 'copy', label: 'Copy de redes', icon: PenLine, placeholder: 'Ex: 3 variações de legenda sobre infraestrutura' },
];

const CHIPS_POR_MODO: Record<Modo, string[]> = {
  dados: ['Qual o gatilho emocional dominante nesse recorte?', 'Que persona esse recorte sugere?'],
  video: ['Roteiro de vídeo institucional (90s) pra esse público', 'Roteiro focado no tema mais citado desse recorte'],
  reels: ['Reels de 20s com gancho nos 3 primeiros segundos', 'Reels no formato depoimento pra esse recorte'],
  copy: ['3 variações de legenda pra Instagram', 'Copy de anúncio pago com CTA de participação'],
};

export default function MarketingIAChat({ authorized, regioesDisponiveis, municipiosDisponiveis }: {
  authorized: boolean;
  regioesDisponiveis: string[];
  municipiosDisponiveis: string[];
}) {
  const [modo, setModo] = useState<Modo>('dados');
  const [genero, setGenero] = useState('all');
  const [regiao, setRegiao] = useState('all');
  const [eixo, setEixo] = useState('all');
  const [municipio, setMunicipio] = useState('all');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [totalRecorte, setTotalRecorte] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || loading || !authorized) return;
    setInput('');
    const next = [...messages, { role: 'user' as const, content: question }];
    setMessages(next);
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('agente-marketing-eleitoral', {
        body: { messages: next, modo, filtros: { genero, regiao, eixo, municipio } },
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setMessages([...next, { role: 'assistant', content: (data as any)?.content || 'Sem resposta.' }]);
      setTotalRecorte((data as any)?.total_no_recorte ?? null);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Erro ao consultar o agente');
      setMessages(next);
    } finally {
      setLoading(false);
    }
  };

  const limpar = () => { setMessages([]); setTotalRecorte(null); };

  return (
    <Card className="border-l-4 shadow-sm" style={{ borderLeftColor: 'hsl(var(--accent))' }}>
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <span className="w-9 h-9 rounded-full flex items-center justify-center bg-primary/10">
            <Sparkles className="w-4 h-4 text-primary" />
          </span>
          <div className="leading-tight">
            <p className="font-display font-bold text-sm text-primary">Agente de Marketing Eleitoral</p>
            <p className="text-[11px] text-muted-foreground">
              Só enxerga sugestões populares — nenhuma outra base da plataforma. Gera ideias com nota técnica de neuromarketing em cada peça.
            </p>
          </div>
        </div>

        {/* Modo */}
        <div className="flex flex-wrap gap-2">
          {MODOS.map(m => (
            <Button
              key={m.id}
              type="button"
              size="sm"
              variant={modo === m.id ? 'default' : 'outline'}
              onClick={() => setModo(m.id)}
              className="h-8 text-xs"
            >
              <m.icon className="w-3.5 h-3.5 mr-1.5" />
              {m.label}
            </Button>
          ))}
        </div>

        {/* Filtros de segmentação */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Select value={genero} onValueChange={setGenero}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Gênero" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os gêneros</SelectItem>
              <SelectItem value="masculino">Masculino</SelectItem>
              <SelectItem value="feminino">Feminino</SelectItem>
              <SelectItem value="indefinido">Não identificado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={eixo} onValueChange={setEixo}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Eixo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os eixos</SelectItem>
              <SelectItem value="Desenvolvimento Social">Desenvolvimento Social</SelectItem>
              <SelectItem value="Desenvolvimento das Cidades e Infraestrutura">Cidades e Infraestrutura</SelectItem>
              <SelectItem value="Desenvolvimento Econômico Sustentável">Econômico Sustentável</SelectItem>
              <SelectItem value="Segurança, Justiça, Combate à Corrupção">Segurança e Justiça</SelectItem>
              <SelectItem value="Gestão Pública Eficiente">Gestão Pública Eficiente</SelectItem>
              <SelectItem value="Geral">Geral</SelectItem>
            </SelectContent>
          </Select>
          <Select value={regiao} onValueChange={(v) => { setRegiao(v); setMunicipio('all'); }}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Região" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as regiões</SelectItem>
              {regioesDisponiveis.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={municipio} onValueChange={setMunicipio}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Cidade" /></SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="all">Todas as cidades</SelectItem>
              {municipiosDisponiveis.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <p className="text-[11px] text-muted-foreground -mt-2">
          Segmentações disponíveis na base: gênero, eixo, região e cidade. Não há faixa etária — a plataforma não coleta data de nascimento.
        </p>

        {/* Chips por modo */}
        <div className="flex flex-wrap gap-2">
          {CHIPS_POR_MODO[modo].map(c => (
            <button
              key={c}
              type="button"
              onClick={() => send(c)}
              className="text-[11px] rounded-full border border-border px-3 py-1 hover:bg-muted transition-colors"
            >
              {c}
            </button>
          ))}
          {messages.length > 0 && (
            <button type="button" onClick={limpar} className="text-[11px] text-muted-foreground hover:text-destructive flex items-center gap-1">
              <Trash2 className="w-3 h-3" />limpar conversa
            </button>
          )}
        </div>

        {totalRecorte !== null && (
          <p className="text-[11px] text-muted-foreground">Última resposta considerou {totalRecorte.toLocaleString('pt-BR')} sugestões no recorte atual.</p>
        )}

        {/* Mensagens */}
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
                <Loader2 className="w-3 h-3 animate-spin" />gerando com base no recorte selecionado...
              </p>
            )}
          </div>
        )}

        {/* Input */}
        <form className="flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); send(input); }}>
          <Textarea
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }}
            placeholder={MODOS.find(m => m.id === modo)?.placeholder}
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
