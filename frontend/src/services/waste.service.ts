import api from '@config/api'

// ============================================
// TYPES
// ============================================
export interface WasteQualityType {
  id:               string
  name:             string
  expectedLossMin:  number
  expectedLossMax:  number
  buyPricePerKg:    number
  color:            string
  isActive:         boolean
  avgLossPercent?:  number | null
  totalProcessed?:  number
}

export interface WasteBatch {
  id:             string
  batchNumber:    string
  sourceType:     'CITIZEN' | 'SUPPLIER'
  qualityTypeId:  string
  qualityType?:   { name: string; color: string }
  inputWeight:    number
  pricePerKg:     number
  totalCost:      number
  isPaid:         boolean
  status:         'IN_STOCK' | 'PROCESSING' | 'COMPLETED' | string
  contactId?:     string
  citizenName?:   string
  citizenPhone?:  string
  invoiceNumber?: string
  notes?:         string
  receivedAt:     string
  createdAt:      string
  // Hisoblangan
  remaining?:          number
  totalProcessed?:     number
  totalLoss?:          number
  isFullyProcessed?:   boolean
}

export interface WasteDashboardStats {
  today: {
    batches:     number
    totalWeight: number
    totalCost:   number
  }
  thisMonth: {
    batches:         number
    totalWeight:     number
    totalCost:       number
    processed:       number
    processedWeight: number
    outputWeight:    number
    lossWeight:      number
    avgLossPercent:  number
    anomalies:       number
  }
  pendingBatches: number
}

export interface WasteLossAnalytics {
  summary: {
    totalProcessed: number
    overallAvgLoss: number
    anomalyCount:   number
    anomalyRate:    number
  }
  byQuality: Record<string, {
    count:     number
    totalLoss: number
    avgLoss:   number
    minLoss:   number
    maxLoss:   number
    anomalies: number
  }>
  supplierRating: {
    contactId: string
    count:     number
    avgLoss:   number
    anomalies: number
    rating:    number
  }[]
  dailyTrend: { date: string; avgLoss: number; count: number }[]
  recentAnomalies: {
    processedAt:   string
    qualityType:   string
    lossPercent:   number
    anomalyReason: string | null
  }[]
}

export interface PaginatedBatches {
  data: WasteBatch[]
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
export const wasteService = {
  async getDashboard(): Promise<WasteDashboardStats> {
    const { data } = await api.get<{ data: WasteDashboardStats }>('/waste/dashboard')
    return data.data
  },

  async getQualityTypes(): Promise<WasteQualityType[]> {
    const { data } = await api.get<{ data: WasteQualityType[] }>('/waste/quality-types')
    return data.data
  },

  async createQualityType(payload: Partial<WasteQualityType>): Promise<WasteQualityType> {
    const { data } = await api.post<{ data: WasteQualityType }>('/waste/quality-types', payload)
    return data.data
  },

  async getBatches(query: Record<string, any> = {}): Promise<PaginatedBatches> {
    const params = new URLSearchParams()
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== '') params.append(k, String(v))
    })
    const { data } = await api.get<{ data: PaginatedBatches }>(`/waste/batches?${params}`)
    return data.data
  },

  async createBatch(payload: any): Promise<WasteBatch> {
    const { data } = await api.post<{ data: WasteBatch }>('/waste/batches', payload)
    return data.data
  },

  async createProcessing(payload: {
    batchId:          string
    processedWeight:  number
    outputWeight:     number
    outputProductId?: string
    outputNotes?:     string
  }) {
    const { data } = await api.post('/waste/processing', payload)
    return data.data
  },

  async getAnalytics(filters?: {
    dateFrom?:   string
    dateTo?:     string
    sourceType?: string
  }): Promise<WasteLossAnalytics> {
    const params = new URLSearchParams()
    Object.entries(filters ?? {}).forEach(([k, v]) => {
      if (v !== undefined && v !== '') params.append(k, String(v))
    })
    const { data } = await api.get<{ data: WasteLossAnalytics }>(`/waste/analytics?${params}`)
    return data.data
  },

  async assignWorker(batchId: string, payload: {
    employeeId:   string
    workDate:     string
    hoursWorked?: number
    notes?:       string
  }) {
    const { data } = await api.post(`/waste/batches/${batchId}/workers`, payload)
    return data.data
  },
}
