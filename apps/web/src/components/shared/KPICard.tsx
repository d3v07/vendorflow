import { ReactNode } from 'react';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KPICardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: number;
  trendLabel?: string;
  className?: string;
  iconClassName?: string;
}

export function KPICard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  trendLabel = 'vs last month',
  className,
  iconClassName 
}: KPICardProps) {
  const getTrendIcon = () => {
    if (trend === undefined || trend === 0) return Minus;
    return trend > 0 ? TrendingUp : TrendingDown;
  };

  const TrendIcon = getTrendIcon();
  
  const getTrendColor = () => {
    if (trend === undefined || trend === 0) return 'text-muted-foreground';
    return trend > 0 ? 'text-success' : 'text-destructive';
  };

  return (
    <div className={cn('elegant-card hover-premium p-6', className)}>
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</span>
          <span className="text-3xl font-display font-semibold">{value}</span>
          {trend !== undefined && (
            <div className={cn('flex items-center gap-1.5 text-sm', getTrendColor())}>
              <TrendIcon className="h-4 w-4" />
              <span className="font-medium">{Math.abs(trend)}%</span>
              <span className="text-muted-foreground">{trendLabel}</span>
            </div>
          )}
        </div>
        <div className={cn(
          'flex h-12 w-12 items-center justify-center',
          iconClassName || 'bg-primary text-primary-foreground'
        )}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
