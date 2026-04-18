import { useEffect, useRef } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Lock } from 'lucide-react'
import { cn } from '@utils/cn'
import { useUIStore } from '@store/ui.store'
import { useAuth } from '@hooks/useAuth'
import { Badge } from '@components/ui/Badge/Badge'
import {
  CORE_NAV, MODULE_NAV, BOTTOM_NAV,
  type NavItem as NavItemType, type NavSection,
} from '@config/navigation'
import { useT } from '@i18n/index'

// ============================================
// NAV ITEM
// ============================================
interface NavItemProps {
  item:      NavItemType
  collapsed: boolean
}

function SidebarNavItem({ item, collapsed }: NavItemProps) {
  const location = useLocation()
  const { hasPermission, hasModule } = useAuth()
  const t = useT()
  const label = item.tKey ? t(item.tKey) : item.label

  const permitted  = item.permission ? hasPermission(item.permission) : true
  const modEnabled = item.module     ? hasModule(item.module)         : true
  if (!permitted || !modEnabled) return null

  const isActive =
    location.pathname === item.path ||
    (item.path !== '/dashboard' && location.pathname.startsWith(item.path + '/'))

  return (
    <NavLink
      to={item.path}
      title={collapsed ? item.label : undefined}
      className={cn(
        'group relative flex items-center gap-3 rounded-lg select-none',
        'transition-all duration-150 outline-none',
        collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2',
        isActive
          ? 'bg-accent-primary/10 text-accent-primary'
          : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary',
      )}
    >
      {/* Aktiv chiziq */}
      {isActive && !collapsed && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-accent-primary rounded-full" />
      )}

      {/* Icon */}
      <item.icon
        size={18}
        className={cn(
          'shrink-0 transition-colors',
          isActive ? 'text-accent-primary' : 'text-text-muted group-hover:text-text-secondary',
        )}
      />

      {/* Label */}
      {!collapsed && (
        <>
          <span className="flex-1 text-sm font-medium truncate">{label}</span>
          {item.badge !== undefined && (
            <Badge variant="danger" size="sm">{item.badge}</Badge>
          )}
        </>
      )}

      {/* Collapsed tooltip */}
      {collapsed && (
        <div
          className={cn(
            'absolute left-full ml-3 px-2.5 py-1.5 rounded-md z-[60]',
            'bg-bg-elevated border border-border-primary shadow-lg',
            'text-xs font-medium text-text-primary whitespace-nowrap',
            'opacity-0 pointer-events-none',
            'group-hover:opacity-100 group-hover:pointer-events-auto',
            'transition-opacity duration-150',
          )}
        >
          {label}
          {/* Arrow */}
          <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-bg-elevated" />
        </div>
      )}
    </NavLink>
  )
}

// ============================================
// NAV SECTION
// ============================================
interface NavSectionProps {
  section:   NavSection
  collapsed: boolean
}

function LockedSection({ section, collapsed }: NavSectionProps) {
  const t = useT()
  const label = section.tKey ? t(section.tKey) : section.label
  if (collapsed) return null
  return (
    <div className="opacity-40">
      <div className="flex items-center gap-2 px-3 py-1.5 mb-1">
        {section.color && (
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: section.color }} />
        )}
        <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted flex-1">
          {label}
        </span>
        <Lock size={10} className="text-text-muted" />
      </div>
      <div className="px-3 py-2 rounded-lg mx-1 bg-bg-tertiary/50 border border-dashed border-border-primary">
        <p className="text-[11px] text-text-muted text-center">Modul ulanmagan</p>
      </div>
    </div>
  )
}

function SidebarSection({ section, collapsed }: NavSectionProps) {
  const { hasModule } = useAuth()
  const t = useT()
  const label = section.tKey ? t(section.tKey) : section.label

  if (section.module && !hasModule(section.module)) {
    return <LockedSection section={section} collapsed={collapsed} />
  }

  return (
    <div className="space-y-0.5">
      {!collapsed && (
        <div className="flex items-center gap-2 px-3 py-1.5 mb-1">
          {section.color && (
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: section.color }} />
          )}
          <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
            {label}
          </span>
        </div>
      )}
      {section.items.map(item => (
        <SidebarNavItem key={item.id} item={item} collapsed={collapsed} />
      ))}
    </div>
  )
}

