// Portado (versão simplificada, sem streaming, sem persistência de threads)
// da plataforma Politiza IA (politiza.ia.br).
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Sparkles, Target, AlertTriangle, Users, CheckCircle2 } from 'lucide-react';
import { INSIGHTS_JSON_PROMPT, type InsightsPayload, type InsightItem } from './prompts';

interface Props {
  context: unknown;
}

function extractJson(text: string): InsightsPayload | null {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1)) as InsightsPayload;
  } catch {
    return null;
  }
}

function InsightCard({
  icon: Icon, title, tone, item,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  tone: 'primary' | 'destructive' | 'secondary' | 'accent';
  item: InsightItem;
}) {
  if (!item) return null;
  const toneClass = tone === 'destructive' ? 'border-destructive/40'
    : tone === 'secondary' ? 'border-secondary/40'
    : tone === 'accent' ? 'border-accent/40' : 'border-primary/40';
  return (
    <Card className={`${toneClass} border-l-4`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Icon className="w-4 h-4" />
          {title}
        </CardTitle>
        {item.titulo && <p className="text-base font-bold leading-tight">{item.titulo}</p>}
      </CardHeader>
      <CardContent className="space-y-2 text-xs">
        {item.dado_origem && (
          <p><span className="text-muted-foreground uppercase tracking-wide text-[10px]">Dado</span><br />{item.dado_origem}</p>
        )}
        {item.leitura && (
          <p><span className="text-muted-foreground uppercase tracking-wide text-[10px]">Leitura</span><br />{item.leitura}</p>
        )}
        {item.acao && (
          <p><span className="text-muted-foreground uppercase tracking-wide text-[10px]">Ação</span><br /><span className="font-medium">{item.acao}</span></p>
        )}
        {item.risco && (
          <p className="text-destructive/80"><AlertTriangle className="w-3 h-3 inline mr-1" />{item.risco}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function InsightsComunicacao({ context }: Props) {
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<InsightsPayload | null>(null);
  const [rawFallback, setRawFallback] = useState<string | null>(null);
  const [geradoEm, setGeradoEm] = useState<Date | null>(null);

  const gerar = async () => {
    setLoading(true);
    setRawFallback(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('chat-inteligencia-mt', {
        body: { message: INSIGHTS_JSON_PROMPT, context },
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const text = (data as any)?.content || '';
      const parsed = extractJson(text);
      if (parsed) {
        setInsights(parsed);
        setGeradoEm(new Date());
      } else {
        setInsights(null);
        setRawFallback(text);
        toast.error('Não foi possível interpretar a resposta como JSON. Exibindo texto bruto.');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao gerar insights');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Insights de Comunicação Eleitoral
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Leitura estratégica gerada a partir das pesquisas cadastradas no painel.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {geradoEm && (
              <span className="text-[10px] text-muted-foreground">Gerado em {geradoEm.toLocaleString('pt-BR')}</span>
            )}
            <Button onClick={gerar} disabled={loading} size="sm" className="gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {insights || rawFallback ? 'Regenerar insights' : 'Gerar insights'}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {!insights && !rawFallback && !loading && (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Clique em <strong>Gerar insights</strong> para transformar os dados do painel em leitura estratégica.
          </CardContent>
        </Card>
      )}

      {loading && !insights && (
        <Card>
          <CardContent className="py-12 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            Analisando os dados do painel…
          </CardContent>
        </Card>
      )}

      {rawFallback && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Resposta bruta</CardTitle></CardHeader>
          <CardContent><pre className="whitespace-pre-wrap text-xs">{rawFallback}</pre></CardContent>
        </Card>
      )}

      {insights && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InsightCard icon={Target} tone="primary" title="Leitura principal" item={insights.leitura_principal} />
            <InsightCard icon={AlertTriangle} tone="destructive" title="Ponto de atenção" item={insights.ponto_de_atencao} />
            <InsightCard icon={Sparkles} tone="secondary" title="Oportunidade" item={insights.oportunidade} />
            <InsightCard icon={Users} tone="accent" title="Público a observar" item={insights.publico_a_observar} />
          </div>

          {Array.isArray(insights.recomendacoes) && insights.recomendacoes.length > 0 && (
            <Card className="border-primary/50 border-2">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary" /> Recomendações
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-2 text-sm list-decimal list-inside">
                  {insights.recomendacoes.filter(Boolean).map((a, i) => <li key={i} className="leading-relaxed">{a}</li>)}
                </ol>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
