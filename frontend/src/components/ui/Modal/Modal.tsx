import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@utils/cn'
import { Button, type ButtonVariant } from '../Button/Button'

// ============================================
// MODAL
// ============================================

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full'

export interface ModalProps {
  open:             boolean
  onClose:          () => void
  title?:           string
  description?:     string
  size?:            ModalSize
  children:         ReactNode
  footer?:          ReactNode
  closeOnOverlay?:  boolean
  showCloseButton?: boolean
}

const sizeStyles: Record<ModalSize, string> = {
  sm:   'max-w-md',
  md:   'max-w-lg',
  lg:   'max-w-2xl',
  xl:   'max-w-4xl',
  full: 'max-w-[95vw] h-[90vh]',
}

export function Modal({
  open,
  onClose,
  title,
  description,
  size              = 'md',
  children,
  footer,
  closeOnOverlay    = true,
  showCloseButton   = true,
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  // ESC tugmasi bilan yopish
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  // Body scroll bloklash
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        ref={overlayRef}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={closeOnOverlay ? onClose : undefined}
      />

      {/* Modal panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'relative z-10 w-full mx-auto',
          'bg-[var(--color-bg-secondary)]',
          'border border-[var(--color-border-primary)]',
          'rounded-[var(--radius-xl)]',
          'shadow-[var(--shadow-xl)]',
          'flex flex-col',
          'animate-scale-bounce',
          sizeStyles[size],
        )}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        {(title || description || showCloseButton) && (
          <div className="flex items-start justify-between p-5 border-b border-[var(--color-border-primary)]">
            <div className="flex-1 min-w-0">
              {title && (
                <h2 className="font-display font-semibold text-[var(--color-text-primary)] text-lg leading-tight">
                  {title}
                </h2>
              )}
              {description && (
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                  {description}
                </p>
              )}
            </div>
            {showCloseButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="ml-3 shrink-0 -mr-1 -mt-1 h-7 w-7 p-0"
                aria-label="Yopish"
              >
                <X size={15} />
              </Button>
            )}
          </div>
        )}

        {/* Tana */}
        <div
          className={cn(
            'flex-1 p-5 overflow-y-auto',
            size === 'full' && 'min-h-0'
          )}
        >
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-2.5 p-5 border-t border-[var(--color-border-primary)]">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================
// CONFIRM DIALOG
// ============================================

export interface ConfirmDialogProps {
  open:          boolean
  onClose:       () => void
  onConfirm:     () => void
  title:         string
  description?:  string
  confirmText?:  string
  cancelText?:   string
  variant?:      ButtonVariant
  loading?:      boolean
}

export function ConfirmDialog({
  open, onClose, onConfirm,
  title, description,
  confirmText = 'Tasdiqlash',
  cancelText  = 'Bekor qilish',
  variant     = 'danger',
  loading     = false,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      footer={
        <>
          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
            disabled={loading}
          >
            {cancelText}
          </Button>
          <Button
            variant={variant}
            size="sm"
            onClick={onConfirm}
            loading={loading}
          >
            {confirmText}
          </Button>
        </>
      }
    >
      <div className="space-y-1.5">
        <p className="font-display font-semibold text-[var(--color-text-primary)]">
          {title}
        </p>
        {description && (
          <p className="text-sm text-[var(--color-text-secondary)]">
            {description}
          </p>
        )}
      </div>
    </Modal>
  )
}

export default Modal
