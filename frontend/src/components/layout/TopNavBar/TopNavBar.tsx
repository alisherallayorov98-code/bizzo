import { useState, useRef, useEffect } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  Menu, Bell, LogOut, User, ChevronDown, Settings,
  RefreshCw, CheckCheck, Sun, Moon, Lock, X,
} from 'lucide-react'
import { cn } from '@utils/cn'
import { useUIStore } from '@store/ui.store'
import { useAuth } from '@hooks/useAuth'
import { Badge } from '@components/ui/Badge/Badge'
import { LanguageSwitcher } from '@components/shared/LanguageSwitcher'
import { useT } from '@i18n/index'
import { UniversalSearch } from '@components/smart/UniversalSearch'
import { MorningDigest } from '@components/smart/MorningDigest'
import { useNotifications, useMarkRead, useMarkAllRead, useRefreshNotifications } from '@hooks/useNotifications'
import { formatDistanceToNow } from 'date-fns'
import { uz } from 'date-fns/locale'
import { CORE_NAV, MODULE_NAV } from '@config/navigation'
import type { NavItem } from '@config/navigation'

// ============================================
// TOP-NAV GURUH KONFIGURATSIYASI
// ============================================
interface NavGroup {
  id:      string
  label:   string
  path?:   string            // to'g'ridan-to'g'ri link
  items?:  NavItem[]         // dropdown elementlar
  module?: string
  color?:  string
}

const CORE_GROUPS: NavGroup[] = [
  {
    id:    'dashboard',
    label: 'Dashboard',
    path:  '/dashboard',
  },
  {
    id:    'contacts',
    label: 'Mijozlar',
    path:  '/contacts',
  },
  {
    id:    'products',
    label: 'Mahsulotlar',
    path:  '/products',
  },
  {
    id:    'warehouse',
    label: 'Ombor',
    items: [
      { id: 'wh-1', label: "Umumiy ko'rinish", path: '/warehouse',           icon: CORE_NAV[0].items[3].icon },
      { id: 'wh-2', label: 'Harakatlar',       path: '/warehouse/movements', icon: CORE_NAV[0].items[3].icon },
      { id: 'wh-3', label: 'Inventarizatsiya', path: '/warehouse/inventory', icon: CORE_NAV[0].items[3].icon },
    ],
  },
  {
    id:    'hr',
    label: 'Xodimlar',
    items: CORE_NAV[1].items,
  },
  {
    id:    'finance',
    label: 'Moliya',
    items: CORE_NAV[2].items,
  },
]

