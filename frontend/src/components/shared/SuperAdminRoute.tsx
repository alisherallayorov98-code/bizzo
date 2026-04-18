import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@store/auth.store'

export function SuperAdminRoute() {
  const { user, isAuthenticated } = useAuthStore()

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />
  }

  if (user.role !== 'SUPER_ADMIN') {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
