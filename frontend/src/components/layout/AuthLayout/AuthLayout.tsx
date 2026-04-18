import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@store/auth.store'
import { ROUTES } from '@config/routes'

export function AuthLayout() {
  const store = useAuthStore()

  // Autentifikatsiya qilingan foydalanuvchini dashboard ga yo'naltirish
  if (store.isInitialized && store.isAuthenticated()) {
    return <Navigate to={ROUTES.DASHBOARD} replace />
  }

  return (
    <div
      style={{
        minHeight:       '100vh',
        backgroundColor: 'var(--color-bg-primary)',
        display:         'flex',
        alignItems:      'stretch',
      }}
    >
      <Outlet />
    </div>
  )
}
