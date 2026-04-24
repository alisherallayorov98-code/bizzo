import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { cn } from '@utils/cn'
import { useSwipe } from '@hooks/useSwipe'

export interface ActionSheetAction {
  label:      string
  icon?:      React.ReactNode
  onClick:    () => void
  variant?:   'default' | 'danger' | 'primary'
  disabled?:  boolean
}

interface ActionSheetProps {
  open:        boolean
  onClose:     () => void
  title?:      string
  description?: string
  actions:     ActionSheetAction[]
  cancelLabel?: string
}

export function ActionSheet({
  open,
  onClose,
  title,
  description,
  actions,
  cancelLabel = 'Bekor qilish',
}: ActionSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null)

  useSwipe(sheetRef, {
    onSwipeDown: onClose,
    threshold:   60,
  })

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-[60] backdrop-blur-sm"
        style={{ animation: 'fadeIn 0.2s ease' }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className={cn(
          'fixed bottom-0 left-0 right-0 z-[70]',
          'bg-[var(--color-bg-secondary)] border-t border-[var(--color-border-primary)]',
          'rounded-t-2xl shadow-2xl',
        )}
        style={{
          paddingBottom: 'calc(16px + env(safe-area-inset-bottom))',
          animation:     'slideUpSheet 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-[var(--color-border-secondary)]" />
        </div>

        {/* Header */}
        {(title || description) && (
          <div className="px-4 pb-3 border-b border-[var(--color-border-primary)]">
            <div className="flex items-start justify-between">
              <div>
                {title && (
                  <p className="text-sm font-semibold text-[var(--color-text-primary)]">{title}</p>
                )}
                {description && (
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{description}</p>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="px-3 py-2 space-y-1">
          {actions.map((action, i) => (
            <button
              key={i}
              onClick={() => {
                if (action.disabled) return
                action.onClick()
                onClose()
              }}
              disabled={action.disabled}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all',
                'active:scale-[0.98]',
                action.disabled && 'opacity-40 cursor-not-allowed',
                action.variant === 'danger'  && 'text-[var(--color-danger)] hover:bg-[var(--color-danger-bg)]',
                action.variant === 'primary' && 'text-[var(--color-accent-primary)] hover:bg-[var(--color-accent-subtle)]',
                (!action.variant || action.variant === 'default') && 'text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]',
              )}
            >
              {action.icon && (
                <span className="flex-shrink-0">{action.icon}</span>
              )}
              {action.label}
            </button>
          ))}
        </div>

        {/* Cancel */}
        <div className="px-3 pt-1 pb-2">
          <button
            onClick={onClose}
            className={cn(
              'w-full py-3.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]',
              'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]',
              'hover:bg-[var(--color-bg-elevated)]',
            )}
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </>
  )
}
