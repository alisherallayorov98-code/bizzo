import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes, type ReactNode } from 'react'
import { AlertCircle } from 'lucide-react'
import { cn } from '@utils/cn'

// ============================================
// INPUT
// ============================================

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?:        string
  error?:        string
  hint?:         string
  leftIcon?:     ReactNode
  rightIcon?:    ReactNode
  rightElement?: ReactNode
  fullWidth?:    boolean
  wrapperClass?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  rightElement,
  fullWidth    = true,
  wrapperClass,
  className,
  disabled,
  id,
  ...props
}, ref) => {
  const inputId = id ?? `input-${Math.random().toString(36).slice(2, 8)}`

  return (
    <div className={cn('flex flex-col gap-1.5', fullWidth && 'w-full', wrapperClass)}>
      {label && (
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-[var(--color-text-secondary)] select-none"
        >
          {label}
          {props.required && (
            <span className="text-[var(--color-danger)] ml-1">*</span>
          )}
        </label>
      )}

      <div className="relative flex items-center">
        {leftIcon && (
          <div className="absolute left-3 text-[var(--color-text-muted)] pointer-events-none flex items-center">
            {leftIcon}
          </div>
        )}

        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          className={cn(
            'h-9 w-full rounded-[var(--radius-md)] text-sm',
            'bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]',
            'border border-[var(--color-border-primary)]',
            'px-3 py-2',
            'placeholder:text-[var(--color-text-muted)]',
            'transition-all duration-150',
            'focus:outline-none focus:ring-2',
            'focus:ring-[var(--color-accent-primary)]/30',
            'focus:border-[var(--color-accent-primary)]',
            'hover:border-[var(--color-border-hover)]',
            error   && 'border-[var(--color-danger)]/50 focus:ring-[var(--color-danger)]/20 focus:border-[var(--color-danger)]',
            disabled && 'opacity-50 cursor-not-allowed bg-[var(--color-bg-secondary)]',
            leftIcon && 'pl-9',
            (rightIcon || rightElement) && 'pr-9',
            className
          )}
          {...props}
        />

        {rightElement ? (
          <div className="absolute right-1 flex items-center">{rightElement}</div>
        ) : rightIcon ? (
          <div className="absolute right-3 text-[var(--color-text-muted)] pointer-events-none flex items-center">
            {rightIcon}
          </div>
        ) : null}
      </div>

      {error && (
        <div className="flex items-center gap-1.5 text-xs text-[var(--color-danger)] animate-fade-in">
          <AlertCircle size={12} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!error && hint && (
        <p className="text-xs text-[var(--color-text-muted)]">{hint}</p>
      )}
    </div>
  )
})

Input.displayName = 'Input'

// ============================================
// TEXTAREA
// ============================================

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?:        string
  error?:        string
  hint?:         string
  wrapperClass?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({
  label, error, hint, wrapperClass, className, id, ...props
}, ref) => {
  const inputId = id ?? `textarea-${Math.random().toString(36).slice(2, 8)}`

  return (
    <div className={cn('flex flex-col gap-1.5 w-full', wrapperClass)}>
      {label && (
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-[var(--color-text-secondary)] select-none"
        >
          {label}
          {props.required && (
            <span className="text-[var(--color-danger)] ml-1">*</span>
          )}
        </label>
      )}

      <textarea
        ref={ref}
        id={inputId}
        className={cn(
          'w-full rounded-[var(--radius-md)] text-sm resize-y min-h-[80px]',
          'bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]',
          'border border-[var(--color-border-primary)]',
          'px-3 py-2',
          'placeholder:text-[var(--color-text-muted)]',
          'transition-all duration-150',
          'focus:outline-none focus:ring-2',
          'focus:ring-[var(--color-accent-primary)]/30',
          'focus:border-[var(--color-accent-primary)]',
          'hover:border-[var(--color-border-hover)]',
          error && 'border-[var(--color-danger)]/50 focus:ring-[var(--color-danger)]/20 focus:border-[var(--color-danger)]',
          className
        )}
        {...props}
      />

      {error && (
        <div className="flex items-center gap-1.5 text-xs text-[var(--color-danger)]">
          <AlertCircle size={12} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!error && hint && (
        <p className="text-xs text-[var(--color-text-muted)]">{hint}</p>
      )}
    </div>
  )
})

Textarea.displayName = 'Textarea'
export default Input