// ============================================
// BILDIRISHNOMALAR
// ============================================
function NotificationButton() {
  const [open, setOpen]   = useState(false)
  const containerRef      = useRef<HTMLDivElement>(null)
  const { data }          = useNotifications()
  const markRead          = useMarkRead()
  const markAllRead       = useMarkAllRead()
  const refresh           = useRefreshNotifications()
  const navigate          = useNavigate()
  const t                 = useT()

  const items  = data?.items       ?? []
  const unread = data?.unreadCount ?? 0

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  function handleClick(n: { id: string; link: string | null; isRead: boolean }) {
    if (!n.isRead) markRead.mutate(n.id)
    if (n.link) { navigate(n.link); setOpen(false) }
  }

  const typeColor = (type: string) => ({
    warning: 'bg-warning',
    success: 'bg-success',
    danger:  'bg-danger',
    info:    'bg-accent-primary',
  }[type] ?? 'bg-accent-primary')

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative flex items-center justify-center w-8 h-8 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors"
      >
        <Bell size={16} />
        {unread > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-danger">
            <span className="absolute inset-0 rounded-full bg-danger animate-ping opacity-75" />
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-bg-secondary border border-border-primary rounded-xl shadow-xl z-50 animate-scale-in overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border-primary">
            <span className="font-display font-semibold text-sm text-text-primary">{t('header.notifications')}</span>
            <div className="flex items-center gap-1">
              {unread > 0 && <Badge variant="danger" size="sm">{unread} {t('header.new')}</Badge>}
              <button
                onClick={() => refresh.mutate()}
                className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors"
              >
                <RefreshCw size={12} className={refresh.isPending ? 'animate-spin' : ''} />
              </button>
              {unread > 0 && (
                <button
                  onClick={() => markAllRead.mutate()}
                  className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors"
                >
                  <CheckCheck size={13} />
                </button>
              )}
            </div>
          </div>
          <div className="divide-y divide-border-primary max-h-72 overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-text-muted">Bildirishnomalar yo'q</div>
            ) : items.map(n => (
              <div
                key={n.id}
                onClick={() => handleClick(n)}
                className={cn(
                  'flex gap-3 px-4 py-3 hover:bg-bg-tertiary transition-colors cursor-pointer',
                  !n.isRead && 'bg-accent-primary/5',
                )}
              >
                <div className={cn('w-2 h-2 rounded-full mt-1.5 shrink-0', typeColor(n.type))} />
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm font-medium', n.isRead ? 'text-text-secondary' : 'text-text-primary')}>{n.title}</p>
                  <p className="text-xs text-text-muted truncate">{n.message}</p>
                </div>
                <span className="text-[10px] text-text-muted shrink-0 mt-0.5">
                  {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: uz })}
                </span>
              </div>
            ))}
          </div>
          <div className="px-4 py-2.5 border-t border-border-primary">
            <button
              onClick={() => setOpen(false)}
              className="text-xs text-accent-primary hover:text-accent-hover transition-colors w-full text-center"
            >
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
  const [open, setOpen]         = useState(false)
  const { user, logout, fullName } = useAuth()
  const navigate                = useNavigate()
  const containerRef            = useRef<HTMLDivElement>(null)
  const t                       = useT()

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-bg-tertiary transition-colors"
      >
        <div className="w-7 h-7 rounded-full bg-accent-primary/20 border border-accent-primary/30 flex items-center justify-center">
          <span className="text-[11px] font-bold text-accent-primary">
            {user ? `${user.firstName[0]}${user.lastName[0]}` : '??'}
          </span>
        </div>
        <span className="hidden md:block text-sm font-medium text-text-secondary max-w-[100px] truncate">
          {fullName}
        </span>
        <ChevronDown size={12} className={cn('text-text-muted transition-transform duration-150', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-bg-secondary border border-border-primary rounded-xl shadow-xl z-50 animate-scale-in overflow-hidden">
          <div className="px-4 py-3 border-b border-border-primary">
            <p className="text-sm font-medium text-text-primary">{fullName}</p>
            <p className="text-xs text-text-muted mt-0.5">{user?.email}</p>
            <Badge variant="primary" size="sm" className="mt-1.5">{user?.company.name}</Badge>
          </div>
          <div className="p-1.5 space-y-0.5">
            {[
              { icon: User,     label: t('header.profile'),  action: () => navigate('/settings/profile') },
              { icon: Settings, label: t('header.settings'), action: () => navigate('/settings') },
            ].map(item => (
              <button
                key={item.label}
                onClick={() => { item.action(); setOpen(false) }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
              >
                <item.icon size={15} />
                {item.label}
              </button>
            ))}
          </div>
          <div className="p-1.5 border-t border-border-primary">
            <button
              onClick={() => { logout(); setOpen(false) }}
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
// DROPDOWN NAV ITEM
// ============================================
function NavDropdown({ group }: { group: NavGroup }) {
  const [open, setOpen]  = useState(false)
  const containerRef     = useRef<HTMLDivElement>(null)
  const location         = useLocation()
  const { hasPermission, hasModule } = useAuth()

  const visibleItems = (group.items ?? []).filter(item => {
    const permitted  = item.permission ? hasPermission(item.permission) : true
    const modEnabled = item.module     ? hasModule(item.module)         : true
    return permitted && modEnabled
  })
  if (visibleItems.length === 0) return null

  const isActive = visibleItems.some(item =>
    location.pathname === item.path ||
    (item.path !== '/dashboard' && location.pathname.startsWith(item.path + '/'))
  )

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap',
          isActive
            ? 'text-accent-primary bg-accent-primary/10'
            : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary',
        )}
      >
        {group.label}
        <ChevronDown size={13} className={cn('transition-transform duration-150', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 min-w-[180px] bg-bg-secondary border border-border-primary rounded-xl shadow-xl z-50 animate-scale-in overflow-hidden py-1">
          {visibleItems.map(item => {
            const isItemActive =
              location.pathname === item.path ||
              (item.path !== '/dashboard' && location.pathname.startsWith(item.path + '/'))

            return (
              <NavLink
                key={item.id}
                to={item.path}
                onClick={() => setOpen(false)}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 mx-1 rounded-lg text-sm transition-colors',
                  isItemActive
                    ? 'text-accent-primary bg-accent-primary/10'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary',
                )}
              >
                {group.color && (
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: group.color }} />
                )}
                {item.icon && <item.icon size={14} className="shrink-0 text-text-muted" />}
                {item.label}
              </NavLink>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ============================================
// TO'G'RIDAN-TO'G'RI LINK
// ============================================
function NavDirectLink({ group }: { group: NavGroup }) {
  const { hasPermission } = useAuth()

  // dashboard requires 'dashboard' permission check optional
  if (group.id === 'contacts' && !hasPermission('contacts.view')) return null
  if (group.id === 'products' && !hasPermission('products.view')) return null

  return (
    <NavLink
      to={group.path!}
      className={({ isActive }) => cn(
        'px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap',
        isActive
          ? 'text-accent-primary bg-accent-primary/10'
          : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary',
      )}
    >
      {group.label}
    </NavLink>
  )
}

// ============================================
// MODULLAR DROPDOWN
// ============================================
function ModulesDropdown() {
  const [open, setOpen]    = useState(false)
  const containerRef       = useRef<HTMLDivElement>(null)
  const location           = useLocation()
  const { hasModule }      = useAuth()

  const activeModules = MODULE_NAV.filter(s => !s.module || hasModule(s.module))
  if (activeModules.length === 0) return null

  const isActive = activeModules.some(s =>
    s.items.some(item => location.pathname.startsWith(item.path))
  )

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap',
          isActive
            ? 'text-accent-primary bg-accent-primary/10'
            : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary',
        )}
      >
        Modullar
        <ChevronDown size={13} className={cn('transition-transform duration-150', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 min-w-[200px] bg-bg-secondary border border-border-primary rounded-xl shadow-xl z-50 animate-scale-in overflow-hidden py-1">
          {MODULE_NAV.map(section => {
            const enabled = !section.module || hasModule(section.module)
            if (!enabled) return (
              <div key={section.id} className="px-3 py-2 mx-1 opacity-40">
                <div className="flex items-center gap-2 text-xs text-text-muted">
                  <Lock size={11} />
                  {section.label}
                </div>
              </div>
            )
            return section.items.map(item => (
              <NavLink
                key={item.id}
                to={item.path}
                onClick={() => setOpen(false)}
                className={({ isActive }) => cn(
                  'flex items-center gap-2.5 px-3 py-2 mx-1 rounded-lg text-sm transition-colors',
                  isActive
                    ? 'text-accent-primary bg-accent-primary/10'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary',
                )}
              >
                {section.color && (
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: section.color }} />
                )}
                {item.icon && <item.icon size={14} className="shrink-0" />}
                {item.label}
              </NavLink>
            ))
          })}
        </div>
      )}
    </div>
  )
}

