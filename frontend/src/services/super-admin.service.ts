import { api } from '@config/api'

export interface SACompany {
  id: string
  name: string
  legalName: string | null
  stir: string | null
  phone: string | null
  email: string | null
  address: string | null
  plan: 'STARTER' | 'BUSINESS' | 'PRO' | 'ENTERPRISE'
  isActive: boolean
  createdAt: string
  updatedAt: string
  _count?: { users: number; contacts: number; products: number }
}

export interface SAUser {
  id: string
  firstName: string
  lastName: string
  email: string
  role: string
  isActive: boolean
  createdAt: string
  lastLoginAt: string | null
  company: { id: string; name: string; plan: string }
}

export interface SAStats {
  totalCompanies: number
  activeCompanies: number
  inactiveCompanies: number
  totalUsers: number
  newCompaniesThisMonth: number
  plans: { STARTER: number; BUSINESS: number; PRO: number; ENTERPRISE: number }
}

export interface CreateCompanyPayload {
  name: string
  legalName?: string
  stir?: string
  phone?: string
  email?: string
  address?: string
  plan: 'STARTER' | 'BUSINESS' | 'PRO' | 'ENTERPRISE'
  adminFirstName: string
  adminLastName: string
  adminEmail: string
  adminPassword: string
}

const superAdminApi = {
  getStats: async (): Promise<SAStats> => {
    const { data } = await api.get('/super-admin/stats')
    return data.data
  },

  getCompanies: async (params?: Record<string, any>) => {
    const { data } = await api.get('/super-admin/companies', { params })
    return data.data as { data: SACompany[]; meta: { total: number; page: number; limit: number; totalPages: number } }
  },

  getCompany: async (id: string) => {
    const { data } = await api.get(`/super-admin/companies/${id}`)
    return data.data as SACompany & {
      users: SAUser[]
      modules: { moduleType: string; isActive: boolean; expiresAt: string | null }[]
      _count: Record<string, number>
    }
  },

  createCompany: async (payload: CreateCompanyPayload) => {
    const { data } = await api.post('/super-admin/companies', payload)
    return data.data as SACompany
  },

  updateCompany: async (id: string, payload: { name?: string; plan?: string; isActive?: boolean }) => {
    const { data } = await api.patch(`/super-admin/companies/${id}`, payload)
    return data.data as SACompany
  },

  toggleCompanyActive: async (id: string) => {
    const { data } = await api.patch(`/super-admin/companies/${id}/toggle-active`)
    return data.data as SACompany
  },

  changePlan: async (id: string, plan: string) => {
    const { data } = await api.patch(`/super-admin/companies/${id}/plan`, { plan })
    return data.data as SACompany
  },

  getUsers: async (params?: Record<string, any>) => {
    const { data } = await api.get('/super-admin/users', { params })
    return data.data as { data: SAUser[]; meta: { total: number; page: number; limit: number; totalPages: number } }
  },

  toggleUserActive: async (id: string) => {
    const { data } = await api.patch(`/super-admin/users/${id}/toggle-active`)
    return data.data
  },

  resetUserPassword: async (id: string, newPassword: string) => {
    const { data } = await api.patch(`/super-admin/users/${id}/reset-password`, { newPassword })
    return data.data
  },
}

export default superAdminApi
