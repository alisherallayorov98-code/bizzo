import type { ReactNode } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { cn } from '@utils/cn'

// ============================================
// TYPES
// ============================================
export interface Tab {
  id:        string
  label:     string
  path?:     string
  count?:    number
  disabled?: boolean
}

export interface TabsProps {
  tabs:      Tab[]
  active?:   string
  onChange?: (id: string) => void
  variant?:  'underline' | 'pills'
  className?: string
}

// ============================================
// TABS KOMPONENTI
// ============================================
export function Tabs({
  tabs,
  active,
  onChange,
  variant = 'underline',
  className,
}: TabsProps) {
  const navigate = useNavigate()
  const location = useLocation()

  const currentActive =
    active ||
    tabs.find(t => t.path && location.pathname.startsWith(t.path))?.id ||
    tabs[0]?.id

  function handleClick(tab: Tab) {
    if (tab.disabled) return
    if (tab.path) navigate(tab.path)
    onChange?.(tab.id)
  }

  if (variant === 'pills') {
    return (
      <div className={cn('flex items-center gap-1 p-1 bg-bg-tertiary rounded-lg w-fit', className)}>
        {tabs.map(tab => {
          const isActive = currentActive === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => handleClick(tab)}
              disabled={tab.disabled}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                tab.disabled && 'opacity-40 cursor-not-allowed',
                isActive
                  ? 'bg-bg-secondary text-text-primary shadow-sm'
                  : 'text-text-secondary hover:text-text-primary',
              )}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className={cn(
                  'text-xs px-1.5 py-0.5 rounded-full font-mono',
                  isActive
                    ? 'bg-accent-primary/10 text-accent-primary'
                    : 'bg-bg-elevated text-text-muted',
                )}>
                  {tab.count}
                </span>
              )}
            </button>
          )
        })}
      </div>
    )
  }

  // Underline (default)
  return (
    <div className={cn('flex items-center gap-1 -mb-px', className)}>
      {tabs.map(tab => {
        const isActive = currentActive === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => handleClick(tab)}
            disabled={tab.disabled}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium',
              'border-b-2 transition-all duration-150',
              tab.disabled && 'opacity-40 cursor-not-allowed',
              isActive
                ? 'border-accent-primary text-accent-primary'
                : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border-secondary',
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className={cn(
                'text-xs px-1.5 py-0.5 rounded-full font-mono',
                isActive
                  ? 'bg-accent-primary/10 text-accent-primary'
                  : 'bg-bg-tertiary text-text-muted',
              )}>
                {tab.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export default Tabs
