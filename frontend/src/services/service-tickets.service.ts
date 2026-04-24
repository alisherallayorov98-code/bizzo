import api from '@config/api'

export type ServiceStatus   = 'OPEN' | 'IN_PROGRESS' | 'WAITING' | 'RESOLVED' | 'CLOSED'
export type ServicePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

export interface ServiceTicket {
  id:          string
  companyId:   string
  contactId?:  string
  contact?:    { id: string; name: string; phone?: string }
  title:       string
  description?: string
  status:      ServiceStatus
  priority:    ServicePriority
  assigneeId?: string
  dueDate?:    string
  resolvedAt?: string
  notes?:      string
  createdAt:   string
  updatedAt:   string
}

export interface ServiceTicketStats {
  total:      number
  open:       number
  inProgress: number
  resolved:   number
  closed:     number
}

export const serviceTicketsService = {
  async getAll(query: Record<string, any> = {}): Promise<{ data: ServiceTicket[]; meta: any }> {
    const params = new URLSearchParams()
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== '') params.append(k, String(v))
    })
    const { data } = await api.get(`/service/tickets?${params}`)
    return data.data
  },

  async getOne(id: string): Promise<ServiceTicket> {
    const { data } = await api.get(`/service/tickets/${id}`)
    return data.data
  },

  async getStats(): Promise<ServiceTicketStats> {
    const { data } = await api.get('/service/tickets/stats')
    return data
  },

  async create(payload: {
    title:        string
    description?: string
    contactId?:   string
    priority?:    ServicePriority
    dueDate?:     string
    notes?:       string
  }): Promise<ServiceTicket> {
    const { data } = await api.post('/service/tickets', payload)
    return data.data
  },

  async update(id: string, payload: Partial<{
    title:        string
    description:  string
    status:       ServiceStatus
    priority:     ServicePriority
    assigneeId:   string
    dueDate:      string
    notes:        string
  }>): Promise<ServiceTicket> {
    const { data } = await api.put(`/service/tickets/${id}`, payload)
    return data.data
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/service/tickets/${id}`)
  },
}
