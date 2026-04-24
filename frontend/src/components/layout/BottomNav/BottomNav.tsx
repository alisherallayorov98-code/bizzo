import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, Warehouse,
  ShoppingCart, MoreHorizontal,
  UserRound, Wallet, BarChart3, CreditCard, Recycle, Settings,
} from 'lucide-react'
import { cn }        from '@utils/cn'
import { useMobile } from '@hooks/useMobile'
import { useAuth }   from '@hooks/useAuth'

type NavItem = {
  id:      string
  label:   string
  icon:    any
  path:    string | null
  module?: string
}

const BOTTOM_NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Bosh sahifa', icon: LayoutDashboard, path: '/dashboard' },
  { id: 'contacts',  label: 'Mijozlar',    icon: Users,           path: '/contacts'  },
  { id: 'warehouse', label: 'Ombor',       icon: Warehouse,       path: '/warehouse' },
  { id: 'sales',     label: 'Savdo',       icon: ShoppingCart,    path: '/sales',    module: 'SALES_CRM' },
  { id: 'more',      label: "Ko'proq",     icon: MoreHorizontal,  path: null         },
]

const MORE_ITEMS: Array<{ icon: any; label: string; path: string }> = [
  { icon: UserRound,  label: 'Xodimlar',   path: '/employees' },
  { icon: Wallet,     label: 'Ish haqi',   path: '/salary'    },
  { icon: BarChart3,  label: 'Hisobotlar', path: '/reports'   },
  { icon: CreditCard, label: 'Qarzlar',    path: '/debts'     },
  { icon: Recycle,    label: 'Chiqindi',   path: '/waste'     },
  { icon: Settings,   label: 'Sozlamalar', path: '/settings'  },
]

function haptic(pattern: number | number[] = 10) {
  if ('vibrate' in navigator) navigator.vibrate(pattern)
}

function MoreDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate()

  if (!open) return null

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-40"
        style={{ animation: 'fadeIn 0.2s ease' }}
        onClick={onClose}
      />
      <div
        className={cn(
          'fixed bottom-0 left-0 right-0 z-50',
          'bg-[var(--color-bg-secondary)] border-t border-[var(--color-border-primary)]',
          'rounded-t-2xl',
        )}
        style={{
          paddingBottom: 'calc(16px + env(safe-area-inset-bottom))',
          animation:     'slideUpSheet 0.3s ease',
        }}
      >
        <div className="flex justify-center pt-3 pb-4">
          <div className="w-10 h-1 rounded-full bg-[var(--color-border-secondary)]" />
        </div>
        <p className="text-center text-sm font-semibold text-[var(--color-text-primary)] mb-4 px-4">
          Boshqa bo'limlar
        </p>
        <div className="grid grid-cols-3 gap-2 px-4 pb-4">
          {MORE_ITEMS.map(item => (
            <button
              key={item.path}
              onClick={() => { haptic(10); navigate(item.path); onClose() }}
              className={cn(
                'flex flex-col items-center gap-2 p-3 rounded-xl',
                'bg-[var(--color-bg-tertiary)] border border-[var(--color-border-primary)]',
                'hover:bg-[var(--color-bg-elevated)] hover:border-[var(--color-border-secondary)]',
                'transition-all active:scale-95',
              )}
            >
              <item.icon size={22} className="text-[var(--color-accent-primary)]" />
              <span className="text-xs font-medium text-[var(--color-text-secondary)]">
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </>
  )
}

export function BottomNav() {
  const { isMobile }  = useMobile()
  const location      = useLocation()
  const navigate      = useNavigate()
  const { hasModule } = useAuth()
  const [moreOpen, setMoreOpen] = useState(false)

  if (!isMobile) return null

  return (
    <>
      <nav
        className={cn(
          'fixed bottom-0 left-0 right-0 z-30',
          'bg-[var(--color-bg-secondary)]/95 backdrop-blur-md',
          'border-t border-[var(--color-border-primary)]',
          'flex items-stretch',
        )}
        style={{
          paddingBottom: 'env(safe-area-inset-bottom)',
          height:        'calc(var(--bottom-nav-height) + env(safe-area-inset-bottom))',
        }}
      >
        {BOTTOM_NAV_ITEMS.map(item => {
          if (item.module && !hasModule(item.module)) return null

          const isActive = item.path
            ? (item.path === '/dashboard'
                ? location.pathname === '/dashboard'
                : location.pathname.startsWith(item.path))
            : moreOpen

          return (
            <button
              key={item.id}
              onClick={() => {
                haptic(10)
                if (item.path) {
                  navigate(item.path)
                  setMoreOpen(false)
                } else {
                  setMoreOpen(o => !o)
                }
              }}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-1',
                'py-2 px-1 transition-all duration-150 active:scale-95',
                isActive
                  ? 'text-[var(--color-accent-primary)]'
                  : 'text-[var(--color-text-muted)]',
              )}
            >
              <div className={cn(
                'relative w-8 h-8 rounded-xl flex items-center justify-center transition-all',
                isActive && 'bg-[var(--color-accent-subtle)]',
              )}>
                <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={cn(
                'text-[10px] font-medium leading-none',
                isActive
                  ? 'text-[var(--color-accent-primary)]'
                  : 'text-[var(--color-text-muted)]',
              )}>
                {item.label}
              </span>
            </button>
          )
        })}
      </nav>

      <MoreDrawer open={moreOpen} onClose={() => setMoreOpen(false)} />
    </>
  )
}

export default BottomNav
