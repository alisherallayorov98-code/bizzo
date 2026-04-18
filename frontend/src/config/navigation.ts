import {
  LayoutDashboard, Users, Package, Warehouse,
  UserCheck, Wallet, TrendingDown, BarChart3,
  Settings, Trash2, ShoppingCart, HardHat,
  Factory, Wrench, FileText, Bell, Activity, Upload,
  type LucideIcon,
} from 'lucide-react'

// ============================================
// TYPES
// ============================================
export interface NavItem {
  id:          string
  label:       string
  tKey?:       string
  path:        string
  icon:        LucideIcon
  permission?: string
  module?:     string
  badge?:      string | number
  children?:   NavItem[]
}

export interface NavSection {
  id:      string
  label:   string
  tKey?:   string
  color?:  string
  items:   NavItem[]
  module?: string
}

// ============================================
// ASOSIY NAVIGATSIYA
// ============================================
export const CORE_NAV: NavSection[] = [
  {
    id:    'core',
    label: 'Asosiy',
    tKey:  'nav.main',
    items: [
      { id: 'dashboard', label: 'Dashboard',                 tKey: 'nav.dashboard', path: '/dashboard',  icon: LayoutDashboard, permission: 'dashboard' },
      { id: 'contacts',  label: 'Mijozlar va Yetkazuvchilar', tKey: 'nav.contacts',  path: '/contacts',   icon: Users,           permission: 'contacts.view' },
      { id: 'products',  label: 'Mahsulotlar katalogi',      tKey: 'nav.products',  path: '/products',   icon: Package,         permission: 'products.view' },
      { id: 'warehouse', label: 'Ombor',                     tKey: 'nav.warehouse', path: '/warehouse',  icon: Warehouse,       permission: 'warehouse.view' },
    ],
  },
  {
    id:    'hr',
    label: 'Xodimlar',
    tKey:  'nav.hr',
    items: [
      { id: 'employees', label: 'Xodimlar', tKey: 'nav.employees', path: '/employees', icon: UserCheck, permission: 'employees.view' },
      { id: 'salary',    label: 'Ish haqi', tKey: 'nav.salary',    path: '/salary',    icon: Wallet,    permission: 'salary.view' },
    ],
  },
  {
    id:    'finance',
    label: 'Moliya',
    tKey:  'nav.finance',
    items: [
      { id: 'debts',     label: 'Qarzlar',      tKey: 'nav.debts',     path: '/debts',     icon: TrendingDown, permission: 'debts.view' },
      { id: 'contracts', label: 'Shartnomalar', tKey: 'nav.contracts', path: '/contracts', icon: FileText },
      { id: 'reports',   label: 'Hisobotlar',   tKey: 'nav.reports',   path: '/reports',   icon: BarChart3,    permission: 'reports.view' },
      { id: 'smart',     label: 'Smart Tahlil', tKey: 'nav.smart',     path: '/smart',     icon: Activity },
      { id: 'import',    label: 'Import Markazi', tKey: 'nav.import',  path: '/import',    icon: Upload },
    ],
  },
]

// ============================================
// MODUL NAVIGATSIYASI
// ============================================
export const MODULE_NAV: NavSection[] = [
  {
    id:     'waste',
    label:  'Chiqindi qayta ishlash',
    tKey:   'nav.waste',
    color:  'var(--color-module-waste)',
    module: 'WASTE_MANAGEMENT',
    items: [
      { id: 'waste-dashboard',  label: "Umumiy ko'rinish", tKey: 'nav.wasteOverview',   path: '/waste',            icon: Trash2,     module: 'WASTE_MANAGEMENT' },
      { id: 'waste-batches',    label: 'Partiyalar',       tKey: 'nav.wasteBatches',    path: '/waste/batches',    icon: Package,    module: 'WASTE_MANAGEMENT' },
      { id: 'waste-processing', label: 'Qayta ishlash',    tKey: 'nav.wasteProcessing', path: '/waste/processing', icon: Factory,    module: 'WASTE_MANAGEMENT' },
      { id: 'waste-analytics',  label: "Yo'qotish tahlili", tKey: 'nav.wasteAnalytics',  path: '/waste/analytics',  icon: BarChart3,  module: 'WASTE_MANAGEMENT' },
      { id: 'waste-workers',    label: 'Ishchilar hisobi', tKey: 'nav.wasteWorkers',    path: '/waste/workers',    icon: UserCheck,  module: 'WASTE_MANAGEMENT' },
    ],
  },
  {
    id:     'sales',
    label:  'Savdo (CRM)',
    tKey:   'nav.sales',
    color:  'var(--color-module-crm)',
    module: 'SALES_CRM',
    items: [
      { id: 'sales-pipeline',  label: 'Sotuv pipeline', tKey: 'nav.salesPipeline',  path: '/sales/pipeline',  icon: ShoppingCart, module: 'SALES_CRM' },
      { id: 'sales-contracts', label: 'Shartnomalar',   tKey: 'nav.salesContracts', path: '/sales/contracts', icon: FileText,     module: 'SALES_CRM' },
    ],
  },
  {
    id:     'construction',
    label:  'Qurilish',
    tKey:   'nav.construction',
    color:  'var(--color-module-construct)',
    module: 'CONSTRUCTION',
    items: [
      { id: 'construction-objects', label: 'Obyektlar', tKey: 'nav.constructionObjects', path: '/construction/objects', icon: HardHat, module: 'CONSTRUCTION' },
    ],
  },
  {
    id:     'production',
    label:  'Ishlab chiqarish',
    tKey:   'nav.production',
    color:  'var(--color-module-production)',
    module: 'PRODUCTION',
    items: [
      { id: 'production-batches', label: 'Ishlab chiqarish', tKey: 'nav.productionBatches', path: '/production/batches', icon: Factory, module: 'PRODUCTION' },
    ],
  },
  {
    id:     'service',
    label:  "Xizmat ko'rsatish",
    tKey:   'nav.service',
    color:  'var(--color-module-hr)',
    module: 'SERVICE',
    items: [
      { id: 'service-tickets', label: 'Murojaatlar', tKey: 'nav.serviceTickets', path: '/service/tickets', icon: Wrench, module: 'SERVICE' },
    ],
  },
]

// ============================================
// PASTKI NAVIGATSIYA
// ============================================
export const BOTTOM_NAV: NavItem[] = [
  { id: 'notifications', label: 'Bildirishnomalar', tKey: 'nav.notifications', path: '/notifications', icon: Bell,     permission: 'dashboard' },
  { id: 'settings',      label: 'Sozlamalar',        tKey: 'nav.settings',      path: '/settings',      icon: Settings },
]
