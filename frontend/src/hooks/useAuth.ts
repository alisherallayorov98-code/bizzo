import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@store/auth.store'
import { authService, type LoginRequest } from '@services/auth.service'
import { ROUTES } from '@config/routes'

// ============================================
// useAuth
// ============================================
export function useAuth() {
  const navigate     = useNavigate()
  const queryClient  = useQueryClient()
  const store        = useAuthStore()

  // ----- Login mutation -----
  const loginMutation = useMutation({
    mutationFn: (credentials: LoginRequest) => authService.login(credentials),
    onSuccess: ({ accessToken, user }) => {
      store.setAuth(user, accessToken)
      queryClient.clear()
      if (user.role === 'SUPER_ADMIN') {
        navigate('/super-admin', { replace: true })
      } else {
        navigate(ROUTES.DASHBOARD, { replace: true })
      }
    },
  })

  // ----- Logout mutation -----
  const logoutMutation = useMutation({
    mutationFn: () => authService.logout(),
    onSettled: () => {
      store.clearAuth()
      queryClient.clear()
      navigate(ROUTES.LOGIN, { replace: true })
    },
  })

  return {
    // State
    user:            store.user,
    accessToken:     store.accessToken,
    isLoading:       store.isLoading || loginMutation.isPending || logoutMutation.isPending,
    isInitialized:   store.isInitialized,

    // Derived
    isAuthenticated: store.isAuthenticated(),
    fullName:        store.fullName(),
    role:            store.user?.role ?? null,
    company:         store.user?.company ?? null,

    // Permission helpers
    hasModule:       (module: string)      => store.hasModule(module),
    hasPermission:   (permission: string)  => store.hasPermission(permission),
    hasRole:         (roles: string[])     => store.hasRole(roles),

    // Actions
    login:  loginMutation.mutateAsync,
    logout: logoutMutation.mutate,

    // Mutation states
    loginError:   loginMutation.error,
    isLoggingIn:  loginMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
  }
}
