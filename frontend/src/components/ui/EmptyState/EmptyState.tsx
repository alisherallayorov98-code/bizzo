import { type ReactNode } from 'react'
import { cn } from '@utils/cn'
import { Button } from '../Button/Button'

export interface EmptyStateProps {
  icon?:        ReactNode
  title:        string
  description?: string
  action?:      {
    label:   string
    onClick: () => void
    icon?:   ReactNode
  }
  secondaryAction?: {
    label:   string
    onClick: () => void
  }
  size?:      'sm' | 'md' | 'lg'
  className?: string
}

const sizeConfig = {
  sm: {
    iconBox:  'w-10 h-10 rounded-lg',
    iconSize: 'text-lg',
    title:    'text-sm font-semibold',
    desc:     'text-xs',
    padding:  'py-6',
  },
  md: {
    iconBox:  'w-14 h-14 rounded-xl',
    iconSize: 'text-2xl',
    title:    'text-base font-semibold',
    desc:     'text-sm',
    padding:  'py-10',
  },
  lg: {
    iconBox:  'w-20 h-20 rounded-2xl',
    iconSize: 'text-3xl',
    title:    'text-lg font-semibold',
    desc:     'text-base',
    padding:  'py-16',
  },
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  size      = 'md',
  className,
}: EmptyStateProps) {
  const cfg = sizeConfig[size]

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center select-none',
        cfg.padding,
        className
      )}
    >
      {icon && (
        <div
          className={cn(
            'flex items-center justify-center mb-4',
            'bg-[var(--color-bg-tertiary)] border border-[var(--color-border-primary)]',
            'text-[var(--color-text-muted)]',
            cfg.iconBox,
            cfg.iconSize,
          )}
        >
          {icon}
        </div>
      )}

      <p className={cn('font-display text-[var(--color-text-primary)] mb-1', cfg.title)}>
        {title}
      </p>

      {description && (
        <p className={cn('text-[var(--color-text-secondary)] max-w-xs', cfg.desc)}>
          {description}
        </p>
      )}

      {(action || secondaryAction) && (
        <div className="flex items-center gap-2 mt-5">
          {secondaryAction && (
            <Button
              variant="secondary"
              size="sm"
              onClick={secondaryAction.onClick}
            >
              {secondaryAction.label}
            </Button>
          )}
          {action && (
            <Button
              variant="primary"
              size="sm"
              leftIcon={action.icon}
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

export default EmptyState
