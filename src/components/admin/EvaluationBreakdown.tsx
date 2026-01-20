import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertTriangle, BookOpen, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ScoreBreakdown {
  viabilidade_tecnica?: number;
  aderencia_popular?: number;
  relevancia_eleitoral?: number;
  coerencia_programatica?: number;
  impacto_regional?: number;
}

interface FonteCruzada {
  tipo: string;
  titulo?: string;
  descricao?: string;
  relevancia: 'alta' | 'media' | 'baixa';
}

interface EvaluationBreakdownProps {
  scoreTotal: number;
  scores: ScoreBreakdown;
  justificativa?: string;
  pontosFortes?: string[];
  pontosAtencao?: string[];
  fontesCruzadas?: FonteCruzada[];
  isStale?: boolean;
  evaluatedAt?: string;
  onRefresh?: () => void;
  isLoading?: boolean;
}

const getScoreColor = (score: number): string => {
  if (score < 3) return 'text-red-500';
  if (score < 5) return 'text-orange-500';
  if (score < 7) return 'text-yellow-500';
  if (score < 9) return 'text-lime-600';
  return 'text-green-500';
};

const getProgressColor = (score: number): string => {
  if (score < 3) return 'bg-red-500';
  if (score < 5) return 'bg-orange-500';
  if (score < 7) return 'bg-yellow-500';
  if (score < 9) return 'bg-lime-500';
  return 'bg-green-500';
};

const criteriaLabels: Record<keyof ScoreBreakdown, { label: string; description: string }> = {
  viabilidade_tecnica: { 
    label: 'Viabilidade Técnica', 
    description: 'Aderência a estudos técnicos (PELTI, viabilidade)' 
  },
  aderencia_popular: { 
    label: 'Aderência Popular', 
    description: 'Alinhamento com sugestões e demandas da população' 
  },
  relevancia_eleitoral: { 
    label: 'Relevância Eleitoral', 
    description: 'Impacto potencial nas pesquisas e eleitorado' 
  },
  coerencia_programatica: { 
    label: 'Coerência Programática', 
    description: 'Alinhamento com o plano de governo' 
  },
  impacto_regional: { 
    label: 'Impacto Regional', 
    description: 'Abrangência e benefícios para a região' 
  },
};

const relevanciaColors = {
  alta: 'bg-green-100 text-green-800',
  media: 'bg-yellow-100 text-yellow-800',
  baixa: 'bg-gray-100 text-gray-800',
};

export const EvaluationBreakdown = ({
  scoreTotal,
  scores,
  justificativa,
  pontosFortes,
  pontosAtencao,
  fontesCruzadas,
  isStale,
  evaluatedAt,
  onRefresh,
  isLoading,
}: EvaluationBreakdownProps) => {
  return (
    <div className="space-y-6">
      {/* Score Total */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Score de Relevância Técnica</CardTitle>
            {onRefresh && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onRefresh}
                disabled={isLoading}
              >
                <RefreshCw className={cn("h-4 w-4 mr-1", isLoading && "animate-spin")} />
                {isLoading ? 'Avaliando...' : 'Gerar Nova Avaliação'}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className={cn("text-5xl font-bold", getScoreColor(scoreTotal))}>
              {scoreTotal.toFixed(1)}
            </div>
            <div className="text-muted-foreground">
              <span className="text-2xl">/10</span>
              {isStale && (
                <Badge variant="outline" className="ml-2 text-yellow-600 border-yellow-400">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Desatualizado
                </Badge>
              )}
            </div>
          </div>

          {/* Scores por critério */}
          <div className="space-y-4">
            {Object.entries(scores).map(([key, value]) => {
              if (value === undefined) return null;
              const criteria = criteriaLabels[key as keyof ScoreBreakdown];
              return (
                <div key={key} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{criteria.label}</span>
                    <span className={cn("font-semibold", getScoreColor(value))}>
                      {value}/10
                    </span>
                  </div>
                  <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={cn("absolute left-0 top-0 h-full rounded-full transition-all", getProgressColor(value))}
                      style={{ width: `${value * 10}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">{criteria.description}</p>
                </div>
              );
            })}
          </div>

          {evaluatedAt && (
            <p className="text-xs text-muted-foreground mt-4">
              Avaliado em: {new Date(evaluatedAt).toLocaleString('pt-BR')}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Justificativa */}
      {justificativa && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Análise da IA</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {justificativa}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Pontos Fortes e Atenção */}
      <div className="grid md:grid-cols-2 gap-4">
        {pontosFortes && pontosFortes.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                Pontos Fortes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {pontosFortes.map((ponto, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <span className="text-green-500 mt-0.5">•</span>
                    <span>{ponto}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {pontosAtencao && pontosAtencao.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2 text-yellow-600">
                <AlertTriangle className="h-5 w-5" />
                Pontos de Atenção
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {pontosAtencao.map((ponto, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <span className="text-yellow-500 mt-0.5">•</span>
                    <span>{ponto}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Fontes Cruzadas */}
      {fontesCruzadas && fontesCruzadas.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Fontes Cruzadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {fontesCruzadas.map((fonte, idx) => (
                <Badge 
                  key={idx} 
                  variant="secondary"
                  className={cn("text-xs", relevanciaColors[fonte.relevancia])}
                >
                  {fonte.tipo}: {fonte.titulo || fonte.descricao?.substring(0, 30)}
                  {fonte.descricao && fonte.descricao.length > 30 && '...'}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
