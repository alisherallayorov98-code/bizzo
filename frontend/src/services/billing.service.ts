import api from '@config/api'

export type BillingCycle = 'MONTHLY' | 'YEARLY'
export type PaymentProvider = 'PAYME' | 'CLICK'
export type SubscriptionStatus = 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'EXPIRED'
export type PaymentStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'

export interface BillingPlan {
  id: string
  name: string
  displayName: string
  priceMonthly: number
  priceYearly: number
  maxUsers: number
  maxContacts: number
  maxProducts: number
  maxStorage: number
  modules: string[]
  features: Record<string, any>
  isPopular: boolean
  sortOrder: number
}

export interface Subscription {
  id: string
  companyId: string
  planId: string
  plan?: BillingPlan
  status: SubscriptionStatus
  billingCycle: BillingCycle
  currentPeriodStart: string
  currentPeriodEnd: string
  trialEndsAt?: string | null
  nextBillingDate?: string | null
  lastPaymentAt?: string | null
  lastPaymentAmount?: number | null
  canceledAt?: string | null
}

export interface BillingInvoice {
  id: string
  invoiceNumber: string
  subtotal: number
  discount: number
  tax: number
  total: number
  status: 'DRAFT' | 'PENDING' | 'PAID' | 'VOID'
  issueDate: string
  dueDate: string
  paidAt?: string | null
}

export interface BillingPayment {
  id: string
  amount: number
  provider: PaymentProvider
  status: PaymentStatus
  completedAt?: string | null
  createdAt: string
  invoice?: BillingInvoice
}

export interface InitiatePaymentDto {
  planId: string
  billingCycle: BillingCycle
  provider: PaymentProvider
  promoCode?: string
  returnUrl?: string
  billingName?: string
  billingStir?: string
  billingAddress?: string
}

export const billingService = {
  getPlans: () => api.get<{ data: BillingPlan[] }>('/billing/plans').then(r => r.data.data),
  getSubscription: () => api.get<{ data: Subscription | null }>('/billing/subscription').then(r => r.data.data),
  subscribe: (planId: string, billingCycle: BillingCycle = 'MONTHLY') =>
    api.post<{ data: Subscription }>('/billing/subscribe', { planId, billingCycle }).then(r => r.data.data),
  cancel: () => api.post<{ data: unknown }>('/billing/cancel').then(r => r.data.data),
  initiatePayment: (dto: InitiatePaymentDto) =>
    api.post<{ data: { invoice: BillingInvoice; payment: BillingPayment; checkoutUrl: string } }>('/billing/pay', dto).then(r => r.data.data),
  getPayments: () => api.get<{ data: BillingPayment[] }>('/billing/payments').then(r => r.data.data),
  validatePromo: (code: string, planId: string, amount: number) =>
    api.post<{ data: { code: string; discount: number; discountType: 'PERCENT' | 'FIXED'; discountValue: number } }>(
      '/billing/validate-promo', { code, planId, amount },
    ).then(r => r.data.data),
  invoicePdfUrl: (id: string) => `/billing/invoice/${id}/pdf`,
}
