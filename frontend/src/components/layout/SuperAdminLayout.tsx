import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@store/auth.store'
import {
  LayoutDashboard, Building2, Users, LogOut, Shield,
} from 'lucide-react'

const navItems = [
  { to: '/super-admin',          icon: LayoutDashboard, label: 'Dashboard',   end: true },
  { to: '/super-admin/companies', icon: Building2,       label: 'Korxonalar'              },
  { to: '/super-admin/users',     icon: Users,           label: 'Foydalanuvchilar'        },
]

export function SuperAdminLayout() {
  const { user, clearAuth } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    clearAuth()
    navigate('/login')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#0A0F1E' }}>
      {/* Sidebar */}
      <aside style={{
        width: 240,
        flexShrink: 0,
        backgroundColor: '#0D1526',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Logo */}
        <div style={{
          padding: '20px 20px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              background: 'linear-gradient(135deg, #7C3AED, #5B21B6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Shield size={18} color="white" />
            </div>
            <div>
              <div style={{ color: '#E2E8F0', fontWeight: 700, fontSize: 14 }}>Bizzo</div>
              <div style={{ color: '#7C3AED', fontSize: 11, fontWeight: 600 }}>Super Admin</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 8px' }}>
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 12px',
                borderRadius: 8,
                textDecoration: 'none',
                marginBottom: 2,
                backgroundColor: isActive ? 'rgba(124,58,237,0.15)' : 'transparent',
                color: isActive ? '#A78BFA' : '#94A3B8',
                fontSize: 14,
                fontWeight: isActive ? 600 : 400,
                transition: 'all 0.15s',
              })}
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User + logout */}
        <div style={{
          padding: '12px 16px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{ color: '#94A3B8', fontSize: 12, marginBottom: 8 }}>
            {user?.firstName} {user?.lastName}
          </div>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              width: '100%', padding: '8px 10px', borderRadius: 8,
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#EF4444', fontSize: 13,
            }}
          >
            <LogOut size={15} />
            Chiqish
          </button>
        </div>
      </aside>

      {/* Content */}
      <main style={{ flex: 1, overflow: 'auto', padding: 32 }}>
        <Outlet />
      </main>
    </div>
  )
}
