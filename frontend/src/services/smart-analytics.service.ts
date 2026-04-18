import { api } from '@config/api'

export interface HealthScore {
  total: number
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  components: {
    revenue:   { score: number; max: number; label: string; trend: 'up' | 'down' | 'stable' }
    debt:      { score: number; max: number; label: string; trend: 'up' | 'down' | 'stable' }
    stock:     { score: number; max: number; label: string; trend: 'up' | 'down' | 'stable' }
    employees: { score: number; max: number; label: string; trend: 'up' | 'down' | 'stable' }
    cashflow:  { score: number; max: number; label: string; trend: 'up' | 'down' | 'stable' }
  }
  insight: string
}

export interface ABCProduct {
  id: string; name: string; unit: string
  revenue: number; revenueShare: number; cumulativeShare: number
  category: 'A' | 'B' | 'C'
  totalStock: number; sellPrice: number
}

export interface RFMContact {
  id: string; name: string; type: string
  recencyDays: number; frequency: number; monetary: number
  rScore: number; fScore: number; mScore: number; rfmScore: number
  segment: string; segmentUz: string
}

export interface SalesForecast {
  month: string; predicted: number; confidence: number
  trend: 'up' | 'down' | 'stable'; growthRate: number
  history: { month: string; actual: number }[]
}

export interface StockDepletion {
  productId: string; name: string; unit: string
  currentStock: number; avgDailyConsumption: number
  daysUntilEmpty: number | null; depletionDate: string | null
  urgency: 'critical' | 'warning' | 'ok'
}

export interface Anomaly {
  type: string; severity: 'high' | 'medium' | 'low'
  title: string; description: string
  value: number; expectedValue: number; deviationPct: number
}

export interface SmartAlert {
  type: string; severity: 'high' | 'medium' | 'low'
  title: string; description: string; link: string; count?: number
}

export interface MorningDigest {
  date: string
  healthScore: number; healthGrade: string; healthInsight: string
  forecast: { nextMonth: string; predicted: number; trend: string; growthRate: number }
  criticalItems: string[]
  anomalyCount: number; criticalCount: number; depletionCount: number
  topAnomalies: Anomaly[]
}

const smartApi = {
  getHealthScore:  async (): Promise<HealthScore>      => (await api.get('/smart/health')).data.data,
  getABC:          async (): Promise<ABCProduct[]>     => (await api.get('/smart/abc')).data.data,
  getRFM:          async (): Promise<RFMContact[]>     => (await api.get('/smart/rfm')).data.data,
  getForecast:     async (): Promise<SalesForecast>    => (await api.get('/smart/forecast')).data.data,
  getDepletion:    async (): Promise<StockDepletion[]> => (await api.get('/smart/depletion')).data.data,
  getAnomalies:    async (): Promise<Anomaly[]>        => (await api.get('/smart/anomalies')).data.data,
  getDigest:       async (): Promise<MorningDigest>    => (await api.get('/smart/digest')).data.data,
  getAlerts:       async (): Promise<SmartAlert[]>     => (await api.get('/smart/alerts')).data.data,
}

export default smartApi
