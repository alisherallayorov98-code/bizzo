export type UserRole =
  | 'ADMIN'
  | 'MANAGER'
  | 'ACCOUNTANT'
  | 'STOREKEEPER'
  | 'SALESPERSON'
  | 'EMPLOYEE'

export const ROUTE_PERMISSIONS: Record<string, UserRole[]> = {
  '/dashboard':           ['ADMIN', 'MANAGER', 'ACCOUNTANT', 'STOREKEEPER', 'SALESPERSON', 'EMPLOYEE'],

  '/warehouse':           ['ADMIN', 'MANAGER', 'STOREKEEPER'],
  '/warehouse/incoming':  ['ADMIN', 'MANAGER', 'STOREKEEPER'],
  '/warehouse/outgoing':  ['ADMIN', 'MANAGER', 'STOREKEEPER'],
  '/warehouse/return':    ['ADMIN', 'MANAGER', 'STOREKEEPER'],
  '/warehouse/movements': ['ADMIN', 'MANAGER', 'STOREKEEPER', 'ACCOUNTANT'],
  '/warehouse/inventory': ['ADMIN', 'MANAGER', 'STOREKEEPER'],

  '/contacts':            ['ADMIN', 'MANAGER', 'SALESPERSON', 'ACCOUNTANT'],

  '/products':            ['ADMIN', 'MANAGER', 'STOREKEEPER', 'SALESPERSON'],

  '/debts':               ['ADMIN', 'MANAGER', 'ACCOUNTANT'],
  '/reports':             ['ADMIN', 'MANAGER', 'ACCOUNTANT'],

  '/employees':           ['ADMIN', 'MANAGER'],
  '/salary':              ['ADMIN', 'ACCOUNTANT'],

  '/smart':               ['ADMIN', 'MANAGER'],
  '/import':              ['ADMIN'],

  '/sales':               ['ADMIN', 'MANAGER', 'SALESPERSON'],
  '/modules/waste':       ['ADMIN', 'MANAGER', 'STOREKEEPER'],
  '/modules/construction':['ADMIN', 'MANAGER'],
  '/modules/production':  ['ADMIN', 'MANAGER', 'STOREKEEPER'],
  '/service':             ['ADMIN', 'MANAGER', 'SALESPERSON'],

  '/settings':            ['ADMIN'],
  '/settings/users':      ['ADMIN'],
  '/billing':             ['ADMIN'],
  '/contracts':           ['ADMIN', 'MANAGER', 'ACCOUNTANT'],
  '/pos':                 ['ADMIN', 'MANAGER', 'SALESPERSON'],
}

export function hasRoutePermission(role: UserRole, path: string): boolean {
  if (ROUTE_PERMISSIONS[path]) {
    return ROUTE_PERMISSIONS[path].includes(role)
  }

  const matchedKey = Object.keys(ROUTE_PERMISSIONS)
    .filter(key => path.startsWith(key))
    .sort((a, b) => b.length - a.length)[0]

  if (matchedKey) {
    return ROUTE_PERMISSIONS[matchedKey].includes(role)
  }

  return role === 'ADMIN'
}
