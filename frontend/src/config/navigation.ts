import {
  LayoutDashboard, Users, Package, Warehouse,
  UserCheck, Wallet, TrendingDown, BarChart3,
  Settings, Trash2, ShoppingCart, HardHat,
  Factory, Wrench, FileText, Bell, Activity,
  Upload, ArrowDownToLine, ArrowUpFromLine,
  ClipboardList, TrendingUp, DollarSign,
  type LucideIcon,
} from 'lucide-react'

// ============================================
// TYPES
// ============================================
export interface SubTab {
  id:    string
  label: string
  tKey?: string
  path:  string
  icon?: LucideIcon
}

export interface NavItem {
  id:          string
  label:       string
  tKey?:       string
  path:        string
  icon:        LucideIcon
  permission?: string
  module?:     string
  badge?:      string | number
  subTabs?:    SubTab[]
  // backward compat
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
// ASOSIY NAVIGATSIYA (yangi flat struktura)
// ============================================
export const CORE_NAV_ITEMS: NavItem[] = [
  {
    id:         'dashboard',
    label:      'Dashboard',
    tKey:       'nav.dashboard',
    path:       '/dashboard',
    icon:       LayoutDashboard,
    permission: 'dashboard',
  },
  {
    id:         'contacts',
    label:      'Mijozlar',
    tKey:       'nav.contacts',
    path:       '/contacts',
    icon:       Users,
    permission: 'contacts.view',
    subTabs: [
      { id: 'all',       label: 'Barchasi',        path: '/contacts',               icon: Users           },
      { id: 'customers', label: 'Mijozlar',         path: '/contacts?type=CUSTOMER', icon: TrendingUp      },
      { id: 'suppliers', label: 'Yetkazuvchilar',   path: '/contacts?type=SUPPLIER', icon: ArrowDownToLine },
    ],
  },
  {
    id:         'products',
    label:      'Mahsulotlar',
    tKey:       'nav.products',
    path:       '/products',
    icon:       Package,
    permission: 'products.view',
    subTabs: [
      { id: 'catalog',  label: 'Katalog',   path: '/products',          icon: Package },
      { id: 'services', label: 'Xizmatlar', path: '/products?service=1', icon: Wrench  },
    ],
  },
  {
    id:         'warehouse',
    label:      'Ombor',
    tKey:       'nav.warehouse',
    path:       '/warehouse',
    icon:       Warehouse,
    permission: 'warehouse.view',
    subTabs: [
      { id: 'overview',  label: "Umumiy ko'rinish", path: '/warehouse',           icon: Warehouse       },
      { id: 'movements', label: 'Harakatlar',       path: '/warehouse/movements', icon: Activity        },
      { id: 'incoming',  label: 'Kirim',            path: '/warehouse/incoming',  icon: ArrowDownToLine },
      { id: 'outgoing',  label: 'Chiqim',           path: '/warehouse/outgoing',  icon: ArrowUpFromLine },
      { id: 'inventory', label: 'Inventarizatsiya', path: '/warehouse/inventory', icon: ClipboardList   },
    ],
  },
  {
    id:         'employees',
    label:      'Xodimlar',
    tKey:       'nav.employees',
    path:       '/employees',
    icon:       UserCheck,
    permission: 'employees.view',
    subTabs: [
      { id: 'list',   label: "Xodimlar ro'yxati", path: '/employees', icon: UserCheck },
      { id: 'salary', label: 'Ish haqi',          path: '/salary',    icon: Wallet    },
    ],
  },
  {
    id:         'debts',
    label:      'Qarzlar',
    tKey:       'nav.debts',
    path:       '/debts',
    icon:       TrendingDown,
    permission: 'debts.view',
    subTabs: [
      { id: 'receivable', label: 'Debitorlar',       path: '/debts?type=RECEIVABLE', icon: TrendingUp   },
      { id: 'payable',    label: 'Kreditorlar',      path: '/debts?type=PAYABLE',    icon: TrendingDown },
      { id: 'overdue',    label: "Muddati o'tgan",   path: '/debts?overdue=true',    icon: Bell         },
    ],
  },
  {
    id:         'contracts',
    label:      'Shartnomalar',
    tKey:       'nav.contracts',
    path:       '/contracts',
    icon:       FileText,
  },
  {
    id:         'reports',
    label:      'Hisobotlar',
    tKey:       'nav.reports',
    path:       '/reports',
    icon:       BarChart3,
    permission: 'reports.view',
    subTabs: [
      { id: 'financial', label: 'Moliya',   path: '/reports?tab=financial', icon: DollarSign },
      { id: 'warehouse', label: 'Ombor',    path: '/reports?tab=warehouse', icon: Warehouse  },
      { id: 'employees', label: 'Xodimlar', path: '/reports?tab=employees', icon: UserCheck  },
      { id: 'sales',     label: 'Savdo',    path: '/reports?tab=sales',     icon: TrendingUp },
    ],
  },
  {
    id:    'smart',
    label: 'Smart Tahlil',
    tKey:  'nav.smart',
    path:  '/smart',
    icon:  Activity,
    subTabs: [
      { id: 'overview', label: "Ko'rinish",  path: '/smart',              icon: Activity  },
      { id: 'abc',      label: 'ABC Tahlil', path: '/smart?tab=abc',      icon: BarChart3 },
      { id: 'rfm',      label: 'RFM Tahlil', path: '/smart?tab=rfm',      icon: Users     },
      { id: 'forecast', label: 'Bashorat',   path: '/smart?tab=forecast', icon: TrendingUp },
    ],
  },
  {
    id:    'import',
    label: 'Import',
    tKey:  'nav.import',
    path:  '/import',
    icon:  Upload,
  },
]

// ============================================
// MODULLAR
// ============================================
export const MODULE_NAV_ITEMS: NavItem[] = [
  {
    id:     'waste',
    label:  'Chiqindi',
    tKey:   'nav.waste',
    path:   '/waste',
    icon:   Trash2,
    module: 'WASTE_MANAGEMENT',
    subTabs: [
      { id: 'dashboard',  label: "Ko'rinish",     path: '/waste',            icon: BarChart3    },
      { id: 'batches',    label: 'Partiyalar',    path: '/waste/batches',    icon: Package      },
      { id: 'processing', label: 'Qayta ishlash', path: '/waste/processing', icon: Factory      },
      { id: 'workers',    label: 'Ishchilar',     path: '/waste/workers',    icon: UserCheck    },
      { id: 'analytics',  label: 'Tahlil',        path: '/waste/analytics',  icon: TrendingDown },
    ],
  },
  {
    id:     'sales',
    label:  'Savdo (CRM)',
    tKey:   'nav.sales',
    path:   '/sales/pipeline',
    icon:   ShoppingCart,
    module: 'SALES_CRM',
    subTabs: [
      { id: 'pipeline', label: 'Pipeline',   path: '/sales/pipeline', icon: TrendingUp  },
      { id: 'deals',    label: 'Bitimlar',   path: '/sales/deals',    icon: DollarSign  },
      { id: 'invoices', label: 'Hisob-fakt', path: '/sales/invoices', icon: FileText    },
    ],
  },
  {
    id:     'construction',
    label:  'Qurilish',
    tKey:   'nav.construction',
    path:   '/construction/objects',
    icon:   HardHat,
    module: 'CONSTRUCTION',
    subTabs: [
      { id: 'objects', label: 'Obyektlar', path: '/construction/objects', icon: HardHat },
    ],
  },
  {
    id:     'production',
    label:  'Ishlab chiqarish',
    tKey:   'nav.production',
    path:   '/production/batches',
    icon:   Factory,
    module: 'PRODUCTION',
    subTabs: [
      { id: 'formulas', label: 'Retseptlar', path: '/production/formulas', icon: ClipboardList },
      { id: 'batches',  label: 'Partiyalar', path: '/production/batches',  icon: Factory       },
    ],
  },
]

// ============================================
// BACKWARD COMPATIBILITY (Sidebar.tsx uchun)
// ============================================
export const CORE_NAV: NavSection[] = [
  {
    id:    'core',
    label: 'Asosiy',
    tKey:  'nav.main',
    items: CORE_NAV_ITEMS,
  },
]

export const MODULE_NAV: NavSection[] = MODULE_NAV_ITEMS.map(item => ({
  id:     item.id,
  label:  item.label,
  tKey:   item.tKey,
  module: item.module,
  color:  undefined,
  items:  [item],
}))

export const BOTTOM_NAV: NavItem[] = [
  { id: 'settings', label: 'Sozlamalar', tKey: 'nav.settings', path: '/settings', icon: Settings },
]
