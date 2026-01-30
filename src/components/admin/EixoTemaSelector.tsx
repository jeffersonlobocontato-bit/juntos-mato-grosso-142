import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { getEixoColor, type Eixo, type Tema, type Subtema } from '@/utils/eixoHelpers';

interface EixoTemaSelectorProps {
  eixoId?: string | null;
  temaId?: string | null;
  subtemaId?: string | null;
  onEixoChange?: (eixoId: string | null, eixo?: Eixo) => void;
  onTemaChange?: (temaId: string | null, tema?: Tema) => void;
  onSubtemaChange?: (subtemaId: string | null, subtema?: Subtema) => void;
  showSubtemas?: boolean;
  showLabels?: boolean;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  compact?: boolean;
}

export function EixoTemaSelector({
  eixoId,
  temaId,
  subtemaId,
  onEixoChange,
  onTemaChange,
  onSubtemaChange,
  showSubtemas = false,
  showLabels = true,
  required = false,
  disabled = false,
  className = '',
  compact = false,
}: EixoTemaSelectorProps) {
  const [eixos, setEixos] = useState<Eixo[]>([]);
  const [temas, setTemas] = useState<Tema[]>([]);
  const [subtemas, setSubtemas] = useState<Subtema[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filteredTemas, setFilteredTemas] = useState<Tema[]>([]);
  const [filteredSubtemas, setFilteredSubtemas] = useState<Subtema[]>([]);

  // Carregar eixos e temas
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [eixosRes, temasRes, subtemasRes] = await Promise.all([
          supabase.from('eixos_tematicos').select('*').order('ordem'),
          supabase.from('temas').select('*').order('ordem'),
          showSubtemas ? supabase.from('subtemas').select('*').order('ordem') : Promise.resolve({ data: [] }),
        ]);

        if (eixosRes.data) setEixos(eixosRes.data as Eixo[]);
        if (temasRes.data) setTemas(temasRes.data as Tema[]);
        if (subtemasRes.data) setSubtemas(subtemasRes.data as Subtema[]);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [showSubtemas]);

  // Filtrar temas pelo eixo selecionado
  useEffect(() => {
    if (eixoId) {
      setFilteredTemas(temas.filter(t => t.eixo_id === eixoId));
    } else {
      setFilteredTemas([]);
    }
  }, [eixoId, temas]);

  // Filtrar subtemas pelo tema selecionado
  useEffect(() => {
    if (temaId && showSubtemas) {
      setFilteredSubtemas(subtemas.filter(s => s.tema_id === temaId));
    } else {
      setFilteredSubtemas([]);
    }
  }, [temaId, subtemas, showSubtemas]);

  // Handler para mudança de eixo
  const handleEixoChange = (value: string) => {
    const selectedEixo = eixos.find(e => e.id === value);
    onEixoChange?.(value, selectedEixo);
    // Limpar tema e subtema quando eixo muda
    onTemaChange?.(null, undefined);
    onSubtemaChange?.(null, undefined);
  };

  // Handler para mudança de tema
  const handleTemaChange = (value: string) => {
    const selectedTema = temas.find(t => t.id === value);
    onTemaChange?.(value, selectedTema);
    // Limpar subtema quando tema muda
    onSubtemaChange?.(null, undefined);
  };

  // Handler para mudança de subtema
  const handleSubtemaChange = (value: string) => {
    const selectedSubtema = subtemas.find(s => s.id === value);
    onSubtemaChange?.(value, selectedSubtema);
  };

  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        {showSubtemas && <Skeleton className="h-10 w-full" />}
      </div>
    );
  }

  const gapClass = compact ? 'gap-2' : 'gap-4';

  return (
    <div className={`grid grid-cols-1 md:grid-cols-${showSubtemas ? '3' : '2'} ${gapClass} ${className}`}>
      {/* Seletor de Eixo */}
      <div className="space-y-2">
        {showLabels && (
          <Label htmlFor="eixo">
            Eixo Temático {required && <span className="text-destructive">*</span>}
          </Label>
        )}
        <Select
          value={eixoId || ''}
          onValueChange={handleEixoChange}
          disabled={disabled}
        >
          <SelectTrigger id="eixo">
            <SelectValue placeholder="Selecione o eixo" />
          </SelectTrigger>
          <SelectContent>
            {eixos.map((eixo) => (
              <SelectItem key={eixo.id} value={eixo.id}>
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: getEixoColor(eixo.nome) }}
                  />
                  <span className="truncate">
                    {eixo.ordem}. {eixo.nome}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {eixoId && eixos.find(e => e.id === eixoId)?.subtitulo && (
          <p className="text-xs text-muted-foreground">
            {eixos.find(e => e.id === eixoId)?.subtitulo}
          </p>
        )}
      </div>

      {/* Seletor de Tema */}
      <div className="space-y-2">
        {showLabels && (
          <Label htmlFor="tema">
            Tema {required && <span className="text-destructive">*</span>}
          </Label>
        )}
        <Select
          value={temaId || ''}
          onValueChange={handleTemaChange}
          disabled={disabled || !eixoId}
        >
          <SelectTrigger id="tema">
            <SelectValue placeholder={eixoId ? 'Selecione o tema' : 'Selecione um eixo primeiro'} />
          </SelectTrigger>
          <SelectContent>
            {filteredTemas.map((tema) => (
              <SelectItem key={tema.id} value={tema.id}>
                <span className="font-medium">{tema.codigo}</span> - {tema.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Seletor de Subtema (opcional) */}
      {showSubtemas && (
        <div className="space-y-2">
          {showLabels && (
            <Label htmlFor="subtema">Subtema</Label>
          )}
          <Select
            value={subtemaId || ''}
            onValueChange={handleSubtemaChange}
            disabled={disabled || !temaId}
          >
            <SelectTrigger id="subtema">
              <SelectValue placeholder={temaId ? 'Selecione o subtema (opcional)' : 'Selecione um tema primeiro'} />
            </SelectTrigger>
            <SelectContent>
              {filteredSubtemas.map((subtema) => (
                <SelectItem key={subtema.id} value={subtema.id}>
                  {subtema.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
