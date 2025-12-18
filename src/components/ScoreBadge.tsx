import { cn } from '@/lib/utils';
import { getScoreCategory } from '@/lib/scoring';

interface ScoreBadgeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
}

export function ScoreBadge({ score, size = 'md' }: ScoreBadgeProps) {
  const category = getScoreCategory(score);
  
  const sizeClasses = {
    sm: 'min-w-[1.75rem] px-1.5 py-0.5 text-xs',
    md: 'min-w-[2.5rem] px-2 py-1 text-sm',
    lg: 'min-w-[3rem] px-3 py-1.5 text-base',
  };

  const categoryClasses = {
    excellent: 'bg-score-excellent',
    good: 'bg-score-good',
    fair: 'bg-score-fair',
    poor: 'bg-score-poor',
  };

  if (isNaN(score) || score === null || score === undefined) {
    return (
      <span className={cn(
        'inline-flex items-center justify-center rounded-full font-bold text-muted-foreground bg-muted',
        sizeClasses[size]
      )}>
        -
      </span>
    );
  }

  return (
    <span className={cn(
      'inline-flex items-center justify-center rounded-full font-bold text-primary-foreground',
      sizeClasses[size],
      categoryClasses[category]
    )}>
      {Math.round(score)}
    </span>
  );
}
