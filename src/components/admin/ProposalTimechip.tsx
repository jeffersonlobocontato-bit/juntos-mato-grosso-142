import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProposalTimechipProps {
  updatedAt: string | Date;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const getTimechipConfig = (hours: number) => {
  if (hours < 24) {
    return {
      color: 'bg-green-500/20 text-green-700 border-green-500/30',
      label: 'No prazo',
      pulse: false,
    };
  }
  if (hours < 48) {
    return {
      color: 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30',
      label: 'Risco de atraso',
      pulse: false,
    };
  }
  return {
    color: 'bg-red-500/20 text-red-700 border-red-500/30',
    label: 'Atrasado',
    pulse: true,
  };
};

const formatHours = (hours: number): string => {
  if (hours < 1) return '<1h';
  if (hours < 24) return `${Math.floor(hours)}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
};

export const ProposalTimechip = ({
  updatedAt,
  showLabel = false,
  size = 'md',
  className,
}: ProposalTimechipProps) => {
  const updatedDate = new Date(updatedAt);
  const now = new Date();
  const hoursStale = Math.floor((now.getTime() - updatedDate.getTime()) / (1000 * 60 * 60));
  
  const config = getTimechipConfig(hoursStale);
  
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-xs px-2 py-1',
    lg: 'text-sm px-2.5 py-1.5',
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        config.color,
        sizeClasses[size],
        'font-medium inline-flex items-center gap-1 border',
        config.pulse && 'animate-pulse',
        className
      )}
    >
      <Clock className={cn(
        size === 'sm' ? 'h-3 w-3' : size === 'md' ? 'h-3.5 w-3.5' : 'h-4 w-4'
      )} />
      <span>{formatHours(hoursStale)}</span>
      {showLabel && <span className="hidden sm:inline">- {config.label}</span>}
    </Badge>
  );
};

// Hook para calcular status do timechip
export const useTimechipStatus = (updatedAt: string | Date) => {
  const updatedDate = new Date(updatedAt);
  const now = new Date();
  const hoursStale = Math.floor((now.getTime() - updatedDate.getTime()) / (1000 * 60 * 60));
  
  return {
    hoursStale,
    isOnTime: hoursStale < 24,
    isAtRisk: hoursStale >= 24 && hoursStale < 48,
    isOverdue: hoursStale >= 48,
    ...getTimechipConfig(hoursStale),
  };
};
