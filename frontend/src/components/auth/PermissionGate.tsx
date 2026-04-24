import { Navigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '@hooks/useAuth'
import { hasRoutePermission } from '@config/permissions.config'
import { Lock, Home } from 'lucide-react'

interface PermissionGateProps {
  children:  React.ReactNode
  fallback?: 'redirect' | 'block'
}

export function PermissionGate({ children, fallback = 'block' }: PermissionGateProps) {
  const { user }     = useAuth()
  const { pathname } = useLocation()

  if (!user) return <Navigate to="/login" replace />

  const allowed = hasRoutePermission((user as any).role ?? 'EMPLOYEE', pathname)

  if (!allowed) {
    if (fallback === 'redirect') return <Navigate to="/dashboard" replace />

    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-danger/10 border border-danger/20 flex items-center justify-center mb-4">
          <Lock size={28} className="text-danger" />
        </div>
        <h2 className="text-xl font-bold text-text-primary mb-2">Kirish taqiqlangan</h2>
        <p className="text-sm text-text-muted mb-6 max-w-xs">
          Sizning rolingiz (<strong className="text-text-secondary">{(user as any).role}</strong>) bu sahifaga kirish huquqiga ega emas.
        </p>
        <Link to="/dashboard"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent-primary/10 border border-accent-primary/20 text-accent-primary text-sm font-medium hover:bg-accent-primary/20 transition-colors">
          <Home size={15} />
          Dashboard ga qaytish
        </Link>
      </div>
    )
  }

  return <>{children}</>
}
