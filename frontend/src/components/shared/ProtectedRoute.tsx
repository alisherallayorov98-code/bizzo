import { useEffect, useRef } from 'react'
import { Navigate, Outlet, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@store/auth.store'
import { authService } from '@services/auth.service'
import { LoadingScreen } from '@components/ui/LoadingScreen'
import { ROUTES } from '@config/routes'

// ============================================
// PROTECTED ROUTE
// Birinchi yuklanishda: getMe → (muvaffaqiyatsiz) → refresh → (muvaffaqiyatsiz) → /login
// Har 10 daqiqada: token yangilash
// ============================================
export function ProtectedRoute() {
  const store       = useAuthStore()
  const navigate    = useNavigate()
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    // Agar allaqachon autentifikatsiya qilingan (token bor) — me ni yangilash
    if (store.isAuthenticated()) {
      authService.getMe()
        .then((user) => {
          store.setUser(user)
          store.setInitialized(true)
        })
        .catch(() => tryRefresh())
      return
    }

    // Token yo'q — refresh orqali tiklash
    tryRefresh()

    async function tryRefresh() {
      try {
        const { accessToken, user } = await authService.refresh()
        store.setAuth(user, accessToken)
      } catch {
        store.clearAuth()
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ============================================
  // Token avtomatik yangilash (har 10 daqiqa)
  // ============================================
  useEffect(() => {
    if (!store.isAuthenticated()) return

    const interval = setInterval(async () => {
      try {
        const { accessToken, user } = await authService.refresh()
        store.setAuth(user, accessToken)
      } catch {
        store.clearAuth()
        navigate(ROUTES.LOGIN, { replace: true })
      }
    }, 10 * 60 * 1000)

    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.isAuthenticated()])

  // ============================================
  // RENDER
  // ============================================
  if (!store.isInitialized) {
    return <LoadingScreen message="Autentifikatsiya tekshirilmoqda" />
  }

  if (!store.isAuthenticated()) {
    return <Navigate to={ROUTES.LOGIN} replace />
  }

  // Super admin oddiy app ga kirmasin
  if (store.user?.role === 'SUPER_ADMIN') {
    return <Navigate to="/super-admin" replace />
  }

  return <Outlet />
}
