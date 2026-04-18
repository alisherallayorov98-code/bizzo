export type MovementType =
  | 'IN'
  | 'OUT'
  | 'TRANSFER'
  | 'ADJUSTMENT'
  | 'PRODUCTION_IN'
  | 'PRODUCTION_OUT'
  | 'WASTE_IN'
  | 'WASTE_OUT'

export interface Warehouse {
  id: string
  companyId: string
  name: string
  address?: string
  isDefault: boolean
  isActive: boolean
  createdAt: string

  // Computed
  totalItems?: number
  totalValue?: number
}

export interface StockItem {
  id: string
  warehouseId: string
  productId: string
  quantity: number
  updatedAt: string

  warehouse?: Warehouse
  product?: {
    id: string
    name: string
    unit: string
    code?: string
    minStock: number
    sellPrice: number
    buyPrice: number
  }
}

export interface StockMovement {
  id: string
  warehouseId: string
  productId: string
  type: MovementType
  quantity: number
  price: number
  reason?: string
  referenceId?: string
  referenceType?: string
  createdAt: string
  createdById?: string

  warehouse?: Warehouse
  product?: {
    id: string
    name: string
    unit: string
  }
}

export interface StockMovementFormData {
  warehouseId: string
  productId: string
  type: MovementType
  quantity: number
  price?: number
  reason?: string
}
