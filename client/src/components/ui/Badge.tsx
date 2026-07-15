import { ReactNode } from 'react';
import { cn } from '../../utils/classnames';

type BadgeVariant = 'primary' | 'success' | 'danger' | 'warning';

interface BadgeProps {
  variant?: BadgeVariant;
  count?: number;
  dot?: boolean;
  children?: ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  primary: 'bg-primary-600/20 text-primary-400 border-primary-500/30',
  success: 'bg-green-600/20 text-green-400 border-green-500/30',
  danger: 'bg-red-600/20 text-red-400 border-red-500/30',
  warning: 'bg-yellow-600/20 text-yellow-400 border-yellow-500/30',
};

const dotStyles: Record<BadgeVariant, string> = {
  primary: 'bg-primary-500',
  success: 'bg-green-500',
  danger: 'bg-red-500',
  warning: 'bg-yellow-500',
};

export default function Badge({
  variant = 'primary',
  count,
  dot = false,
  children,
  className,
}: BadgeProps) {
  if (dot) {
    return (
      <span
        className={cn(
          'inline-flex items-center justify-center',
          'w-2 h-2 rounded-full',
          dotStyles[variant],
          className
        )}
      />
    );
  }

  if (count !== undefined) {
    return (
      <span
        className={cn(
          'inline-flex items-center justify-center',
          'min-w-[20px] h-5 px-1.5',
          'text-xs font-semibold rounded-full',
          variantStyles[variant],
          className
        )}
      >
        {count > 99 ? '99+' : count}
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center',
        'px-2.5 py-0.5',
        'text-xs font-medium rounded-full border',
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
