export type DebtType = 'RECEIVABLE' | 'PAYABLE'

export interface DebtRecord {
  id: string
  companyId: string
  contactId: string
  type: DebtType
  amount: number
  paidAmount: number
  remainAmount: number
  dueDate?: string
  isOverdue: boolean
  referenceId?: string
  referenceType?: string
  notes?: string
  createdAt: string
  updatedAt: string

  contact?: {
    id: string
    name: string
    phone?: string
    type: string
  }
}

export interface DebtSummary {
  totalReceivable: number
  totalPayable: number
  overdueReceivable: number
  overduePayable: number
  topDebtors: Array<{
    contactId: string
    contactName: string
    amount: number
  }>
  topCreditors: Array<{
    contactId: string
    contactName: string
    amount: number
  }>
}
