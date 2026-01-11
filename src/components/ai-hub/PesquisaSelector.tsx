import { useState } from 'react';
import { ChevronDown, ChevronUp, CheckSquare, Square, ListFilter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Pesquisa {
  id: string;
  titulo: string;
  instituto: string;
  data_publicacao: string | null;
  tipo_pesquisa: string;
}

interface PesquisaSelectorProps {
  pesquisas: Pesquisa[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  isLoading?: boolean;
}

export const PesquisaSelector = ({ 
  pesquisas, 
  selectedIds, 
  onSelectionChange,
  isLoading = false
}: PesquisaSelectorProps) => {
  const [isOpen, setIsOpen] = useState(true);

  const togglePesquisa = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter(i => i !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const selectAll = () => onSelectionChange(pesquisas.map(p => p.id));
  const clearAll = () => onSelectionChange([]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  if (pesquisas.length === 0 && !isLoading) {
    return null;
  }

  return (
    <div className="border-b border-border bg-card/50">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-2">
              <ListFilter className="w-4 h-4 text-emerald-500" />
              <span className="text-sm font-medium">Pesquisas para análise</span>
              <Badge variant="secondary" className="ml-2">
                {selectedIds.length} de {pesquisas.length}
              </Badge>
            </div>
            {isOpen ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-4 text-muted-foreground text-sm">
                Carregando pesquisas...
              </div>
            ) : (
              <>
                <ScrollArea className="max-h-48">
                  <div className="space-y-2 pr-4">
                    {pesquisas.map((pesq) => (
                      <label
                        key={pesq.id}
                        className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      >
                        <Checkbox
                          checked={selectedIds.includes(pesq.id)}
                          onCheckedChange={() => togglePesquisa(pesq.id)}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium truncate">
                              {pesq.instituto}
                            </span>
                            <Badge variant="outline" className="text-xs shrink-0">
                              {pesq.tipo_pesquisa}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {pesq.titulo}
                            {pesq.data_publicacao && (
                              <span className="ml-2 text-emerald-600 dark:text-emerald-400">
                                • {formatDate(pesq.data_publicacao)}
                              </span>
                            )}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </ScrollArea>

                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={selectAll}
                    className="text-xs"
                    disabled={selectedIds.length === pesquisas.length}
                  >
                    <CheckSquare className="w-3 h-3 mr-1" />
                    Todas
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearAll}
                    className="text-xs"
                    disabled={selectedIds.length === 0}
                  >
                    <Square className="w-3 h-3 mr-1" />
                    Nenhuma
                  </Button>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {selectedIds.length === 0 && "Selecione ao menos uma pesquisa"}
                  </span>
                </div>
              </>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};
