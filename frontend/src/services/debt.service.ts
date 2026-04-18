import api from '@config/api'

export interface DebtRecord {
  id:            string
  contactId:     string
  contact?:      { id: string; name: string; phone?: string; type: string }
  type:          'RECEIVABLE' | 'PAYABLE'
  amount:        number
  paidAmount:    number
  remainAmount:  number
  dueDate?:      string
  isOverdue:     boolean
  referenceType?: string
  notes?:        string
  createdAt:     string
}

export interface DebtStats {
  receivable: { total: number; count: number; overdue: number; overdueCount: number }
  payable:    { total: number; count: number; overdue: number; overdueCount: number }
  netBalance: number
  topDebts:   DebtRecord[]
}

export interface PaginatedDebts {
  data: DebtRecord[]
  meta: { total: number; page: number; limit: number; totalPages: number }
}

export const debtService = {
  async getAll(query: Record<string, any> = {}): Promise<PaginatedDebts> {
    const params = new URLSearchParams()
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== '') params.append(k, String(v))
    })
    const { data } = await api.get<{ data: PaginatedDebts }>(`/debts?${params}`)
    return data.data
  },

  async getStats(): Promise<DebtStats> {
    const { data } = await api.get<{ data: DebtStats }>('/debts/stats')
    return data.data
  },

  async create(payload: {
    contactId:  string
    type:       string
    amount:     number
    dueDate?:   string
    notes?:     string
  }): Promise<DebtRecord> {
    const { data } = await api.post<{ data: DebtRecord }>('/debts', payload)
    return data.data
  },

  async addPayment(debtId: string, amount: number, notes?: string): Promise<DebtRecord> {
    const { data } = await api.post<{ data: DebtRecord }>('/debts/payment', { debtId, amount, notes })
    return data.data
  },
}