// ============================================
// SIDEBAR
// ============================================
export function Sidebar() {
  const collapsed        = useUIStore(s => s.sidebarCollapsed)
  const mobileOpen       = useUIStore(s => s.sidebarMobileOpen)
  const toggleSidebar    = useUIStore(s => s.toggleSidebar)
  const closeMobile      = useUIStore(s => s.closeMobileSidebar)
  const { user, fullName } = useAuth()
  const overlayRef       = useRef<HTMLDivElement>(null)

  // Mobile overlay tashqarisiga bosish
  useEffect(() => {
    if (!mobileOpen) return
    const handler = (e: MouseEvent) => {
      if (overlayRef.current === e.target) closeMobile()
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [mobileOpen, closeMobile])

  const roleLabel =
    user?.role === 'SUPER_ADMIN' ? 'Super Admin'
    : user?.role === 'ADMIN'     ? 'Administrator'
    : user?.role === 'MANAGER'   ? 'Menejer'
    : user?.role === 'ACCOUNTANT' ? 'Buxgalter'
    : user?.role === 'WAREHOUSE_MANAGER' ? 'Omborchi'
    : user?.role === 'HR_MANAGER'  ? 'HR Menejer'
    : user?.role === 'CASHIER'     ? 'Kassir'
    : 'Xodim'

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          ref={overlayRef}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={cn(
          'fixed top-0 left-0 h-full z-50 flex flex-col',
          'bg-bg-secondary border-r border-border-primary',
          'transition-all duration-300 ease-in-out',
          collapsed
            ? 'w-[var(--sidebar-collapsed)]'
            : 'w-[var(--sidebar-width)]',
          'lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >

        {/* ===== LOGO + TOGGLE ===== */}
        <div
          className={cn(
            'flex items-center h-[var(--header-height)] border-b border-border-primary shrink-0',
            collapsed ? 'justify-center px-2' : 'px-4 justify-between',
          )}
        >
          {/* Logo mark (always visible) */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-accent-primary/20 border border-accent-primary/40 flex items-center justify-center shrink-0">
              <div className="w-4 h-4 rounded-sm bg-accent-primary" />
            </div>
            {!collapsed && (
              <div className="animate-fade-in min-w-0">
                <p className="font-display font-bold text-sm text-text-primary leading-none">
                  ERP Platform
                </p>
                <p className="text-[10px] text-text-muted mt-0.5 truncate max-w-[140px]">
                  {user?.company.name ?? ''}
                </p>
              </div>
            )}
          </div>

          {/* Toggle — faqat desktop */}
          {!collapsed && (
            <button
              onClick={toggleSidebar}
              className="hidden lg:flex items-center justify-center w-6 h-6 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-all duration-150"
            >
              <ChevronLeft size={14} />
            </button>
          )}
        </div>

        {/* Collapsed: toggle float */}
        {collapsed && (
          <button
            onClick={toggleSidebar}
            className={cn(
              'hidden lg:flex items-center justify-center',
              'absolute -right-3 top-[30px] z-10',
              'w-6 h-6 rounded-full',
              'bg-bg-secondary border border-border-primary shadow-sm',
              'text-text-muted hover:text-text-primary',
              'transition-all duration-150',
            )}
          >
            <ChevronRight size={14} />
          </button>
        )}

        {/* ===== NAV AREA ===== */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 space-y-4 scrollbar-thin">

          {CORE_NAV.map(section => (
            <SidebarSection key={section.id} section={section} collapsed={collapsed} />
          ))}

          {/* Modul separator */}
          {MODULE_NAV.length > 0 && (
            <>
              {collapsed
                ? <div className="border-t border-border-primary mx-2 my-2" />
                : (
                  <div className="px-3">
                    <div className="border-t border-border-primary" />
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mt-3 mb-1">
                      Modullar
                    </p>
                  </div>
                )
              }
              {MODULE_NAV.map(section => (
                <SidebarSection key={section.id} section={section} collapsed={collapsed} />
              ))}
            </>
          )}
        </nav>

        {/* ===== PASTKI QISM ===== */}
        <div className="shrink-0 border-t border-border-primary p-2 space-y-0.5">
          {BOTTOM_NAV.map(item => (
            <SidebarNavItem key={item.id} item={item} collapsed={collapsed} />
          ))}

          {/* User */}
          <div
            className={cn(
              'flex items-center gap-2.5 rounded-lg px-2 py-2 mt-1',
              'hover:bg-bg-tertiary transition-colors cursor-pointer',
              collapsed && 'justify-center',
            )}
          >
            <div className="w-7 h-7 rounded-full bg-accent-primary/20 border border-accent-primary/30 flex items-center justify-center shrink-0">
              <span className="text-[11px] font-bold text-accent-primary">
                {user ? `${user.firstName[0]}${user.lastName[0]}` : '??'}
              </span>
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0 animate-fade-in">
                <p className="text-xs font-medium text-text-primary truncate leading-none mb-0.5">
                  {fullName}
                </p>
                <p className="text-[10px] text-text-muted truncate leading-none">{roleLabel}</p>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}

export default Sidebar
