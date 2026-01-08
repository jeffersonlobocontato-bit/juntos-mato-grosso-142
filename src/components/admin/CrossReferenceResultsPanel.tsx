import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  GitCompare, 
  Lightbulb, 
  AlertTriangle, 
  CheckCircle2, 
  FileText,
  Users,
  Building2,
  Target
} from "lucide-react";
import MarkdownRenderer from "./MarkdownRenderer";

interface CrossReferenceResult {
  type: 'convergence' | 'divergence' | 'gap' | 'opportunity';
  title: string;
  description: string;
  sources: string[];
  relevance: 'high' | 'medium' | 'low';
}

interface CrossReferenceResultsPanelProps {
  results: CrossReferenceResult[];
  aiAnalysis?: string;
  isLoading?: boolean;
  stats?: {
    sugestoes: number;
    propostas: number;
    documentos: number;
  };
}

const TYPE_CONFIG = {
  convergence: {
    icon: CheckCircle2,
    label: "Convergência",
    color: "bg-green-500/10 text-green-700 border-green-200",
    description: "Pontos onde diferentes fontes concordam",
  },
  divergence: {
    icon: AlertTriangle,
    label: "Divergência",
    color: "bg-amber-500/10 text-amber-700 border-amber-200",
    description: "Pontos onde há conflitos ou contradições",
  },
  gap: {
    icon: Target,
    label: "Lacuna",
    color: "bg-red-500/10 text-red-700 border-red-200",
    description: "Áreas não cobertas pelas propostas atuais",
  },
  opportunity: {
    icon: Lightbulb,
    label: "Oportunidade",
    color: "bg-blue-500/10 text-blue-700 border-blue-200",
    description: "Potenciais inovações identificadas",
  },
};

const RELEVANCE_COLORS = {
  high: "bg-red-500",
  medium: "bg-amber-500",
  low: "bg-green-500",
};

export function CrossReferenceResultsPanel({
  results,
  aiAnalysis,
  isLoading = false,
  stats,
}: CrossReferenceResultsPanelProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <GitCompare className="h-5 w-5" />
            Resultados do Cruzamento de Dados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">
              Analisando cruzamentos...
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Group results by type
  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.type]) acc[result.type] = [];
    acc[result.type].push(result);
    return acc;
  }, {} as Record<string, CrossReferenceResult[]>);

  const typeCounts = {
    convergence: groupedResults.convergence?.length || 0,
    divergence: groupedResults.divergence?.length || 0,
    gap: groupedResults.gap?.length || 0,
    opportunity: groupedResults.opportunity?.length || 0,
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <GitCompare className="h-5 w-5" />
          Resultados do Cruzamento de Dados
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Data Sources Stats */}
        {stats && (
          <div className="grid grid-cols-3 gap-3">
            <div className="flex items-center gap-2 p-2 rounded-lg border bg-card">
              <Users className="h-4 w-4 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Sugestões</p>
                <p className="font-semibold">{stats.sugestoes}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg border bg-card">
              <Building2 className="h-4 w-4 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Propostas</p>
                <p className="font-semibold">{stats.propostas}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg border bg-card">
              <FileText className="h-4 w-4 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Documentos</p>
                <p className="font-semibold">{stats.documentos}</p>
              </div>
            </div>
          </div>
        )}

        {/* Type Summary */}
        <div className="flex flex-wrap gap-2">
          {Object.entries(TYPE_CONFIG).map(([type, config]) => {
            const Icon = config.icon;
            const count = typeCounts[type as keyof typeof typeCounts];
            return (
              <Badge
                key={type}
                variant="outline"
                className={`${config.color} flex items-center gap-1`}
              >
                <Icon className="h-3 w-3" />
                {config.label}: {count}
              </Badge>
            );
          })}
        </div>

        <Separator />

        {/* AI Analysis */}
        {aiAnalysis && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-primary" />
              Análise da IA
            </h4>
            <ScrollArea className="h-48 rounded-lg border p-3 bg-muted/30">
              <MarkdownRenderer content={aiAnalysis} />
            </ScrollArea>
          </div>
        )}

        {/* Detailed Results */}
        {results.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Descobertas Detalhadas</h4>
            <ScrollArea className="h-64">
              <div className="space-y-3 pr-4">
                {results.map((result, index) => {
                  const config = TYPE_CONFIG[result.type];
                  const Icon = config.icon;
                  return (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border ${config.color}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 flex-shrink-0" />
                          <span className="font-medium text-sm">{result.title}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div
                            className={`h-2 w-2 rounded-full ${
                              RELEVANCE_COLORS[result.relevance]
                            }`}
                          />
                          <span className="text-xs text-muted-foreground capitalize">
                            {result.relevance === 'high' ? 'Alta' : result.relevance === 'medium' ? 'Média' : 'Baixa'}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm mt-1 text-muted-foreground">
                        {result.description}
                      </p>
                      {result.sources.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {result.sources.map((source, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {source}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        )}

        {results.length === 0 && !aiAnalysis && (
          <div className="h-40 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <GitCompare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Execute uma análise de cruzamento para ver os resultados</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
