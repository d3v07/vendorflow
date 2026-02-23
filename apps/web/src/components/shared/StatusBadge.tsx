import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const statusBadgeVariants = cva(
  'inline-flex items-center px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border',
  {
    variants: {
      variant: {
        // Vendor statuses
        active: 'bg-success/10 text-success border-success/30',
        inactive: 'bg-muted text-muted-foreground border-border',
        pending: 'bg-warning/10 text-warning border-warning/30',
        
        // Contract statuses
        expiring_soon: 'bg-warning/10 text-warning border-warning/30',
        expired: 'bg-destructive/10 text-destructive border-destructive/30',
        draft: 'bg-muted text-muted-foreground border-border',
        
        // Invoice statuses
        paid: 'bg-success/10 text-success border-success/30',
        overdue: 'bg-destructive/10 text-destructive border-destructive/30',
        
        // Generic
        default: 'bg-primary/10 text-primary border-primary/30',
        secondary: 'bg-secondary text-secondary-foreground border-border',
        info: 'bg-info/10 text-info border-info/30',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

const statusLabels: Record<string, string> = {
  active: 'Active',
  inactive: 'Inactive',
  pending: 'Pending',
  expiring_soon: 'Expiring Soon',
  expired: 'Expired',
  draft: 'Draft',
  paid: 'Paid',
  overdue: 'Overdue',
};

interface StatusBadgeProps extends VariantProps<typeof statusBadgeVariants> {
  status: string;
  className?: string;
}

export function StatusBadge({ status, variant, className }: StatusBadgeProps) {
  const displayVariant = variant || (status as VariantProps<typeof statusBadgeVariants>['variant']);
  const label = statusLabels[status] || status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
  
  return (
    <span className={cn(statusBadgeVariants({ variant: displayVariant }), className)}>
      {label}
    </span>
  );
}
