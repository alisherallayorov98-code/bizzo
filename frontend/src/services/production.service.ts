import api from '@config/api'

export type ProductionType = 'CONVERSION' | 'DISASSEMBLY' | 'ASSEMBLY' | 'PROCESSING'
export type BatchStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'

export interface FormulaInput {
  id: string
  productId: string
  product?: { id: string; name: string; unit: string }
  quantity: number
  unit: string
  isOptional: boolean
}

export interface FormulaOutput {
  id: string
  productId: string
  product?: { id: string; name: string; unit: string }
  quantity: number
  unit: string
  isMainProduct: boolean
  isWaste: boolean
  lossPercent: number
}

export interface ProductionFormula {
  id: string
  name: string
  type: ProductionType
  description?: string
  inputs: FormulaInput[]
  outputs: FormulaOutput[]
  _count?: { batches: number }
}

export interface BatchInput {
  id: string
  productId: string
  product?: { id: string; name: string }
  plannedQty: number
  actualQty: number
  unit: string
  totalCost: number
}

export interface BatchOutput {
  id: string
  productId: string
  product?: { id: string; name: string }
  plannedQty: number
  actualQty: number
  unit: string
  isWaste: boolean
  isMainProduct: boolean
}

export interface BatchAnalytic {
  batchId:        string
  unitCost:       number
  wastePercent:   number
  totalInputCost: number
  overheadCost:   number
  totalCost:      number
  totalOutputQty: number
  totalWasteQty:  number
  isAnomaly:      boolean
  processedAt:    string
}

export interface CostEstimateLine {
  productId:   string
  productName: string
  unit:        string
  qty:         number
  unitPrice:   number
  total:       number
}

export interface CostEstimate {
  formulaId:          string
  formulaName:        string
  multiplier:         number
  lines:              CostEstimateLine[]
  totalMaterialCost:  number
  outputQty:          number
  outputUnit:         string
  outputProductName:  string
  estimatedUnitCost:  number
}

export interface ProductionBatch {
  id: string
  batchNumber: string
  formulaId: string
  formula?: { id: string; name: string; type: ProductionType }
  status: BatchStatus
  inputMultiplier: number
  plannedStart?: string
  actualStart?: string
  plannedEnd?: string
  actualEnd?: string
  warehouseId?: string
  operatorId?: string
  overheadCost?: number
  plannedCost?: number
  notes?: string
  inputs?: BatchInput[]
  outputs?: BatchOutput[]
  analytic?: BatchAnalytic | null
  createdAt: string
}

export interface ProductionStats {
  totalBatches: number
  activeBatches: number
  monthlyBatches: number
  monthlyOutput: number
  monthlyInputCost: number
  avgWastePercent: string
  avgUnitCost: string
  anomaliesThisMonth: number
}

export const productionService = {
  async createFormula(payload: any) {
    const { data } = await api.post('/production/formulas', payload)
    return data.data
  },
  async getFormulas(): Promise<ProductionFormula[]> {
    const { data } = await api.get('/production/formulas')
    return data.data
  },
  async updateFormula(id: string, payload: any): Promise<ProductionFormula> {
    const { data } = await api.put(`/production/formulas/${id}`, payload)
    return data.data
  },
  async deleteFormula(id: string) {
    const { data } = await api.delete(`/production/formulas/${id}`)
    return data.data
  },
  async getCostEstimate(formulaId: string, multiplier: number): Promise<CostEstimate> {
    const { data } = await api.get(`/production/formulas/${formulaId}/cost-estimate?multiplier=${multiplier}`)
    return data.data
  },
  async createBatch(payload: {
    formulaId: string; inputMultiplier: number
    warehouseId?: string; operatorId?: string
    plannedStart?: string; plannedEnd?: string; notes?: string
  }) {
    const { data } = await api.post('/production/batches', payload)
    return data.data
  },
  async getBatches(query: Record<string, any> = {}) {
    const params = new URLSearchParams(
      Object.fromEntries(Object.entries(query).filter(([, v]) => v !== undefined && v !== '')),
    )
    const { data } = await api.get(`/production/batches?${params}`)
    return data.data
  },
  async getBatch(id: string): Promise<ProductionBatch> {
    const { data } = await api.get(`/production/batches/${id}`)
    return data.data
  },
  async updateBatch(id: string, payload: {
    inputMultiplier?: number; operatorId?: string; warehouseId?: string
    plannedStart?: string; plannedEnd?: string; notes?: string
  }) {
    const { data } = await api.put(`/production/batches/${id}`, payload)
    return data.data
  },
  async addOverhead(id: string, payload: { amount: number; description: string }) {
    const { data } = await api.post(`/production/batches/${id}/overhead`, payload)
    return data.data
  },
  async startBatch(id: string) {
    const { data } = await api.post(`/production/batches/${id}/start`)
    return data.data
  },
  async completeBatch(payload: {
    batchId: string
    outputs: { productId: string; actualQty: number }[]
    inputs:  { productId: string; actualQty: number }[]
    outputWarehouseId: string
    notes?: string
  }) {
    const { data } = await api.post('/production/batches/complete', payload)
    return data.data
  },
  async getStats(): Promise<ProductionStats> {
    const { data } = await api.get('/production/stats')
    return data.data
  },
  async getAnalytics(formulaId?: string) {
    const params = formulaId ? `?formulaId=${formulaId}` : ''
    const { data } = await api.get(`/production/analytics${params}`)
    return data.data
  },
}
