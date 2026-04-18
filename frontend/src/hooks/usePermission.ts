import { useAuthStore } from '@store/auth.store'

/**
 * Bitta ruxsatni tekshirish.
 * @example const canEdit = usePermission('contacts.edit')
 */
export function usePermission(permission: string): boolean {
  return useAuthStore((s) => s.hasPermission(permission))
}

/**
 * Modul aktivligini tekshirish.
 * @example const hasWarehouse = useModule('WAREHOUSE')
 */
export function useModule(module: string): boolean {
  return useAuthStore((s) => s.hasModule(module))
}

/**
 * Keng qamrovli ruxsat va modul ma'lumotlari.
 */
export function usePermissions() {
  const store = useAuthStore()
  const user  = store.user

  return {
    role:        user?.role ?? null,
    isAdmin:     user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN',
    isManager:   user?.role === 'MANAGER',

    can:         (permission: string) => store.hasPermission(permission),
    hasModule:   (module: string)     => store.hasModule(module),
    hasRole:     (roles: string[])    => store.hasRole(roles),

    // Tez-tez ishlatiladigan ruxsatlar
    canViewReports:   store.hasPermission('reports.view'),
    canExportReports: store.hasPermission('reports.export'),
    canManageUsers:   store.hasPermission('users.manage'),
    canManageSalary:  store.hasPermission('salary.edit'),
  }
}
