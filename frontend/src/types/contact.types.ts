export type ContactType = 'CUSTOMER' | 'SUPPLIER' | 'BOTH' | 'PARTNER'

export interface Contact {
  id: string
  companyId: string
  type: ContactType
  name: string
  legalName?: string
  stir?: string
  phone?: string
  phone2?: string
  email?: string
  address?: string
  region?: string
  notes?: string
  creditLimit: number
  paymentDays: number
  isActive: boolean
  createdAt: string
  updatedAt: string
  createdById?: string

  // Computed
  totalDebt?: number
  overdueDebt?: number
}

export interface ContactFormData {
  type: ContactType
  name: string
  legalName?: string
  stir?: string
  phone?: string
  phone2?: string
  email?: string
  address?: string
  region?: string
  notes?: string
  creditLimit?: number
  paymentDays?: number
}
