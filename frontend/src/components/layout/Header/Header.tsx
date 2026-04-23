import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Menu, Bell, LogOut, User, ChevronDown, Settings, RefreshCw, CheckCheck, Sun, Moon } from 'lucide-react'
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

// ============================================
// BILDIRISHNOMALAR
// ============================================
function NotificationButton() {
  const [dropOpen, setDropOpen] = useState(false)
  const t            = useT()
  const navigate     = useNavigate()
  const containerRef = useRef<HTMLDivElement>(null)

  const { data }     = useNotifications()
  const markRead     = useMarkRead()
  const markAllRead  = useMarkAllRead()
  const refresh      = useRefreshNotifications()

  const items   = data?.items       ?? []
  const unread  = data?.unreadCount ?? 0

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setDropOpen(false)
    }
    if (dropOpen) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [dropOpen])

  function handleClick(n: { id: string; link: string | null; isRead: boolean }) {
    if (!n.isRead) markRead.mutate(n.id)
    if (n.link) { navigate(n.link); setDropOpen(false) }
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
        onClick={() => setDropOpen(!dropOpen)}
        className="relative flex items-center justify-center w-8 h-8 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors"
      >
        <Bell size={17} />
        {unread > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-danger">
            <span className="absolute inset-0 rounded-full bg-danger animate-ping opacity-75" />
          </span>
        )}
      </button>

      {dropOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-bg-secondary border border-border-primary rounded-xl shadow-xl z-50 animate-scale-in overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border-primary">
            <span className="font-display font-semibold text-sm text-text-primary">{t('header.notifications')}</span>
            <div className="flex items-center gap-1">
              {unread > 0 && <Badge variant="danger" size="sm">{unread} {t('header.new')}</Badge>}
              <button
                onClick={() => refresh.mutate()}
                className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors"
                title="Yangilash"
              >
                <RefreshCw size={12} className={refresh.isPending ? 'animate-spin' : ''} />
              </button>
              {unread > 0 && (
                <button
                  onClick={() => markAllRead.mutate()}
                  className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors"
                  title="Hammasini o'qilgan deb belgilash"
                >
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
            <button
              onClick={() => { setDropOpen(false) }}
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
  const [open, setOpen] = useState(false)
  const { user, logout, fullName } = useAuth()
  const navigate     = useNavigate()
  const containerRef = useRef<HTMLDivElement>(null)
  const t = useT()

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
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-bg-tertiary transition-colors"
      >
        <div className="w-7 h-7 rounded-full bg-accent-primary/20 border border-accent-primary/30 flex items-center justify-center">
          <span className="text-[11px] font-bold text-accent-primary">
            {user ? `${user.firstName[0]}${user.lastName[0]}` : '??'}
          </span>
        </div>
        <span className="hidden md:block text-sm font-medium text-text-secondary max-w-[120px] truncate">
          {fullName}
        </span>
        <ChevronDown
          size={13}
          className={cn('text-text-muted transition-transform duration-150', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-bg-secondary border border-border-primary rounded-xl shadow-xl z-50 animate-scale-in overflow-hidden">
          <div className="px-4 py-3 border-b border-border-primary">
            <p className="text-sm font-medium text-text-primary">{fullName}</p>
            <p className="text-xs text-text-muted mt-0.5">{user?.email}</p>
            <Badge variant="primary" size="sm" className="mt-1.5">
              {user?.company.name}
            </Badge>
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
// HEADER
// ============================================
export function Header() {
  const openMobile  = useUIStore(s => s.openMobileSidebar)
  const collapsed   = useUIStore(s => s.sidebarCollapsed)
  const theme       = useUIStore(s => s.theme)
  const toggleTheme = useUIStore(s => s.toggleTheme)

  return (
    <header
      className={cn(
        'fixed top-0 right-0 z-30',
        'h-[var(--header-height)]',
        'bg-bg-secondary/80 backdrop-blur-md',
        'border-b border-border-primary',
        'flex items-center justify-between',
        'px-4 gap-3',
        'transition-all duration-300',
        // Sidebar kengligiga moslashish
        collapsed ? 'lg:left-[var(--sidebar-collapsed)]' : 'lg:left-[var(--sidebar-width)]',
        'max-lg:left-0',
      )}
    >
      <MorningDigest />

      {/* Chap */}
      <div className="flex items-center gap-2">
        <button
          onClick={openMobile}
          className="lg:hidden flex items-center justify-center w-8 h-8 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors"
        >
          <Menu size={18} />
        </button>
        <UniversalSearch />
      </div>

      {/* O'ng */}
      <div className="flex items-center gap-1">
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
  )
}

export default Header
