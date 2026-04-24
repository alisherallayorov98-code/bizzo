import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, Package, Warehouse, UserCheck,
  BarChart2, FileText, TrendingUp, Settings, Upload,
  Recycle, HardHat, Factory, DollarSign, Search, ArrowRight,
  Brain,
} from 'lucide-react'
import { cn } from '@utils/cn'
import { useKeyboardShortcuts } from '@hooks/useKeyboardShortcuts'

interface Command {
  id:       string
  label:    string
  desc?:    string
  path:     string
  icon:     any
  category: string
  keywords: string
}

const COMMANDS: Command[] = [
  { id: 'dashboard',    label: 'Dashboard',       path: '/dashboard',           icon: LayoutDashboard, category: 'Asosiy',    keywords: 'bosh sahifa home' },
  { id: 'contacts',     label: 'Kontragentlar',   path: '/contacts',            icon: Users,           category: 'Asosiy',    keywords: 'mijozlar yetkazuvchilar' },
  { id: 'products',     label: 'Mahsulotlar',     path: '/products',            icon: Package,         category: 'Asosiy',    keywords: 'tovarlar katalog' },
  { id: 'warehouse',    label: 'Ombor',           path: '/warehouse',           icon: Warehouse,       category: 'Asosiy',    keywords: 'sklad qoldiq' },
  { id: 'employees',    label: 'Xodimlar',        path: '/employees',           icon: UserCheck,       category: 'Asosiy',    keywords: 'staff hr' },
  { id: 'salary',       label: 'Ish haqi',        path: '/employees/salary',    icon: DollarSign,      category: 'Asosiy',    keywords: 'maosh oylik' },
  { id: 'deals',        label: 'Bitimlar (CRM)',  path: '/sales',               icon: TrendingUp,      category: 'Modullar',  keywords: 'crm savdo pipeline' },
  { id: 'debts',        label: 'Qarzlar',         path: '/debts',               icon: BarChart2,       category: 'Asosiy',    keywords: 'kreditor debitor' },
  { id: 'contracts',    label: 'Shartnomalar',    path: '/contracts',           icon: FileText,        category: 'Asosiy',    keywords: 'contract document' },
  { id: 'reports',      label: 'Hisobotlar',      path: '/reports',             icon: BarChart2,       category: 'Asosiy',    keywords: 'analytics statistics' },
  { id: 'smart',        label: 'AI Tahlil',       path: '/smart',               icon: Brain,           category: 'AI',        keywords: 'ai analytics insights' },
  { id: 'waste',        label: 'Chiqit moduli',   path: '/modules/waste',       icon: Recycle,         category: 'Modullar',  keywords: 'qayta ishlash' },
  { id: 'construction', label: 'Qurilish moduli', path: '/modules/construction',icon: HardHat,         category: 'Modullar',  keywords: 'project loyiha' },
  { id: 'production',   label: 'Ishlab chiqarish',path: '/modules/production',  icon: Factory,         category: 'Modullar',  keywords: 'batch partiya' },
  { id: 'import',       label: 'Import markazi',  path: '/import',              icon: Upload,          category: 'Sozlamalar',keywords: '1c excel migrate' },
  { id: 'settings',     label: 'Sozlamalar',      path: '/settings/company',    icon: Settings,        category: 'Sozlamalar',keywords: 'config profile' },
]

export function CommandPalette() {
  const navigate   = useNavigate()
  const [open,    setOpen]    = useState(false)
  const [query,   setQuery]   = useState('')
  const [cursor,  setCursor]  = useState(0)
  const inputRef  = useRef<HTMLInputElement>(null)

  useKeyboardShortcuts([
    { key: 'p', ctrl: true, shift: true, handler: () => { setOpen(o => !o); setQuery(''); setCursor(0) } },
    { key: 'Escape', handler: () => setOpen(false) },
  ])

  const filtered = useMemo(() => {
    if (!query.trim()) return COMMANDS
    const q = query.toLowerCase()
    return COMMANDS.filter(c =>
      c.label.toLowerCase().includes(q) ||
      c.desc?.toLowerCase().includes(q) ||
      c.keywords.includes(q) ||
      c.category.toLowerCase().includes(q),
    )
  }, [query])

  useEffect(() => { setCursor(0) }, [query])
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 50) }, [open])

  const go = (cmd: Command) => {
    navigate(cmd.path)
    setOpen(false)
    setQuery('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setCursor(c => Math.min(c + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setCursor(c => Math.max(c - 1, 0))
    } else if (e.key === 'Enter' && filtered[cursor]) {
      go(filtered[cursor])
    }
  }

  if (!open) return null

  const grouped = filtered.reduce<Record<string, Command[]>>((acc, cmd) => {
    if (!acc[cmd.category]) acc[cmd.category] = []
    acc[cmd.category].push(cmd)
    return acc
  }, {})

  return (
    <div
      className="fixed inset-0 z-[300] flex items-start justify-center pt-[15vh]"
      onClick={() => setOpen(false)}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-xl mx-4 bg-bg-secondary border border-border-primary rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border-primary">
          <Search size={16} className="text-text-muted shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Sahifa yoki buyruq qidiring..."
            className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none"
          />
          <kbd className="px-2 py-0.5 rounded bg-bg-tertiary border border-border-primary text-[10px] text-text-muted font-mono">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-sm text-text-muted">
              Hech narsa topilmadi
            </div>
          ) : (
            Object.entries(grouped).map(([category, cmds]) => (
              <div key={category}>
                <div className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                  {category}
                </div>
                {cmds.map(cmd => {
                  const globalIndex = filtered.indexOf(cmd)
                  const Icon = cmd.icon
                  return (
                    <button
                      key={cmd.id}
                      onClick={() => go(cmd)}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors',
                        cursor === globalIndex
                          ? 'bg-accent-primary/10 text-accent-primary'
                          : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary',
                      )}
                      onMouseEnter={() => setCursor(globalIndex)}
                    >
                      <div className={cn(
                        'w-7 h-7 rounded-lg flex items-center justify-center shrink-0',
                        cursor === globalIndex ? 'bg-accent-primary/20' : 'bg-bg-elevated',
                      )}>
                        <Icon size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-medium">{cmd.label}</span>
                        {cmd.desc && (
                          <span className="ml-2 text-xs text-text-muted">{cmd.desc}</span>
                        )}
                      </div>
                      {cursor === globalIndex && (
                        <ArrowRight size={13} className="text-accent-primary shrink-0" />
                      )}
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 px-4 py-2.5 border-t border-border-primary text-[10px] text-text-muted">
          <span><kbd className="font-mono bg-bg-tertiary border border-border-primary rounded px-1">↑↓</kbd> navigatsiya</span>
          <span><kbd className="font-mono bg-bg-tertiary border border-border-primary rounded px-1">↵</kbd> o'tish</span>
          <span><kbd className="font-mono bg-bg-tertiary border border-border-primary rounded px-1">Ctrl⇧P</kbd> yopish</span>
        </div>
      </div>
    </div>
  )
}
