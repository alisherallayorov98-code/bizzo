import api from '@config/api'

export interface CompanySettings {
  id:        string
  name:      string
  legalName?: string
  stir?:     string
  address?:  string
  phone?:    string
  email?:    string
  logo?:     string
  currency:  string
  taxRegime: string
  plan:      string
  modules:   CompanyModule[]
}

export interface CompanyModule {
  id:          string
  moduleType:  string
  isActive:    boolean
  activatedAt: string
  expiresAt?:  string
}

export interface UserSetting {
  id:           string
  email:        string
  firstName:    string
  lastName:     string
  phone?:       string
  role:         string
  isActive:     boolean
  lastLoginAt?: string
  createdAt:    string
}

export interface ModuleInfo {
  type:        string
  name:        string
  description: string
  color:       string
  price:       number
  isActive:    boolean
  moduleData?: CompanyModule | null
}

export const settingsService = {
  async getCompany(): Promise<CompanySettings> {
    const { data } = await api.get('/settings/company')
    return data
  },

  async updateCompany(payload: Partial<CompanySettings>) {
    const { data } = await api.put('/settings/company', payload)
    return data
  },

  async getUsers(): Promise<UserSetting[]> {
    const { data } = await api.get('/settings/users')
    return data
  },

  async createUser(payload: {
    email: string; password: string
    firstName: string; lastName: string
    role: string; phone?: string
  }) {
    const { data } = await api.post('/settings/users', payload)
    return data
  },

  async updateUserRole(id: string, role: string) {
    const { data } = await api.put(`/settings/users/${id}/role`, { role })
    return data
  },

  async toggleUserActive(id: string) {
    const { data } = await api.put(`/settings/users/${id}/toggle`)
    return data
  },

  async changePassword(oldPassword: string, newPassword: string) {
    const { data } = await api.put('/settings/password', { oldPassword, newPassword })
    return data
  },

  async getModules(): Promise<ModuleInfo[]> {
    const { data } = await api.get('/settings/modules')
    return data
  },

  async activateModule(type: string, months = 1) {
    const { data } = await api.post(`/settings/modules/${type}/activate`, { months })
    return data
  },

  async deactivateModule(type: string) {
    const { data } = await api.delete(`/settings/modules/${type}`)
    return data
  },

  async getPlan() {
    const { data } = await api.get('/settings/plan')
    return data
  },

  async updatePlan(plan: string) {
    const { data } = await api.put('/settings/plan', { plan })
    return data
  },
}