// ============================================
// MOBILE MENU
// ============================================
function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { hasPermission, hasModule } = useAuth()
  const location = useLocation()

  useEffect(() => { onClose() }, [location.pathname])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute left-0 top-0 bottom-0 w-72 bg-bg-secondary border-r border-border-primary flex flex-col animate-slide-in-left overflow-y-auto">
        <div className="flex items-center justify-between px-4 h-14 border-b border-border-primary shrink-0">
          <span className="font-display font-bold text-text-primary">Menyu</span>
          <button onClick={onClose} className="p-1.5 rounded-md text-text-muted hover:bg-bg-tertiary transition-colors">
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {CORE_GROUPS.map(group => {
            if (group.path) {
              return (
                <NavLink
                  key={group.id}
                  to={group.path}
                  className={({ isActive }) => cn(
                    'flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isActive ? 'bg-accent-primary/10 text-accent-primary' : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary',
                  )}
                >
                  {group.label}
                </NavLink>
              )
            }
            return (
              <div key={group.id}>
                <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted mt-2">
                  {group.label}
                </div>
                {(group.items ?? [])
                  .filter(item => {
                    const ok1 = item.permission ? hasPermission(item.permission) : true
                    const ok2 = item.module     ? hasModule(item.module)         : true
                    return ok1 && ok2
                  })
                  .map(item => (
                    <NavLink
                      key={item.id}
                      to={item.path}
                      className={({ isActive }) => cn(
                        'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
                        isActive ? 'bg-accent-primary/10 text-accent-primary' : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary',
                      )}
                    >
                      {item.icon && <item.icon size={15} />}
                      {item.label}
                    </NavLink>
                  ))
                }
              </div>
            )
          })}

          {MODULE_NAV.some(s => !s.module || hasModule(s.module)) && (
            <div>
              <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted mt-2">
                Modullar
              </div>
              {MODULE_NAV.map(section => {
                const enabled = !section.module || hasModule(section.module)
                return section.items.map(item => (
                  <NavLink
                    key={item.id}
                    to={item.path}
                    className={({ isActive }) => cn(
                      'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
                      !enabled && 'opacity-40 pointer-events-none',
                      isActive ? 'bg-accent-primary/10 text-accent-primary' : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary',
                    )}
                  >
                    {section.color && (
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: section.color }} />
                    )}
                    {item.icon && <item.icon size={15} />}
                    {item.label}
                  </NavLink>
                ))
              })}
            </div>
          )}
        </nav>
      </div>
    </div>
  )
}

