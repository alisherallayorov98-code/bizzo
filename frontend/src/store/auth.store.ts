import { create } from 'zustand'

// ============================================
// TYPES (self-contained — no external import)
// ============================================
export interface AuthCompany {
  id:      string
  name:    string
  logo:    string | null
  plan:    string
  modules: string[]
}

export interface AuthUser {
  id:          string
  email:       string
  firstName:   string
  lastName:    string
  role:        string
  permissions: Record<string, boolean>
  company:     AuthCompany
}

// ============================================
// ROLE PERMISSIONS MATRIX
// ============================================
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: ['*'],
  ADMIN: ['*'],
  MANAGER: [
    'contacts.view', 'contacts.create', 'contacts.edit',
    'products.view', 'products.create', 'products.edit',
    'warehouse.view', 'warehouse.create',
    'employees.view',
    'debts.view', 'debts.create',
    'reports.view',
  ],
  ACCOUNTANT: [
    'contacts.view',
    'products.view',
    'debts.view', 'debts.create', 'debts.edit',
    'reports.view', 'reports.export',
    'salary.view', 'salary.edit',
  ],
  WAREHOUSE_MANAGER: [
    'products.view', 'products.create', 'products.edit',
    'warehouse.view', 'warehouse.create', 'warehouse.edit',
  ],
  HR_MANAGER: [
    'employees.view', 'employees.create', 'employees.edit',
    'salary.view', 'salary.create', 'salary.edit',
  ],
  CASHIER: [
    'contacts.view',
    'products.view',
    'debts.view', 'debts.create',
  ],
  VIEWER: [
    'contacts.view',
    'products.view',
    'warehouse.view',
    'reports.view',
  ],
}

// ============================================
// STORE INTERFACE
// ============================================
interface AuthState {
  user:            AuthUser | null
  accessToken:     string | null
  isLoading:       boolean
  isInitialized:   boolean

  // Actions
  setAuth:         (user: AuthUser, accessToken: string) => void
  setToken:        (accessToken: string) => void
  setUser:         (user: AuthUser) => void
  clearAuth:       () => void
  setLoading:      (loading: boolean) => void
  setInitialized:  (initialized: boolean) => void

  // Permission helpers
  isAuthenticated: () => boolean
  hasPermission:   (permission: string) => boolean
  hasModule:       (module: string) => boolean
  hasRole:         (roles: string[]) => boolean
  fullName:        () => string
}

// ============================================
// STORE
// ============================================
export const useAuthStore = create<AuthState>()((set, get) => ({
  user:           null,
  accessToken:    null,
  isLoading:      false,
  isInitialized:  false,

  // ----- Mutations -----
  setAuth: (user, accessToken) => {
    set({ user, accessToken, isInitialized: true })
  },

  setToken: (accessToken) => {
    set({ accessToken })
  },

  setUser: (user) => {
    set({ user })
  },

  clearAuth: () => {
    set({ user: null, accessToken: null, isInitialized: true })
  },

  setLoading: (isLoading) => {
    set({ isLoading })
  },

  setInitialized: (isInitialized) => {
    set({ isInitialized })
  },

  // ----- Derived -----
  isAuthenticated: () => {
    const { user, accessToken } = get()
    return Boolean(user && accessToken)
  },

  hasPermission: (permission: string) => {
    const { user } = get()
    if (!user) return false
    if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') return true

    // Custom per-user override
    if (user.permissions[permission] === true)  return true
    if (user.permissions[permission] === false) return false

    // Role matrix
    const rolePerms = ROLE_PERMISSIONS[user.role] || []
    return rolePerms.includes('*') || rolePerms.includes(permission)
  },

  hasModule: (module: string) => {
    const { user } = get()
    if (!user) return false
    return user.company.modules.includes(module)
  },

  hasRole: (roles: string[]) => {
    const { user } = get()
    if (!user) return false
    return roles.includes(user.role)
  },

  fullName: () => {
    const { user } = get()
    if (!user) return ''
    return `${user.firstName} ${user.lastName}`.trim()
  },
}))
