import api from '@config/api'

export interface DebtPayment {
  id:          string
  debtId:      string
  amount:      number
  paymentDate: string
  method:      'CASH' | 'CARD' | 'TRANSFER' | 'AVANS' | 'OTHER'
  avansId:     string | null
  notes:       string | null
  createdAt:   string
}

export interface DebtRecord {
  id:            string
  companyId:     string
  contactId:     string
  type:          'RECEIVABLE' | 'PAYABLE'
  description:   string | null
  amount:        number
  paidAmount:    number
  remaining:     number
  remainAmount:  number
  currency:      string
  dueDate:       string | null
  isPaid:        boolean
  isOverdue:     boolean
  referenceId:   string | null
  referenceType: string | null
  notes:         string | null
  createdAt:     string
  paymentCount:  number
  contact?: {
    id:    string
    name:  string
    phone: string | null
    type:  string
  }
  payments?: DebtPayment[]
}

export interface AvansRecord {
  id:          string
  companyId:   string
  contactId:   string
  type:        'GIVEN' | 'RECEIVED'
  description: string
  amount:      number
  usedAmount:  number
  remaining:   number
  currency:    string
  isFullyUsed: boolean
  notes:       string | null
  createdAt:   string
  contact?: {
    id:    string
    name:  string
    phone: string | null
    type:  string
  }
}

export interface DebtStats {
  receivable:    { total: number; count: number; overdue: number; overdueCount: number }
  payable:       { total: number; count: number; overdue: number; overdueCount: number }
  avansGiven:    { total: number; count: number }
  avansReceived: { total: number; count: number }
  netBalance:    number
  recentPayments: Array<{
    id: string; amount: number; method: string; paymentDate: string
    debt: { contact?: { name: string } } | null
  }>
}

// ─── Debt API ────────────────────────────────────────────────────────────────

export const debtService = {
  async getAll(params?: Record<string, any>) {
    const { data } = await api.get('/debts', { params })
    return data
  },

  async getOne(id: string) {
    const { data } = await api.get(`/debts/${id}`)
    return data
  },

  async getStats(): Promise<DebtStats> {
    const { data } = await api.get('/debts/stats')
    return data
  },

  async create(payload: {
    contactId: string; type: 'RECEIVABLE' | 'PAYABLE'; amount: number
    description?: string; dueDate?: string; notes?: string
  }) {
    const { data } = await api.post('/debts', payload)
    return data
  },

  async remove(id: string) {
    await api.delete(`/debts/${id}`)
  },

  async addPayment(payload: {
    debtId: string; amount: number
    method?: string; avansId?: string; paymentDate?: string; notes?: string
  }) {
    const { data } = await api.post('/debts/payment', payload)
    return data
  },

  async sendReminder(id: string) {
    const { data } = await api.post(`/debts/${id}/send-reminder`)
    return data
  },

  async getContactBalance(contactId: string) {
    const { data } = await api.get(`/debts/contact/${contactId}/balance`)
    return data
  },
}

// ─── Avans API ────────────────────────────────────────────────────────────────

export const avansService = {
  async getAll(params?: Record<string, any>) {
    const { data } = await api.get('/debts/avans/list', { params })
    return data
  },

  async getStats() {
    const { data } = await api.get('/debts/avans/stats')
    return data
  },

  async getByContact(contactId: string): Promise<AvansRecord[]> {
    const { data } = await api.get(`/debts/avans/contact/${contactId}`)
    return data
  },

  async create(payload: {
    contactId: string; type: 'GIVEN' | 'RECEIVED'; amount: number; description: string; notes?: string
  }) {
    const { data } = await api.post('/debts/avans', payload)
    return data
  },

  async remove(id: string) {
    await api.delete(`/debts/avans/${id}`)
  },

  async applyToDebt(avansId: string, debtId: string, amount: number) {
    const { data } = await api.post(`/debts/avans/${avansId}/apply/${debtId}`, { amount })
    return data
  },
}