// ============================================
// TOP NAV BAR
// ============================================
export function TopNavBar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const theme       = useUIStore(s => s.theme)
  const toggleTheme = useUIStore(s => s.toggleTheme)
  const { user }    = useAuth()

  return (
    <>
      <MorningDigest />

      <header className="fixed top-0 left-0 right-0 z-30 h-[var(--header-height)] bg-bg-secondary/90 backdrop-blur-md border-b border-border-primary flex items-center px-4 gap-3">

        {/* Logo */}
        <div className="flex items-center gap-2 shrink-0 mr-2">
          <div className="w-7 h-7 rounded-lg bg-accent-primary/20 border border-accent-primary/40 flex items-center justify-center">
            <div className="w-3.5 h-3.5 rounded-sm bg-accent-primary" />
          </div>
          <span className="hidden sm:block font-display font-bold text-sm text-text-primary leading-none">
            {user?.company?.name ?? 'ERP Platform'}
          </span>
        </div>

        {/* Desktop navigatsiya */}
        <nav className="hidden lg:flex items-center gap-0.5 flex-1 min-w-0 overflow-x-auto scrollbar-none">
          {CORE_GROUPS.map(group =>
            group.path
              ? <NavDirectLink key={group.id} group={group} />
              : <NavDropdown   key={group.id} group={group} />
          )}
          <ModulesDropdown />

          {/* Sozlamalar */}
          <NavLink
            to="/settings"
            className={({ isActive }) => cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap',
              isActive
                ? 'text-accent-primary bg-accent-primary/10'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary',
            )}
          >
            <Settings size={14} />
            Sozlamalar
          </NavLink>
        </nav>

        {/* Mobile: hamburger */}
        <button
          onClick={() => setMobileOpen(true)}
          className="lg:hidden flex items-center justify-center w-8 h-8 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors"
        >
          <Menu size={18} />
        </button>

        {/* Spacer */}
        <div className="flex-1 lg:flex-none" />

        {/* O'ng tomon asboblar */}
        <div className="flex items-center gap-1 shrink-0">
          <UniversalSearch />
          <div className="hidden sm:block"><LanguageSwitcher /></div>
          <button
            onClick={toggleTheme}
            className="flex items-center justify-center w-8 h-8 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors"
            title={theme === 'dark' ? 'Kunduzgi rejim' : 'Kechki rejim'}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <NotificationButton />
          <div className="w-px h-5 bg-border-primary mx-1" />
          <UserMenu />
        </div>
      </header>

      <MobileMenu open={mobileOpen} onClose={() => setMobileOpen(false)} />
    </>
  )
}

export default TopNavBar
