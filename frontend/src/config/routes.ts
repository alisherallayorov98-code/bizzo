export const ROUTES = {
  // Auth
  LOGIN:           '/login',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD:  '/reset-password',

  // Asosiy
  DASHBOARD:       '/dashboard',

  // Kontragentlar
  CONTACTS:        '/contacts',
  CONTACT_NEW:     '/contacts/new',
  CONTACT_DETAIL:  (id: string) => `/contacts/${id}`,
  CONTACT_EDIT:    (id: string) => `/contacts/${id}/edit`,

  // Mahsulotlar
  PRODUCTS:        '/products',
  PRODUCT_NEW:     '/products/new',
  PRODUCT_DETAIL:  (id: string) => `/products/${id}`,
  PRODUCT_EDIT:    (id: string) => `/products/${id}/edit`,

  // Ombor
  WAREHOUSE:            '/warehouse',
  WAREHOUSE_MOVEMENTS:  '/warehouse/movements',
  WAREHOUSE_INVENTORY:  '/warehouse/inventory',
  WAREHOUSE_TRANSFERS:  '/warehouse/transfers',

  // Xarid
  PURCHASE_ORDERS:      '/purchase/orders',

  // Xodimlar
  EMPLOYEES:       '/employees',
  EMPLOYEE_DETAIL: (id: string) => `/employees/${id}`,
  SALARY:          '/salary',

  // Qarzlar
  DEBTS:           '/debts',

  // Hisobotlar
  REPORTS:         '/reports',

  // Sozlamalar
  SETTINGS:         '/settings',
  SETTINGS_USERS:   '/settings/users',
  SETTINGS_MODULES: '/settings/modules',

  // Modullar
  WASTE:        '/waste',
  SALES:        '/sales',
  CONSTRUCTION: '/construction',
  PRODUCTION:   '/production',

  // Avtomatlashtirish
  AUTOMATION:   '/automation',

  // Xatolar
  UNAUTHORIZED: '/unauthorized',
  NOT_FOUND:    '/404',
} as const
