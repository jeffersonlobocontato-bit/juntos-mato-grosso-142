import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Download, Loader2, MapPin, Search } from 'lucide-react';

interface Municipio {
  id: string;
  nome: string;
  regiao: string | null;
  codigo_ibge: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const PAGE_SIZE = 1000;
const MAX_ROWS = 100_000;

async function fetchAllMunicipios(): Promise<Municipio[]> {
  const all: Municipio[] = [];
  for (let from = 0; from < MAX_ROWS; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('municipios')
      .select('id, nome, regiao, codigo_ibge')
      .order('nome', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...(data as Municipio[]));
    if (data.length < PAGE_SIZE) break;
  }
  return all;
}

async function fetchAllSugestaoMunicipios(): Promise<Set<string>> {
  const set = new Set<string>();
  for (let from = 0; from < MAX_ROWS; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('sugestoes_populares')
      .select('municipio')
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    data.forEach((row: { municipio: string | null }) => {
      if (row.municipio) set.add(normalize(row.municipio));
    });
    if (data.length < PAGE_SIZE) break;
  }
  return set;
}

export default function CidadesSemParticipacaoModal({ open, onOpenChange }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [ausentes, setAusentes] = useState<Municipio[]>([]);
  const [totalMunicipios, setTotalMunicipios] = useState(0);
  const [busca, setBusca] = useState('');

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [muns, comSug] = await Promise.all([
          fetchAllMunicipios(),
          fetchAllSugestaoMunicipios(),
        ]);
        if (cancelled) return;
        setMunicipios(muns);
        setTotalMunicipios(muns.length);
        const semParticipacao = muns.filter((m) => !comSug.has(normalize(m.nome)));
        setAusentes(semParticipacao);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Falha ao carregar dados.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const filtrados = useMemo(() => {
    const q = normalize(busca);
    if (!q) return ausentes;
    return ausentes.filter((m) => normalize(m.nome).includes(q));
  }, [busca, ausentes]);

  const exportCsv = () => {
    const header = 'nome,regiao,codigo_ibge\n';
    const rows = ausentes
      .map((m) => {
        const nome = `"${m.nome.replace(/"/g, '""')}"`;
        const regiao = `"${(m.regiao || '').replace(/"/g, '""')}"`;
        const ibge = `"${m.codigo_ibge || ''}"`;
        return `${nome},${regiao},${ibge}`;
      })
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cidades-sem-participacao-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Cidades sem participação
          </DialogTitle>
          <DialogDescription>
            {loading
              ? 'Carregando municípios...'
              : `${ausentes.length.toLocaleString('pt-BR')} de ${totalMunicipios.toLocaleString('pt-BR')} municípios ainda sem nenhuma sugestão registrada.`}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Filtrar por nome..."
                  className="pl-8"
                />
              </div>
              <Button
                onClick={exportCsv}
                disabled={ausentes.length === 0}
                variant="secondary"
                size="sm"
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Exportar CSV
              </Button>
            </div>

            <ScrollArea className="h-[420px] rounded-md border">
              {filtrados.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {ausentes.length === 0
                    ? 'Todos os municípios já possuem ao menos uma sugestão registrada.'
                    : 'Nenhum município encontrado com esse filtro.'}
                </p>
              ) : (
                <ul className="divide-y divide-border/60">
                  {filtrados.map((m, i) => (
                    <li
                      key={m.id}
                      className="flex items-center justify-between px-3 py-2 text-sm"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-8 text-xs text-right text-muted-foreground tabular-nums">
                          {i + 1}
                        </span>
                        <span className="font-medium truncate">{m.nome}</span>
                      </div>
                      <span className="text-xs text-muted-foreground truncate ml-3">
                        {m.regiao || '—'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </ScrollArea>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}