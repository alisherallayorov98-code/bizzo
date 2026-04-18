import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@utils/cn'

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'danger'
  | 'success'
  | 'warning'
  | 'ghost'
  | 'outline'

export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:   ButtonVariant
  size?:      ButtonSize
  loading?:   boolean
  leftIcon?:  ReactNode
  rightIcon?: ReactNode
  fullWidth?: boolean
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: [
    'bg-[var(--color-accent-primary)] text-white',
    'hover:bg-[var(--color-accent-hover)]',
    'active:bg-[var(--color-accent-active)]',
    'shadow-sm hover:shadow-[var(--shadow-glow)]',
    'border border-transparent',
  ].join(' '),

  secondary: [
    'bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]',
    'hover:bg-[var(--color-bg-elevated)]',
    'border border-[var(--color-border-primary)] hover:border-[var(--color-border-secondary)]',
  ].join(' '),

  danger: [
    'bg-[var(--color-danger-bg)] text-[var(--color-danger)]',
    'hover:bg-[var(--color-danger)] hover:text-white',
    'border border-[var(--color-danger-border)] hover:border-[var(--color-danger)]',
  ].join(' '),

  success: [
    'bg-[var(--color-success-bg)] text-[var(--color-success)]',
    'hover:bg-[var(--color-success)] hover:text-white',
    'border border-[var(--color-success-border)] hover:border-[var(--color-success)]',
  ].join(' '),

  warning: [
    'bg-[var(--color-warning-bg)] text-[var(--color-warning)]',
    'hover:bg-[var(--color-warning)] hover:text-white',
    'border border-[var(--color-warning-border)] hover:border-[var(--color-warning)]',
  ].join(' '),

  ghost: [
    'bg-transparent text-[var(--color-text-secondary)]',
    'hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]',
    'border border-transparent',
  ].join(' '),

  outline: [
    'bg-transparent text-[var(--color-text-primary)]',
    'hover:bg-[var(--color-accent-subtle)] hover:text-[var(--color-accent-primary)]',
    'border border-[var(--color-border-primary)] hover:border-[var(--color-accent-primary)]',
  ].join(' '),
}

const sizeStyles: Record<ButtonSize, string> = {
  xs: 'h-7  px-2.5 text-xs  gap-1   rounded-[var(--radius-sm)]',
  sm: 'h-8  px-3   text-xs  gap-1.5 rounded-[var(--radius-md)]',
  md: 'h-9  px-4   text-sm  gap-2   rounded-[var(--radius-md)]',
  lg: 'h-10 px-5   text-sm  gap-2   rounded-[var(--radius-lg)]',
  xl: 'h-12 px-6   text-base gap-2  rounded-[var(--radius-lg)]',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  variant   = 'primary',
  size      = 'md',
  loading   = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  disabled,
  className,
  children,
  ...props
}, ref) => {
  const isDisabled = disabled || loading

  return (
    <button
      ref={ref}
      disabled={isDisabled}
      className={cn(
        'inline-flex items-center justify-center font-medium select-none',
        'transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2',
        'focus-visible:ring-[var(--color-accent-primary)] focus-visible:ring-offset-2',
        'focus-visible:ring-offset-[var(--color-bg-primary)]',
        variantStyles[variant],
        sizeStyles[size],
        fullWidth && 'w-full',
        isDisabled && 'opacity-50 cursor-not-allowed pointer-events-none',
        className
      )}
      {...props}
    >
      {loading ? (
        <Loader2
          className="animate-spin shrink-0"
          size={size === 'xs' || size === 'sm' ? 14 : 16}
        />
      ) : leftIcon ? (
        <span className="shrink-0 flex items-center">{leftIcon}</span>
      ) : null}

      <span className={cn(loading && 'opacity-70')}>{children}</span>

      {!loading && rightIcon && (
        <span className="shrink-0 flex items-center">{rightIcon}</span>
      )}
    </button>
  )
})

Button.displayName = 'Button'
export default Button
