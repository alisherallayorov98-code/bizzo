import api from '@config/api'

// ============================================
// TYPES
// ============================================
export type DealStage =
  'LEAD' | 'QUALIFIED' | 'PROPOSAL' | 'NEGOTIATION' | 'WON' | 'LOST'

export type InvoiceStatus =
  'DRAFT' | 'SENT' | 'VIEWED' | 'PAID' | 'PARTIAL' | 'OVERDUE' | 'CANCELLED'

export interface Deal {
  id:                 string
  dealNumber:         string
  title:              string
  contactId:          string
  contact?:           { id: string; name: string; phone?: string }
  stage:              DealStage
  probability:        number
  amount:             number
  discount:           number
  finalAmount:        number
  expectedCloseDate?: string
  closedAt?:          string
  assignedToId?:      string
  source?:            string
  notes?:             string
  lostReason?:        string
  items?:             DealItem[]
  _count?:            { activities: number; invoices: number }
  createdAt:          string
  updatedAt:          string
}

export interface DealItem {
  id:         string
  name:       string
  quantity:   number
  unit:       string
  price:      number
  discount:   number
  totalPrice: number
}

export interface PipelineColumn {
  stage:      string
  label:      string
  color:      string
  deals:      Deal[]
  count:      number
  totalValue: number
}

export interface SalesStats {
  wonThisMonth:    number
  wonCount:        number
  growthRate:      number
  activeDeals:     number
  pipelineValue:   number
  conversionRate:  number
  overdueInvoices: number
}

export interface Invoice {
  id:            string
  invoiceNumber: string
  dealId?:       string
  contactId:     string
  contact?:      { id: string; name: string; email?: string }
  subtotal:      number
  taxRate:       number
  taxAmount:     number
  discount:      number
  totalAmount:   number
  status:        InvoiceStatus
  paidAmount:    number
  dueDate?:      string
  paidAt?:       string
  notes?:        string
  items?:        InvoiceItem[]
  createdAt:     string
}

export interface InvoiceItem {
  id:         string
  name:       string
  quantity:   number
  unit:       string
  price:      number
  discount:   number
  totalPrice: number
}

export type ActivityType = 'CALL' | 'EMAIL' | 'MEETING' | 'NOTE' | 'TASK' | 'STATUS_CHANGE'

export interface DealActivity {
  id:           string
  dealId:       string
  type:         ActivityType
  title:        string
  description?: string
  dueDate?:     string
  completedAt?: string
  createdById:  string
  createdBy?:   { id: string; name: string }
  createdAt:    string
}

export interface InvoicePayment {
  id:          string
  invoiceId:   string
  amount:      number
  method:      string
  notes?:      string
  createdAt:   string
}

export interface InvoiceDetail extends Invoice {
  payments: InvoicePayment[]
  deal?:    { id: string; dealNumber: string; title: string }
}

export interface DealDetail extends Deal {
  activities: DealActivity[]
  invoices:   Array<Pick<Invoice, 'id' | 'invoiceNumber' | 'status' | 'totalAmount' | 'paidAmount' | 'dueDate' | 'createdAt'>>
  assignedTo?: { id: string; firstName: string; lastName: string; email: string } | null
}

export interface PaginatedDeals {
  data: Deal[]
  meta: { total: number; page: number; limit: number; totalPages: number }
}

export interface PaginatedInvoices {
  data: Invoice[]
  meta: { total: number; page: number; limit: number; totalPages: number }
}

// ============================================
// SERVICE
// ============================================
export const salesService = {
  async getStats(): Promise<SalesStats> {
    const { data } = await api.get<{ data: SalesStats }>('/sales/stats')
    return data.data
  },

  async getPipeline(filters?: { search?: string; assignedToId?: string }) {
    const params = new URLSearchParams()
    Object.entries(filters ?? {}).forEach(([k, v]) => {
      if (v !== undefined && v !== '') params.append(k, String(v))
    })
    const { data } = await api.get<{ data: { pipeline: PipelineColumn[]; pipelineValue: number } }>(
      `/sales/pipeline?${params}`,
    )
    return data.data
  },

  async createDeal(payload: Partial<Deal> & { items?: any[] }): Promise<Deal> {
    const { data } = await api.post<{ data: Deal }>('/sales/deals', payload)
    return data.data
  },

  async getDeals(query: Record<string, any> = {}): Promise<PaginatedDeals> {
    const params = new URLSearchParams()
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== '') params.append(k, String(v))
    })
    const { data } = await api.get<{ data: PaginatedDeals }>(`/sales/deals?${params}`)
    return data.data
  },

  async getDeal(id: string): Promise<DealDetail> {
    const { data } = await api.get<{ data: DealDetail }>(`/sales/deals/${id}`)
    return data.data
  },

  async updateDeal(id: string, payload: Partial<Deal> & { items?: any[] }): Promise<Deal> {
    const { data } = await api.put<{ data: Deal }>(`/sales/deals/${id}`, payload)
    return data.data
  },

  async updateStage(id: string, stage: string, lostReason?: string): Promise<Deal> {
    const { data } = await api.put<{ data: Deal }>(`/sales/deals/${id}/stage`, { stage, lostReason })
    return data.data
  },

  async getActivities(dealId: string): Promise<DealActivity[]> {
    const { data } = await api.get<{ data: DealActivity[] }>(`/sales/deals/${dealId}/activities`)
    return data.data
  },

  async addActivity(dealId: string, payload: {
    type: string; title: string; description?: string; dueDate?: string; completedAt?: string
  }): Promise<DealActivity> {
    const { data } = await api.post<{ data: DealActivity }>(`/sales/deals/${dealId}/activities`, payload)
    return data.data
  },

  async createInvoice(payload: any): Promise<Invoice> {
    const { data } = await api.post<{ data: Invoice }>('/sales/invoices', payload)
    return data.data
  },

  async getInvoices(query: Record<string, any> = {}): Promise<PaginatedInvoices> {
    const params = new URLSearchParams()
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== '') params.append(k, String(v))
    })
    const { data } = await api.get<{ data: PaginatedInvoices }>(`/sales/invoices?${params}`)
    return data.data
  },

  async bulkDeleteDeals(ids: string[]): Promise<{ deleted: number }> {
    const { data } = await api.delete<{ data: { deleted: number } }>('/sales/deals', { data: { ids } })
    return data.data
  },

  async bulkDeleteInvoices(ids: string[]): Promise<{ deleted: number }> {
    const { data } = await api.delete<{ data: { deleted: number } }>('/sales/invoices', { data: { ids } })
    return data.data
  },

  async getInvoice(id: string): Promise<InvoiceDetail> {
    const { data } = await api.get<{ data: InvoiceDetail }>(`/sales/invoices/${id}`)
    return data.data
  },

  async updateInvoiceStatus(id: string, status: string): Promise<Invoice> {
    const { data } = await api.patch<{ data: Invoice }>(`/sales/invoices/${id}/status`, { status })
    return data.data
  },

  async addPayment(invoiceId: string, payload: {
    amount: number; method: string; notes?: string
  }): Promise<Invoice> {
    const { data } = await api.post<{ data: Invoice }>(
      `/sales/invoices/${invoiceId}/payments`, payload,
    )
    return data.data
  },
}
