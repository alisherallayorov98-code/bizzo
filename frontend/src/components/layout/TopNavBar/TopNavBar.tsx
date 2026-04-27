import { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate, NavLink } from 'react-router-dom'
import {
  ChevronDown, Settings, Lock,
  Menu, Bell, LogOut, User,
  Sun, Moon, CheckCheck, RefreshCw, Command,
} from 'lucide-react'
import { cn }               from '@utils/cn'
import { useUIStore }       from '@store/ui.store'
import { useAuth }          from '@hooks/useAuth'
import { useT }             from '@i18n/index'
import { Badge }            from '@components/ui/Badge/Badge'
import { LanguageSwitcher } from '@components/shared/LanguageSwitcher'
import { UniversalSearch }  from '@components/smart/UniversalSearch'
import { MorningDigest }    from '@components/smart/MorningDigest'
import {
  useNotifications, useMarkRead, useMarkAllRead, useRefreshNotifications,
} from '@hooks/useNotifications'
import {
  CORE_NAV_ITEMS, MODULE_NAV_ITEMS,
  type NavItem, type SubTab,
} from '@config/navigation'
import type { AppNotification } from '@services/notifications.service'
import { formatDistanceToNow } from 'date-fns'
import { uz } from 'date-fns/locale'

// ============================================
// BILDIRISHNOMALAR
// ============================================
function NotificationButton() {
  const [open, setOpen] = useState(false)
  const ref             = useRef<HTMLDivElement>(null)
  const t               = useT()
  const navigate        = useNavigate()
  const { data }        = useNotifications()
  const markRead        = useMarkRead()
  const markAll         = useMarkAllRead()
  const refresh         = useRefreshNotifications()
  const items           = data?.items       ?? []
  const unread          = data?.unreadCount ?? 0

  useEffect(() => {
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    if (open) document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  const typeColor = (type: string) => ({
    warning: 'bg-warning', success: 'bg-success',
    danger: 'bg-danger',   info: 'bg-accent-primary',
  }[type] ?? 'bg-accent-primary')

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen(!open)}
        className="relative flex items-center justify-center w-8 h-8 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors"
      >
        <Bell size={17} />
        {unread > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-danger">
            <span className="absolute inset-0 rounded-full bg-danger animate-ping opacity-75" />
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-bg-secondary border border-border-primary rounded-xl shadow-xl z-[9999] animate-scale-in overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border-primary">
            <span className="font-display font-semibold text-sm text-text-primary">
              {t('header.notifications')}
            </span>
            <div className="flex items-center gap-1">
              {unread > 0 && <Badge variant="danger" size="sm">{unread}</Badge>}
              <button onClick={() => refresh.mutate()} className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors">
                <RefreshCw size={12} className={refresh.isPending ? 'animate-spin' : ''} />
              </button>
              {unread > 0 && (
                <button onClick={() => markAll.mutate()} className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors">
                  <CheckCheck size={13} />
                </button>
              )}
            </div>
          </div>
          <div className="divide-y divide-border-primary max-h-72 overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-text-muted">
                Bildirishnomalar yo'q
              </div>
            ) : items.map((n: AppNotification) => (
              <div
                key={n.id}
                onClick={() => {
                  if (!n.isRead) markRead.mutate(n.id)
                  if (n.link) { navigate(n.link); setOpen(false) }
                }}
                className={cn(
                  'flex gap-3 px-4 py-3 hover:bg-bg-tertiary transition-colors cursor-pointer',
                  !n.isRead && 'bg-accent-primary/5',
                )}
              >
                <div className={cn('w-2 h-2 rounded-full mt-1.5 shrink-0', typeColor(n.type))} />
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm font-medium', n.isRead ? 'text-text-secondary' : 'text-text-primary')}>
                    {n.title}
                  </p>
                  <p className="text-xs text-text-muted truncate">{n.message}</p>
                </div>
                <span className="text-[10px] text-text-muted shrink-0 mt-0.5">
                  {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: uz })}
                </span>
              </div>
            ))}
          </div>
          <div className="px-4 py-2.5 border-t border-border-primary">
            <button onClick={() => setOpen(false)} className="text-xs text-accent-primary hover:text-accent-hover transition-colors w-full text-center">
              {t('header.viewAll')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================
// USER MENU
// ============================================
function UserMenu() {
  const [open, setOpen]            = useState(false)
  const { user, logout, fullName } = useAuth()
  const navigate                   = useNavigate()
  const ref                        = useRef<HTMLDivElement>(null)
  const t                          = useT()

  useEffect(() => {
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    if (open) document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-bg-tertiary transition-colors"
      >
        <div className="w-7 h-7 rounded-full bg-accent-primary/20 border border-accent-primary/30 flex items-center justify-center shrink-0">
          <span className="text-[11px] font-bold text-accent-primary">
            {user ? `${user.firstName[0]}${user.lastName[0]}` : '??'}
          </span>
        </div>
        <span className="hidden md:block text-sm font-medium text-text-secondary max-w-[90px] truncate">
          {fullName}
        </span>
        <ChevronDown size={12} className={cn('text-text-muted transition-transform duration-150', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-bg-secondary border border-border-primary rounded-xl shadow-xl z-[9999] animate-scale-in overflow-hidden">
          <div className="px-4 py-3 border-b border-border-primary">
            <p className="text-sm font-medium text-text-primary">{fullName}</p>
            <p className="text-xs text-text-muted mt-0.5">{user?.email}</p>
            <Badge variant="primary" size="sm" className="mt-1.5">{user?.company.name}</Badge>
          </div>
          <div className="p-1.5 space-y-0.5">
            {[
              { icon: User,     label: t('header.profile'),  to: '/settings/profile' },
              { icon: Settings, label: t('header.settings'), to: '/settings' },
            ].map(item => (
              <button key={item.label} onClick={() => { navigate(item.to); setOpen(false) }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
              >
                <item.icon size={15} />
                {item.label}
              </button>
            ))}
          </div>
          <div className="p-1.5 border-t border-border-primary">
            <button onClick={() => { logout(); setOpen(false) }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-danger hover:bg-danger/10 transition-colors"
            >
              <LogOut size={15} />
              {t('header.logout')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================
// MODULLAR DROPDOWN
// ============================================
function ModulesDropdown() {
  const [open, setOpen]     = useState(false)
  const ref                 = useRef<HTMLDivElement>(null)
  const navigate            = useNavigate()
  const location            = useLocation()
  const { hasModule }       = useAuth()
  const t                   = useT()

  const activeModules = MODULE_NAV_ITEMS.filter(m => m.module && hasModule(m.module))
  const lockedModules = MODULE_NAV_ITEMS.filter(m => m.module && !hasModule(m.module))

  useEffect(() => {
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    if (open) document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  useEffect(() => { setOpen(false) }, [location.pathname])

  if (activeModules.length === 0 && lockedModules.length === 0) return null

  const isModuleActive = activeModules.some(m =>
    location.pathname.startsWith('/' + m.id)
  )

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-1.5 px-2.5 h-9 rounded-md text-[13px] font-medium transition-all whitespace-nowrap shrink-0',
          isModuleActive
            ? 'text-accent-primary bg-accent-primary/10'
            : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary',
        )}
      >
        <span>Modullar</span>
        {activeModules.length > 0 && (
          <span className="text-[10px] tabular-nums bg-accent-primary/15 text-accent-primary px-1.5 py-0.5 rounded-full">
            {activeModules.length}
          </span>
        )}
        <ChevronDown size={12} className={cn('transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 w-64 bg-bg-secondary border border-border-primary rounded-xl shadow-xl z-[9999] animate-scale-in overflow-hidden">
          {activeModules.length > 0 && (
            <div className="p-1.5">
              <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                Faol modullar
              </p>
              {activeModules.map(mod => (
                <button
                  key={mod.id}
                  onClick={() => { navigate(mod.path); setOpen(false) }}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                    location.pathname.startsWith('/' + mod.id)
                      ? 'bg-accent-primary/10 text-accent-primary'
                      : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary',
                  )}
                >
                  <div className="w-7 h-7 rounded-lg bg-bg-tertiary flex items-center justify-center">
                    <mod.icon size={14} />
                  </div>
                  <span className="font-medium">{t(mod.tKey as any) || mod.label}</span>
                </button>
              ))}
            </div>
          )}

          {lockedModules.length > 0 && (
            <div className={cn('p-1.5', activeModules.length > 0 && 'border-t border-border-primary')}>
              <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                Qo'shish mumkin
              </p>
              {lockedModules.map(mod => (
                <button
                  key={mod.id}
                  onClick={() => { navigate('/billing'); setOpen(false) }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-text-muted hover:bg-bg-tertiary transition-colors"
                >
                  <div className="w-7 h-7 rounded-lg bg-bg-tertiary flex items-center justify-center opacity-50">
                    <mod.icon size={14} />
                  </div>
                  <span className="flex-1 text-left">{t(mod.tKey as any) || mod.label}</span>
                  <Lock size={12} className="opacity-60" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================
// NAV TUGMASI (asosiy bo'limlar)
// ============================================
function NavButton({ item }: { item: NavItem }) {
  const location          = useLocation()
  const navigate          = useNavigate()
  const { hasPermission } = useAuth()
  const t                 = useT()

  if (item.permission && !hasPermission(item.permission)) return null

  const isActive =
    item.path === '/dashboard'
      ? location.pathname === '/dashboard'
      : location.pathname.startsWith(item.path)

  const Icon = item.icon
  const label = t(item.tKey as any) || item.label

  return (
    <button
      onClick={() => navigate(item.path)}
      title={label}
      className={cn(
        'relative flex items-center gap-1.5 px-2.5 h-9 rounded-md text-[13px] font-medium',
        'transition-all duration-150 whitespace-nowrap shrink-0',
        isActive
          ? 'text-accent-primary bg-accent-primary/10'
          : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary',
      )}
    >
      {Icon && <Icon size={14} className="shrink-0" />}
      <span>{label}</span>
      {item.badge !== undefined && (
        <Badge variant="danger" size="sm">{item.badge}</Badge>
      )}
    </button>
  )
}

// ============================================
// 2-QATOR: SUB-TABS
// ============================================
export function SubTabBar() {
  const location = useLocation()
  const navigate = useNavigate()

  const allItems   = [...CORE_NAV_ITEMS, ...MODULE_NAV_ITEMS]
  const activeItem = allItems.find(item => {
    if (item.path === '/dashboard') return location.pathname === '/dashboard'
    return location.pathname.startsWith(item.path.split('?')[0])
  })

  const subTabs = activeItem?.subTabs
  if (!subTabs || subTabs.length <= 1) return null

  return (
    <div className="flex items-center gap-1 px-4 h-[var(--subtab-height)] bg-bg-primary/80 border-b border-border-primary/60 overflow-x-auto scrollbar-none">
      <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mr-2 shrink-0">
        {activeItem?.label}:
      </span>

      {subTabs.map((tab: SubTab) => {
        const [tabPath, tabQuery] = tab.path.split('?')
        const isActive =
          location.pathname === tabPath &&
          (!tabQuery || location.search.includes(tabQuery.split('=')[1]))

        return (
          <button
            key={tab.id}
            onClick={() => navigate(tab.path)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium',
              'transition-all duration-150 whitespace-nowrap shrink-0',
              isActive
                ? 'bg-accent-primary/15 text-accent-primary border border-accent-primary/30'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary',
            )}
          >
            {tab.icon && (
              <tab.icon
                size={11}
                className={isActive ? 'text-accent-primary' : 'text-text-muted'}
              />
            )}
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}

// ============================================
// MOBILE MENYU (drawer)
// ============================================
function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { hasPermission, hasModule } = useAuth()
  const location = useLocation()

  useEffect(() => {
    if (open) onClose()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute left-0 top-0 bottom-0 w-72 bg-bg-secondary border-r border-border-primary flex flex-col animate-slide-in-left overflow-y-auto">
        <div className="flex items-center justify-between px-4 h-14 border-b border-border-primary shrink-0">
          <span className="font-display font-bold text-text-primary">Menyu</span>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-text-muted hover:bg-bg-tertiary transition-colors text-xl leading-none"
          >
            ✕
          </button>
        </div>
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {CORE_NAV_ITEMS.map(item => {
            if (item.permission && !hasPermission(item.permission)) return null
            return (
              <NavLink
                key={item.id}
                to={item.path}
                end={item.id === 'dashboard'}
                className={({ isActive }) => cn(
                  'flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-accent-primary/10 text-accent-primary'
                    : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary',
                )}
              >
                <item.icon size={16} className="shrink-0" />
                {item.label}
              </NavLink>
            )
          })}

          {MODULE_NAV_ITEMS.some(m => m.module && hasModule(m.module)) && (
            <div className="pt-2">
              <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                Modullar
              </p>
              {MODULE_NAV_ITEMS.filter(m => m.module && hasModule(m.module)).map(mod => (
                <NavLink
                  key={mod.id}
                  to={mod.path}
                  className={({ isActive }) => cn(
                    'flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-accent-primary/10 text-accent-primary'
                      : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary',
                  )}
                >
                  <mod.icon size={16} className="shrink-0" />
                  {mod.label}
                </NavLink>
              ))}
            </div>
          )}
        </nav>
      </div>
    </div>
  )
}

// ============================================
// ASOSIY TOPNAVBAR
// ============================================
export function TopNavBar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const theme       = useUIStore(s => s.theme)
  const toggleTheme = useUIStore(s => s.toggleTheme)

  return (
    <>
      <MorningDigest />

      <div className="fixed top-0 left-0 right-0 z-30 flex flex-col bg-bg-secondary/95 backdrop-blur-md border-b border-border-primary">
        {/* === 1-QATOR: LOGO + SEARCH + ACTIONS === */}
        <header className="h-14 flex items-center gap-3 px-4">

          {/* Logo */}
          <NavLink to="/dashboard" className="flex items-center gap-2 shrink-0 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-primary to-purple-600 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              <span className="text-white font-black text-base">B</span>
            </div>
            <span className="hidden sm:block font-display font-black text-text-primary text-base tracking-tight">
              BIZZO
            </span>
          </NavLink>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden flex items-center justify-center w-8 h-8 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors shrink-0"
          >
            <Menu size={18} />
          </button>

          {/* Search — markazda, kengaytirilgan */}
          <div className="hidden md:flex flex-1 max-w-2xl">
            <UniversalSearch />
          </div>

          {/* O'ng tomon */}
          <div className="flex items-center gap-1 ml-auto shrink-0">
            <button
              title="Sahifalar ro'yxati (Ctrl+Shift+P)"
              onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'P', ctrlKey: true, shiftKey: true, bubbles: true }))}
              className="hidden md:flex items-center justify-center w-8 h-8 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors"
            >
              <Command size={15} />
            </button>
            <div className="hidden sm:block">
              <LanguageSwitcher />
            </div>
            <button
              onClick={toggleTheme}
              className="flex items-center justify-center w-8 h-8 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors"
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <NotificationButton />
            <div className="w-px h-5 bg-border-primary mx-1 shrink-0" />
            <UserMenu />
          </div>
        </header>

        {/* === 2-QATOR: NAVIGATSIYA (gorizontal scroll bilan) === */}
        <nav className="hidden lg:flex items-center gap-0.5 px-3 h-12 border-t border-border-primary/40 overflow-x-auto scrollbar-none">
          {CORE_NAV_ITEMS.map(item => (
            <NavButton key={item.id} item={item} />
          ))}
          <div className="w-px h-4 bg-border-primary mx-1 shrink-0" />
          <ModulesDropdown />
        </nav>

        {/* === 3-QATOR: SUB-TABS (kerak bo'lganda) === */}
        <SubTabBar />
      </div>

      {/* Mobile drawer */}
      <MobileMenu open={mobileOpen} onClose={() => setMobileOpen(false)} />
    </>
  )
}

export default TopNavBar
