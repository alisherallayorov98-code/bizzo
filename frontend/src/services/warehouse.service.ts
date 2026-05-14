import api from '@config/api'

// ============================================
// TYPES
// ============================================
export type MovementType = 'IN' | 'OUT' | 'TRANSFER' | 'ADJUSTMENT' | 'PRODUCTION_IN' | 'PRODUCTION_OUT' | 'WASTE_IN' | 'WASTE_OUT'

export interface Warehouse {
  id:              string
  name:            string
  address?:        string
  isDefault:       boolean
  createdAt:       string
  itemCount:       number
  totalValue:      number
  movementsCount:  number
}

export interface StockMovement {
  id:            string
  warehouseId:   string
  productId:     string
  type:          MovementType
  quantity:      number
  price:         number
  totalAmount:   number
  reason?:       string
  referenceId?:  string
  notes?:        string
  createdAt:     string
  createdById?:  string
  product: {
    id:   string
    name: string
    unit: string
    code?: string
  }
  warehouse: {
    id:   string
    name: string
  }
}

export interface StockItem {
  id:            string
  productId:     string
  productName:   string
  productCode?:  string
  unit:          string
  warehouseId:   string
  warehouseName: string
  quantity:      number
  avgPrice:      number
  sellPrice:     number
  totalValue:    number
  minStock:      number
  isLow:         boolean
}

export interface MovementQuery {
  warehouseId?:  string
  productId?:    string
  type?:         string
  dateFrom?:     string
  dateTo?:       string
  page?:         number
  limit?:        number
}

export interface PaginatedMovements {
  data: StockMovement[]
  meta: {
    total:      number
    page:       number
    limit:      number
    totalPages: number
  }
}

export interface CreateMovementPayload {
  warehouseId:    string
  productId:      string
  type:           'IN' | 'OUT' | 'TRANSFER' | 'ADJUSTMENT'
  quantity:       number
  price?:         number
  reason?:        string
  notes?:         string
  toWarehouseId?: string
}

export interface DocumentLine {
  productId: string
  quantity:  number
  price:     number
}

export interface CreateIncomingPayload {
  warehouseId: string
  contactId?:  string
  lines:       DocumentLine[]
  notes?:      string
  createDebt?: boolean
  dueDate?:    string
}

export interface CreateOutgoingPayload {
  warehouseId: string
  contactId?:  string
  lines:       DocumentLine[]
  notes?:      string
  createDebt?: boolean
  dueDate?:    string
}

export interface DocumentResult {
  movements:   StockMovement[]
  debt:        null | { id: string; amount: number; type: string }
  debtNote:    null | { id: string; amount: number; type: string }
  totalAmount: number
}

export interface CreateReturnPayload {
  type:        'RETURN_IN' | 'RETURN_OUT'
  warehouseId: string
  contactId?:  string
  lines:       DocumentLine[]
  notes?:      string
  refundDebt?: boolean
}

// ============================================
// SERVICE
// ============================================
export const warehouseService = {
  async getWarehouses(): Promise<Warehouse[]> {
    const { data } = await api.get<{ data: Warehouse[] }>('/warehouse/list')
    return data.data
  },

  async createWarehouse(payload: { name: string; address?: string; isDefault?: boolean }): Promise<Warehouse> {
    const { data } = await api.post<{ data: Warehouse }>('/warehouse/list', payload)
    return data.data
  },

  async getOverview(warehouseId?: string): Promise<StockItem[]> {
    const params = warehouseId ? `?warehouseId=${warehouseId}` : ''
    const { data } = await api.get<{ data: StockItem[] }>(`/warehouse/overview${params}`)
    return data.data
  },

  async getMovements(query: MovementQuery = {}): Promise<PaginatedMovements> {
    const params = new URLSearchParams()
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== '') params.append(k, String(v))
    })
    const { data } = await api.get<{ data: PaginatedMovements }>(`/warehouse/movements?${params}`)
    return data.data
  },

  async createMovement(payload: CreateMovementPayload): Promise<StockMovement> {
    const { data } = await api.post<{ data: StockMovement }>('/warehouse/movements', payload)
    return data.data
  },

  async adjustStock(payload: {
    warehouseId: string
    productId:   string
    quantity:    number
    reason?:     string
  }): Promise<StockMovement> {
    const { data } = await api.post<{ data: StockMovement }>('/warehouse/adjust', payload)
    return data.data
  },

  async createIncoming(payload: CreateIncomingPayload): Promise<DocumentResult> {
    const { data } = await api.post<{ data: DocumentResult }>('/warehouse/incoming', payload)
    return data.data
  },

  async createOutgoing(payload: CreateOutgoingPayload): Promise<DocumentResult> {
    const { data } = await api.post<{ data: DocumentResult }>('/warehouse/outgoing', payload)
    return data.data
  },

  async createReturn(payload: CreateReturnPayload): Promise<DocumentResult> {
    const { data } = await api.post<{ data: DocumentResult }>('/warehouse/return', payload)
    return data.data
  },
}
