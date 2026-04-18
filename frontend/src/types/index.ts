// Barcha tiplarni eksport
export * from './auth.types'
export * from './contact.types'
export * from './product.types'
export * from './warehouse.types'
export * from './employee.types'
export * from './debt.types'
export * from './api.types'

// Umumiy tiplar
export type ID = string

export type Status = 'active' | 'inactive' | 'pending' | 'cancelled' | 'completed'

export interface BaseEntity {
  id: string
  createdAt: string
  updatedAt: string
}

export interface Address {
  street?: string
  city?: string
  region?: string
  country?: string
  postalCode?: string
}

// Valyuta
export type Currency = 'UZS' | 'USD' | 'EUR' | 'RUB'

// Ruxsatlar
export interface Permission {
  module: string
  actions: ('read' | 'write' | 'delete' | 'export')[]
}
