import { api } from '@config/api'

export interface ContractDto {
  id: string
  contractNumber: string
  title: string
  type: 'SALE' | 'PURCHASE' | 'SERVICE' | 'RENT' | 'OTHER'
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELED'
  contactId: string
  data: Record<string, any>
  startDate?: string
  endDate?: string
  totalAmount?: number
  currency: string
  templateId?: string
  pdfUrl?: string
  notes?: string
  createdAt: string
}

export interface ContractTemplateDto {
  id: string
  name: string
  type: ContractDto['type']
  content: any
  fields: any[]
  isDefault: boolean
  isActive: boolean
}

export const contractsService = {
  async list(params: Record<string, any> = {}) {
    const { data } = await api.get<{ data: { data: ContractDto[]; meta: any } }>('/contracts', { params })
    return data.data
  },
  async get(id: string) {
    const { data } = await api.get<{ data: ContractDto }>(`/contracts/${id}`)
    return data.data
  },
  async create(payload: Partial<ContractDto>) {
    const { data } = await api.post<{ data: ContractDto }>('/contracts', payload)
    return data.data
  },
  async update(id: string, payload: Partial<ContractDto>) {
    const { data } = await api.patch<{ data: ContractDto }>(`/contracts/${id}`, payload)
    return data.data
  },
  async sign(id: string) {
    const { data } = await api.post<{ data: ContractDto }>(`/contracts/${id}/sign`)
    return data.data
  },
  async cancel(id: string) {
    const { data } = await api.post<{ data: ContractDto }>(`/contracts/${id}/cancel`)
    return data.data
  },
  async generatePdf(id: string) {
    const { data } = await api.post<{ data: { url: string } }>(`/contracts/${id}/pdf`)
    return data.data
  },
  async expiring(days = 30) {
    const { data } = await api.get<{ data: ContractDto[] }>('/contracts/expiring', { params: { days } })
    return data.data
  },
  async templates() {
    const { data } = await api.get<{ data: ContractTemplateDto[] }>('/contracts/templates')
    return data.data
  },
  async createTemplate(payload: Partial<ContractTemplateDto>) {
    const { data } = await api.post<{ data: ContractTemplateDto }>('/contracts/templates', payload)
    return data.data
  },
  async updateTemplate(id: string, payload: Partial<ContractTemplateDto>) {
    const { data } = await api.patch<{ data: ContractTemplateDto }>(`/contracts/templates/${id}`, payload)
    return data.data
  },
  async deleteTemplate(id: string) {
    await api.delete(`/contracts/templates/${id}`)
  },
}
