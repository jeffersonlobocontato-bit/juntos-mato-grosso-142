import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, FileCheck, ExternalLink, TrendingUp, Clock, Calendar, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";

export interface BalanceItem {
  id: string;
  title: string;
  sourceType: 'proposta' | 'documento';
  sourceUrl?: string;
  internalPath?: string;
  eixo?: string;
}

interface BalanceDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: 'realizado' | 'em_andamento' | 'prometido' | 'nao_iniciado' | null;
  items: BalanceItem[];
  eixoFilter?: string;
}

const CATEGORY_CONFIG = {
  realizado: {
    label: 'Itens Realizados',
    icon: TrendingUp,
    color: 'text-green-600',
    bgColor: 'bg-green-500/10',
  },
  em_andamento: {
    label: 'Itens Em Andamento',
    icon: Clock,
    color: 'text-blue-600',
    bgColor: 'bg-blue-500/10',
  },
  prometido: {
    label: 'Itens Prometidos',
    icon: Calendar,
    color: 'text-amber-600',
    bgColor: 'bg-amber-500/10',
  },
  nao_iniciado: {
    label: 'Itens Não Iniciados',
    icon: AlertCircle,
    color: 'text-gray-600',
    bgColor: 'bg-gray-500/10',
  },
};

export function BalanceDetailModal({
  open,
  onOpenChange,
  category,
  items,
  eixoFilter,
}: BalanceDetailModalProps) {
  if (!category) return null;

  const config = CATEGORY_CONFIG[category];
  const IconComponent = config.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[70vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className={`p-1.5 rounded ${config.bgColor}`}>
              <IconComponent className={`h-4 w-4 ${config.color}`} />
            </div>
            {config.label}
            <Badge variant="secondary">{items.length} itens</Badge>
          </DialogTitle>
          {eixoFilter && (
            <p className="text-sm text-muted-foreground">Eixo: {eixoFilter}</p>
          )}
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4 -mr-4">
          {items.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <p>Nenhum item encontrado nesta categoria</p>
            </div>
          ) : (
            <div className="space-y-3 pb-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      {item.sourceType === 'documento' ? (
                        <FileText className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                      ) : (
                        <FileCheck className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate" title={item.title}>
                          {item.title}
                        </p>
                        <Badge variant="outline" className="mt-1 text-xs">
                          {item.sourceType === 'documento' ? 'Documento' : 'Proposta Técnica'}
                        </Badge>
                      </div>
                    </div>

                    {/* Link para fonte */}
                    {item.sourceUrl ? (
                      <a
                        href={item.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-1 text-sm shrink-0"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Abrir
                      </a>
                    ) : item.internalPath ? (
                      <Link
                        to={item.internalPath}
                        className="text-primary hover:underline flex items-center gap-1 text-sm shrink-0"
                        onClick={() => onOpenChange(false)}
                      >
                        Ver detalhes
                      </Link>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
