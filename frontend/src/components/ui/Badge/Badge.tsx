import { type HTMLAttributes, type ReactNode } from 'react'
import { cn } from '@utils/cn'

export type BadgeVariant =
  | 'default'
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'purple'
  | 'orange'

export type BadgeSize = 'sm' | 'md' | 'lg'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  size?:    BadgeSize
  dot?:     boolean
  pulse?:   boolean
  children: ReactNode
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-[var(--color-bg-tertiary)]     text-[var(--color-text-secondary)]  border-[var(--color-border-primary)]',
  primary: 'bg-[var(--color-accent-subtle)]   text-[var(--color-accent-primary)]  border-[var(--color-accent-primary)]/30',
  success: 'bg-[var(--color-success-bg)]      text-[var(--color-success)]         border-[var(--color-success-border)]',
  warning: 'bg-[var(--color-warning-bg)]      text-[var(--color-warning)]         border-[var(--color-warning-border)]',
  danger:  'bg-[var(--color-danger-bg)]       text-[var(--color-danger)]          border-[var(--color-danger-border)]',
  info:    'bg-[var(--color-info-bg)]         text-[var(--color-info)]            border-[var(--color-info-border)]',
  purple:  'bg-purple-500/10                  text-purple-400                     border-purple-500/30',
  orange:  'bg-orange-500/10                  text-orange-400                     border-orange-500/30',
}

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'text-[10px] px-1.5 py-px  gap-1',
  md: 'text-xs     px-2   py-0.5 gap-1.5',
  lg: 'text-sm     px-2.5 py-1   gap-2',
}

const dotColorStyles: Record<BadgeVariant, string> = {
  default: 'bg-[var(--color-text-muted)]',
  primary: 'bg-[var(--color-accent-primary)]',
  success: 'bg-[var(--color-success)]',
  warning: 'bg-[var(--color-warning)]',
  danger:  'bg-[var(--color-danger)]',
  info:    'bg-[var(--color-info)]',
  purple:  'bg-purple-400',
  orange:  'bg-orange-400',
}

export function Badge({
  variant  = 'default',
  size     = 'md',
  dot      = false,
  pulse    = false,
  children,
  className,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full border whitespace-nowrap',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {(dot || pulse) && (
        <span className="relative inline-flex shrink-0">
          <span className={cn('rounded-full w-1.5 h-1.5', dotColorStyles[variant])} />
          {pulse && (
            <span
              className={cn(
                'absolute inset-0 rounded-full opacity-75',
                dotColorStyles[variant],
                'animate-[pingPulse_1.5s_ease-in-out_infinite]'
              )}
            />
          )}
        </span>
      )}
      {children}
    </span>
  )
}

export default Badge
