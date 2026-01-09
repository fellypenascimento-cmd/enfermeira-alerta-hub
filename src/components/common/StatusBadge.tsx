import { ChamadoStatus } from '@/types/database';
import { Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: ChamadoStatus;
  showIcon?: boolean;
  size?: 'sm' | 'md';
}

const statusConfig: Record<ChamadoStatus, { label: string; className: string }> = {
  aberto: {
    label: 'Aberto',
    className: 'status-aberto',
  },
  em_atendimento: {
    label: 'Em Atendimento',
    className: 'status-em_atendimento',
  },
  resolvido: {
    label: 'Resolvido',
    className: 'status-resolvido',
  },
};

export default function StatusBadge({ status, showIcon = true, size = 'md' }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        'status-badge',
        config.className,
        size === 'sm' && 'text-xs px-2 py-0.5'
      )}
    >
      {showIcon && (
        <Circle className={cn('fill-current', size === 'sm' ? 'h-2 w-2' : 'h-2.5 w-2.5')} />
      )}
      {config.label}
    </span>
  );
}
