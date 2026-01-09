import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
  variant?: 'default' | 'aberto' | 'atendimento' | 'resolvido';
}

const variantStyles = {
  default: 'bg-card border-border/50',
  aberto: 'bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200/50',
  atendimento: 'bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200/50',
  resolvido: 'bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200/50',
};

const iconVariantStyles = {
  default: 'bg-primary/10 text-primary',
  aberto: 'bg-amber-500/15 text-amber-600',
  atendimento: 'bg-blue-500/15 text-blue-600',
  resolvido: 'bg-emerald-500/15 text-emerald-600',
};

export default function StatCard({
  title,
  value,
  description,
  icon,
  trend,
  className,
  variant = 'default',
}: StatCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl p-6 border shadow-sm card-hover',
        variantStyles[variant],
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold text-foreground">{value}</p>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
          {trend && (
            <p
              className={cn(
                'text-sm font-medium',
                trend.isPositive ? 'text-emerald-600' : 'text-red-600'
              )}
            >
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
            </p>
          )}
        </div>
        {icon && (
          <div className={cn('p-3 rounded-xl', iconVariantStyles[variant])}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
