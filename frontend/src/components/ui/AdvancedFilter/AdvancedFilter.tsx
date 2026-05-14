import { useState, useRef, useEffect } from 'react'
import { Filter, X, ChevronDown } from 'lucide-react'
import { Button } from '@components/ui/Button/Button'
import { cn } from '@utils/cn'

export interface FilterField {
  key:       string
  label:     string
  type:      'text' | 'select' | 'date' | 'number' | 'daterange'
  options?:  { value: string; label: string }[]
  placeholder?: string
}

export interface FilterValues {
  [key: string]: string | undefined
}

interface Props {
  fields:    FilterField[]
  values:    FilterValues
  onChange:  (v: FilterValues) => void
  onReset?:  () => void
  className?: string
}

export function AdvancedFilter({ fields, values, onChange, onReset, className }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const activeCount = Object.values(values).filter(v => v && v !== '').length

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function set(key: string, val: string) {
    onChange({ ...values, [key]: val || undefined })
  }

  function reset() {
    onChange({})
    onReset?.()
    setOpen(false)
  }

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          'flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm border transition-all',
          activeCount > 0
            ? 'border-[var(--color-accent-primary)] bg-[var(--color-accent-subtle)] text-[var(--color-accent-primary)]'
            : 'border-[var(--color-border-primary)] bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-secondary)]'
        )}
      >
        <Filter size={14} />
        <span>Filter</span>
        {activeCount > 0 && (
          <span className="flex items-center justify-center w-4 h-4 rounded-full bg-[var(--color-accent-primary)] text-white text-[10px] font-bold">
            {activeCount}
          </span>
        )}
        <ChevronDown size={12} className={cn('transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className={cn(
          'absolute top-full right-0 mt-1 z-50 min-w-[320px] p-4 rounded-xl border shadow-lg',
          'bg-[var(--color-bg-elevated)] border-[var(--color-border-primary)]',
          'animate-in fade-in slide-in-from-top-2 duration-150',
        )}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">Kengaytirilgan filter</p>
            <button onClick={() => setOpen(false)} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
              <X size={14} />
            </button>
          </div>

          <div className="space-y-3">
            {fields.map(field => (
              <div key={field.key}>
                <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">
                  {field.label}
                </label>

                {field.type === 'select' ? (
                  <select
                    value={values[field.key] || ''}
                    onChange={e => set(field.key, e.target.value)}
                    className="h-8 w-full rounded-md text-sm bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] border border-[var(--color-border-primary)] px-2 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent-primary)]"
                  >
                    <option value="">Hammasi</option>
                    {field.options?.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                ) : field.type === 'daterange' ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={values[`${field.key}From`] || ''}
                      onChange={e => set(`${field.key}From`, e.target.value)}
                      className="h-8 flex-1 rounded-md text-xs bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] border border-[var(--color-border-primary)] px-2 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent-primary)]"
                    />
                    <span className="text-[var(--color-text-muted)] text-xs">—</span>
                    <input
                      type="date"
                      value={values[`${field.key}To`] || ''}
                      onChange={e => set(`${field.key}To`, e.target.value)}
                      className="h-8 flex-1 rounded-md text-xs bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] border border-[var(--color-border-primary)] px-2 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent-primary)]"
                    />
                  </div>
                ) : (
                  <input
                    type={field.type}
                    value={values[field.key] || ''}
                    placeholder={field.placeholder}
                    onChange={e => set(field.key, e.target.value)}
                    className="h-8 w-full rounded-md text-sm bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] border border-[var(--color-border-primary)] px-2 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent-primary)]"
                  />
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-between mt-4 pt-3 border-t border-[var(--color-border-primary)]">
            <Button variant="ghost" size="sm" onClick={reset}>
              Tozalash
            </Button>
            <Button variant="primary" size="sm" onClick={() => setOpen(false)}>
              Qo'llash
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
