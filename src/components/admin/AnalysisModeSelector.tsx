import { cn } from '@/lib/utils';
import { FileText, GitCompareArrows, Scale } from 'lucide-react';

export type AnalysisMode = 'plano' | 'cruzamento' | 'balanco';

interface AnalysisModeSelectorProps {
  value: AnalysisMode;
  onChange: (mode: AnalysisMode) => void;
  className?: string;
}

const MODES: { value: AnalysisMode; label: string; description: string; icon: React.ElementType }[] = [
  { 
    value: 'plano', 
    label: 'Plano de Governo', 
    description: 'Criar propostas consolidadas',
    icon: FileText 
  },
  { 
    value: 'cruzamento', 
    label: 'Cruzamento', 
    description: 'Comparar dados e documentos',
    icon: GitCompareArrows 
  },
  { 
    value: 'balanco', 
    label: 'Balanço de Governo', 
    description: 'Feito vs. Prometido',
    icon: Scale 
  },
];

export function AnalysisModeSelector({ value, onChange, className }: AnalysisModeSelectorProps) {
  return (
    <div className={cn('grid grid-cols-1 sm:grid-cols-3 gap-2', className)}>
      {MODES.map((mode) => {
        const Icon = mode.icon;
        const isSelected = value === mode.value;
        
        return (
          <button
            key={mode.value}
            onClick={() => onChange(mode.value)}
            className={cn(
              'flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all text-center',
              'hover:border-primary/50 hover:bg-primary/5',
              isSelected 
                ? 'border-primary bg-primary/10 shadow-sm' 
                : 'border-border bg-card'
            )}
          >
            <Icon className={cn(
              'w-5 h-5',
              isSelected ? 'text-primary' : 'text-muted-foreground'
            )} />
            <span className={cn(
              'text-xs font-medium line-clamp-1',
              isSelected ? 'text-primary' : 'text-foreground'
            )}>
              {mode.label}
            </span>
            <span className="text-[10px] text-muted-foreground line-clamp-1 hidden sm:block">
              {mode.description}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default AnalysisModeSelector;
