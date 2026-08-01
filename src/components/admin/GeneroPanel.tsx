import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, Loader2, Users, ChevronDown, ChevronUp } from 'lucide-react';

const NAVY = '#1F3864';
const RED = '#C00000';
const MALE = '#2E5FA3';
const FEMALE = '#C0407A';

const db = supabase as any;

const rpc = async <T,>(fn: string, args?: Record<string, unknown>): Promise<T[]> => {
  const { data, error } = await db.rpc(fn, args ?? {});
  if (error) throw error;
  return (data ?? []) as T[];
};

export interface GeneroRegiao {
  mesorregiao: string;
  masculino: number;
  feminino: number;
  indefinido: number;
}

export const useGeneroPorRegiao = (enabled: boolean) =>
  useQuery({
    queryKey: ['pc-genero-regiao'],
    queryFn: async (): Promise<Record<string, GeneroRegiao>> => {
      const rows = await rpc<any>('painel_genero_por_regiao');
      const map: Record<string, GeneroRegiao> = {};
      rows.forEach((r) => {
        map[r.mesorregiao] = {
          mesorregiao: r.mesorregiao,
          masculino: Number(r.masculino ?? 0),
          feminino: Number(r.feminino ?? 0),
          indefinido: Number(r.indefinido ?? 0),
        };
      });
      return map;
    },
    enabled,
  });

interface Indefinido {
  sugestao_id: string;
  nome: string | null;
  municipio: string | null;
  trecho: string | null;
}

const GeneroPanel = ({ enabled }: { enabled: boolean }) => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [reclassificando, setReclassificando] = useState(false);
  const [salvando, setSalvando] = useState<string | null>(null);
  const [listaAberta, setListaAberta] = useState(false);

  const resumo = useQuery({
    queryKey: ['pc-genero-resumo'],
    queryFn: () => rpc<any>('painel_genero_resumo'),
    enabled,
  });

  const indefinidos = useQuery({
    queryKey: ['pc-genero-indefinidos'],
    queryFn: () => rpc<Indefinido>('painel_genero_indefinidos', { p_limite: 40, p_offset: 0 }),
    enabled: enabled && listaAberta,
  });

  const r = resumo.data?.[0];
  const masculino = Number(r?.masculino ?? 0);
  const feminino = Number(r?.feminino ?? 0);
  const indef = Number(r?.indefinido ?? 0) + Number(r?.sem_registro ?? 0);
  const total = Number(r?.total ?? 0);
  const classificados = masculino + feminino;
  const pct = (v: number) => (classificados ? Math.round((v / classificados) * 100) : 0);
  const cobertura = total ? Math.round((classificados / total) * 100) : 0;

  const invalidar = () => {
    qc.invalidateQueries({ queryKey: ['pc-genero-resumo'] });
    qc.invalidateQueries({ queryKey: ['pc-genero-regiao'] });
    qc.invalidateQueries({ queryKey: ['pc-genero-indefinidos'] });
  };

  const reclassificar = async () => {
    setReclassificando(true);
    const { data, error } = await db.rpc('reclassificar_genero_sugestoes', {
      p_somente_pendentes: true,
      p_limite: 5000,
    });
    setReclassificando(false);
    if (error) {
      toast({ title: 'Erro ao reclassificar', description: error.message, variant: 'destructive' });
      return;
    }
    const res = (data ?? [])[0] ?? {};
    toast({
      title: 'Reclassificação concluída',
      description: `${res.processadas ?? 0} registros analisados, ${res.definidas ?? 0} com gênero identificado.`,
    });
    invalidar();
  };

  const definir = async (sugestaoId: string, genero: 'masculino' | 'feminino') => {
    setSalvando(sugestaoId);
    const { error } = await db.rpc('definir_genero_manual', {
      p_sugestao_id: sugestaoId,
      p_genero: genero,
    });
    setSalvando(null);
    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
      return;
    }
    invalidar();
  };

  return (
    <Card className="border-l-4" style={{ borderLeftColor: FEMALE }}>
      <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="w-4 h-4" /> Perfil por gênero (análise do primeiro nome)
        </CardTitle>
        <Button variant="outline" size="sm" onClick={reclassificar} disabled={reclassificando}>
          {reclassificando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          Reclassificar nomes
        </Button>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Homens', value: masculino, sub: `${pct(masculino)}% dos classificados`, color: MALE },
            { label: 'Mulheres', value: feminino, sub: `${pct(feminino)}% dos classificados`, color: FEMALE },
            { label: 'Indefinidos', value: indef, sub: 'aguardando revisão', color: NAVY },
            { label: 'Cobertura', value: `${cobertura}%`, sub: `${classificados.toLocaleString('pt-BR')} de ${total.toLocaleString('pt-BR')}`, color: RED },
          ].map((item) => (
            <div key={item.label} className="rounded-lg border bg-card p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{item.label}</p>
              <p className="text-3xl font-bold mt-1" style={{ color: item.color }}>
                {typeof item.value === 'number' ? item.value.toLocaleString('pt-BR') : item.value}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">{item.sub}</p>
            </div>
          ))}
        </div>

        <div>
          <div className="flex h-4 w-full overflow-hidden rounded-full bg-muted">
            <div style={{ width: `${pct(masculino)}%`, backgroundColor: MALE }} />
            <div style={{ width: `${pct(feminino)}%`, backgroundColor: FEMALE }} />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span style={{ color: MALE }}>Homens {pct(masculino)}%</span>
            <span style={{ color: FEMALE }}>Mulheres {pct(feminino)}%</span>
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground leading-relaxed">
          A identificação é estatística, feita a partir do primeiro nome. Nomes unissex, abreviados
          ou ausentes ficam como indefinidos e podem ser corrigidos manualmente abaixo — correções
          manuais nunca são sobrescritas por uma nova reclassificação automática.
        </p>

        <div className="border-t pt-3">
          <button
            className="flex items-center gap-2 text-sm font-semibold hover:underline"
            style={{ color: NAVY }}
            onClick={() => setListaAberta((v) => !v)}
          >
            {listaAberta ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            Revisar indefinidos manualmente
          </button>

          {listaAberta && (
            <div className="mt-3 space-y-2 max-h-96 overflow-auto">
              {indefinidos.isLoading && (
                <p className="text-xs text-muted-foreground">Carregando…</p>
              )}
              {!indefinidos.isLoading && (indefinidos.data ?? []).length === 0 && (
                <p className="text-xs text-muted-foreground">Nenhum registro indefinido pendente.</p>
              )}
              {(indefinidos.data ?? []).map((item) => (
                <div
                  key={item.sugestao_id}
                  className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-lg border p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate" style={{ color: NAVY }}>
                      {item.nome || 'Sem nome'}
                      {item.municipio && (
                        <span className="font-normal text-muted-foreground"> — {item.municipio}</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{item.trecho}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={salvando === item.sugestao_id}
                      onClick={() => definir(item.sugestao_id, 'masculino')}
                    >
                      Homem
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={salvando === item.sugestao_id}
                      onClick={() => definir(item.sugestao_id, 'feminino')}
                    >
                      Mulher
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default GeneroPanel;
