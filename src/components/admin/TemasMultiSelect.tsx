import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Loader2, Layers } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface Tema {
  id: string;
  nome: string;
  eixo_id: string;
  eixos_tematicos?: { nome: string } | null;
}

interface Props {
  value: string[];
  onChange: (ids: string[]) => void;
  className?: string;
}

/**
 * Seleção hierárquica Eixo -> Temas (multi-select).
 * Usado para vincular documentos da biblioteca da IA aos temas relevantes,
 * evitando que o cruzamento de IA misture fontes não relacionadas.
 */
export function TemasMultiSelect({ value, onChange, className }: Props) {
  const [temas, setTemas] = useState<Tema[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('temas')
        .select('id, nome, eixo_id, eixos_tematicos:eixo_id(nome)')
        .order('eixo_id')
        .order('ordem');
      setTemas((data as any[]) || []);
      setLoading(false);
    })();
  }, []);

  const toggle = (id: string) => {
    onChange(value.includes(id) ? value.filter(v => v !== id) : [...value, id]);
  };

  // Group by eixo
  const grouped = temas.reduce<Record<string, { eixoNome: string; temas: Tema[] }>>((acc, t) => {
    const key = t.eixo_id;
    if (!acc[key]) acc[key] = { eixoNome: t.eixos_tematicos?.nome || 'Sem eixo', temas: [] };
    acc[key].temas.push(t);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground p-3">
        <Loader2 className="w-4 h-4 animate-spin" /> Carregando temas...
      </div>
    );
  }

  return (
    <div className={cn('rounded-md border bg-background', className)}>
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
        <div className="flex items-center gap-2 text-xs font-medium">
          <Layers className="w-3.5 h-3.5" />
          Temas vinculados
        </div>
        <Badge variant={value.length > 0 ? 'default' : 'destructive'} className="text-[10px]">
          {value.length} selecionado{value.length !== 1 ? 's' : ''}
        </Badge>
      </div>
      <ScrollArea className="h-[260px]">
        <div className="p-3 space-y-4">
          {Object.entries(grouped).map(([eixoId, group]) => (
            <div key={eixoId} className="space-y-1.5">
              <div className="text-xs font-semibold text-primary uppercase tracking-wide">
                {group.eixoNome}
              </div>
              <div className="space-y-1 pl-1">
                {group.temas.map(t => (
                  <label
                    key={t.id}
                    className="flex items-start gap-2 text-sm cursor-pointer hover:bg-muted/50 rounded px-1.5 py-1"
                  >
                    <Checkbox
                      checked={value.includes(t.id)}
                      onCheckedChange={() => toggle(t.id)}
                      className="mt-0.5"
                    />
                    <span>{t.nome}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

export default TemasMultiSelect;