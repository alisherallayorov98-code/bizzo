export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  accessToken: string
  refreshToken: string
  user: AuthUser
}

export interface AuthUser {
  id: string
  companyId: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
  permissions: Record<string, boolean>
  avatar?: string
  company: {
    id: string
    name: string
    logo?: string
    plan: CompanyPlan
    currency: string
    modules: ModuleType[]
  }
}

export type UserRole =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'MANAGER'
  | 'ACCOUNTANT'
  | 'STOREKEEPER'
  | 'SALESPERSON'
  | 'EMPLOYEE'

export type CompanyPlan = 'STARTER' | 'BUSINESS' | 'PRO' | 'ENTERPRISE'

export type ModuleType =
  | 'WASTE_MANAGEMENT'
  | 'SALES_CRM'
  | 'CONSTRUCTION'
  | 'PRODUCTION'
  | 'SERVICE'
  | 'ADVANCED_REPORTS'
  | 'AI_ANALYTICS'
  | 'INTEGRATIONS'
