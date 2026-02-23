import { ReactNode } from 'react';
import { LucideIcon, FileX, Inbox, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  variant?: 'default' | 'compact';
  className?: string;
}

export function EmptyState({ 
  icon: Icon = Inbox, 
  title, 
  description, 
  action,
  variant = 'default',
  className 
}: EmptyStateProps) {
  const isCompact = variant === 'compact';
  
  return (
    <div className={cn(
      'flex flex-col items-center justify-center text-center',
      isCompact ? 'py-8 px-4' : 'py-16 px-6',
      className
    )}>
      <div className={cn(
        'flex items-center justify-center rounded-full bg-muted',
        isCompact ? 'h-12 w-12 mb-3' : 'h-16 w-16 mb-4'
      )}>
        <Icon className={cn(
          'text-muted-foreground',
          isCompact ? 'h-6 w-6' : 'h-8 w-8'
        )} />
      </div>
      <h3 className={cn(
        'font-semibold text-foreground',
        isCompact ? 'text-base mb-1' : 'text-lg mb-2'
      )}>
        {title}
      </h3>
      <p className={cn(
        'text-muted-foreground max-w-sm',
        isCompact ? 'text-sm' : 'text-base mb-4'
      )}>
        {description}
      </p>
      {action && !isCompact && (
        <Button onClick={action.onClick} className="mt-4">
          {action.label}
        </Button>
      )}
    </div>
  );
}
