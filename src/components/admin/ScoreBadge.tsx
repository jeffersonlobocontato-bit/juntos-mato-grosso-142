import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ScoreBreakdown {
  viabilidade_tecnica?: number;
  aderencia_popular?: number;
  relevancia_eleitoral?: number;
  coerencia_programatica?: number;
  impacto_regional?: number;
}

interface ScoreBadgeProps {
  score: number;
  scores?: ScoreBreakdown;
  isStale?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
}

const getScoreColor = (score: number): string => {
  if (score < 3) return 'bg-red-500 text-white';
  if (score < 5) return 'bg-orange-500 text-white';
  if (score < 7) return 'bg-yellow-500 text-black';
  if (score < 9) return 'bg-lime-500 text-black';
  return 'bg-green-500 text-white';
};

const getScoreLabel = (score: number): string => {
  if (score < 3) return 'Baixa';
  if (score < 5) return 'Atenção';
  if (score < 7) return 'Moderado';
  if (score < 9) return 'Alta';
  return 'Excelente';
};

const sizeClasses = {
  sm: 'text-xs px-1.5 py-0.5',
  md: 'text-sm px-2 py-1',
  lg: 'text-base px-3 py-1.5',
};

const criteriaLabels: Record<keyof ScoreBreakdown, string> = {
  viabilidade_tecnica: 'Viabilidade Técnica',
  aderencia_popular: 'Aderência Popular',
  relevancia_eleitoral: 'Relevância Eleitoral',
  coerencia_programatica: 'Coerência Programática',
  impacto_regional: 'Impacto Regional',
};

export const ScoreBadge = ({ 
  score, 
  scores, 
  isStale = false, 
  size = 'md',
  showTooltip = true 
}: ScoreBadgeProps) => {
  const badge = (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-semibold",
        getScoreColor(score),
        sizeClasses[size],
        isStale && "opacity-60 ring-2 ring-yellow-400 ring-offset-1"
      )}
    >
      <span>{score.toFixed(1)}</span>
      {isStale && <span className="text-[10px]">⚠</span>}
    </span>
  );

  if (!showTooltip || !scores) {
    return badge;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent className="w-64 p-3">
          <div className="space-y-2">
            <div className="flex justify-between items-center border-b pb-2">
              <span className="font-semibold">Score Total</span>
              <span className={cn("px-2 py-0.5 rounded text-sm font-bold", getScoreColor(score))}>
                {score.toFixed(1)}/10
              </span>
            </div>
            <div className="space-y-1.5">
              {Object.entries(scores).map(([key, value]) => (
                value !== undefined && (
                  <div key={key} className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">
                      {criteriaLabels[key as keyof ScoreBreakdown]}
                    </span>
                    <span className="font-medium">{value}/10</span>
                  </div>
                )
              ))}
            </div>
            {isStale && (
              <div className="text-xs text-yellow-600 mt-2 pt-2 border-t">
                ⚠ Avaliação desatualizada - proposta foi modificada
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
