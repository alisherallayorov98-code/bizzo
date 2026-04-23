import api from '@config/api'

// ============================================
// TYPES
// ============================================
export type ContactType = 'CUSTOMER' | 'SUPPLIER' | 'BOTH' | 'PARTNER'

export interface Contact {
  id:               string
  type:             ContactType
  name:             string
  legalName?:       string
  stir?:            string
  phone?:           string
  phone2?:          string
  email?:           string
  address?:         string
  region?:          string
  notes?:           string
  creditLimit:      number
  paymentDays:      number
  isActive:         boolean
  createdAt:        string
  updatedAt:        string
  // Computed on list
  totalReceivable?: number
  totalPayable?:    number
  hasOverdue?:      boolean
}

export interface ContactStats {
  total:           number
  customers:       number
  suppliers:       number
  withDebt:        number
  overdue:         number
  totalReceivable: number
  totalPayable:    number
}

export interface ContactQuery {
  search?:    string
  type?:      ContactType | string
  hasDebt?:   boolean
  isOverdue?: boolean
  region?:    string
  page?:      number
  limit?:     number
  sortBy?:    string
  sortOrder?: 'asc' | 'desc'
}

export interface PaginatedContacts {
  data: Contact[]
  meta: {
    total:      number
    page:       number
    limit:      number
    totalPages: number
  }
}

// ============================================
// SERVICE
// ============================================
export const contactService = {
  async getAll(query: ContactQuery = {}): Promise<PaginatedContacts> {
    const params = new URLSearchParams()
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== '') params.append(k, String(v))
    })
    const { data } = await api.get<{ data: PaginatedContacts }>(`/contacts?${params}`)
    return data.data
  },

  async getOne(id: string): Promise<Contact> {
    const { data } = await api.get<{ data: Contact }>(`/contacts/${id}`)
    return data.data
  },

  async getStats(): Promise<ContactStats> {
    const { data } = await api.get<{ data: ContactStats }>('/contacts/stats')
    return data.data
  },

  async create(payload: Partial<Contact>): Promise<Contact> {
    const { data } = await api.post<{ data: Contact }>('/contacts', payload)
    return data.data
  },

  async update(id: string, payload: Partial<Contact>): Promise<Contact> {
    const { data } = await api.put<{ data: Contact }>(`/contacts/${id}`, payload)
    return data.data
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/contacts/${id}`)
  },

  async bulkDelete(ids: string[]): Promise<{ deleted: number }> {
    const { data } = await api.delete('/contacts', { data: { ids } })
    return data.data
  },

  async addNote(id: string, note: string): Promise<void> {
    await api.post(`/contacts/${id}/notes`, { note })
  },

  async exportData(query: ContactQuery = {}): Promise<Contact[]> {
    const params = new URLSearchParams()
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== '') params.append(k, String(v))
    })
    const { data } = await api.get<{ data: Contact[] }>(`/contacts/export?${params}`)
    return data.data
  },
}
