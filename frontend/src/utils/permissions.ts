import type { UserRole } from '@/types/auth.types'

// Rol huquqlari
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  SUPER_ADMIN: ['*'],
  ADMIN: ['*'],
  MANAGER: [
    'contacts:read', 'contacts:write',
    'products:read', 'products:write',
    'warehouse:read', 'warehouse:write',
    'employees:read',
    'debts:read',
    'reports:read',
    'sales:read', 'sales:write',
  ],
  ACCOUNTANT: [
    'contacts:read',
    'products:read',
    'debts:read', 'debts:write',
    'reports:read', 'reports:export',
    'employees:read',
    'salary:read', 'salary:write',
  ],
  STOREKEEPER: [
    'products:read',
    'warehouse:read', 'warehouse:write',
    'contacts:read',
  ],
  SALESPERSON: [
    'contacts:read', 'contacts:write',
    'products:read',
    'sales:read', 'sales:write',
    'debts:read',
  ],
  EMPLOYEE: [
    'dashboard:read',
  ],
}

export function checkPermission(role: UserRole, permission: string): boolean {
  const rolePerms = ROLE_PERMISSIONS[role]
  if (!rolePerms) return false
  if (rolePerms.includes('*')) return true
  return rolePerms.includes(permission)
}

export function getRoleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    SUPER_ADMIN:  'Super Admin',
    ADMIN:        'Administrator',
    MANAGER:      'Menejer',
    ACCOUNTANT:   'Buxgalter',
    STOREKEEPER:  'Omborchi',
    SALESPERSON:  'Sotuvchi',
    EMPLOYEE:     'Xodim',
  }
  return labels[role] || role
}
