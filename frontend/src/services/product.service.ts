import api from '@config/api'

// ============================================
// TYPES
// ============================================
export interface Product {
  id:           string
  companyId:    string
  code?:        string
  barcode?:     string
  name:         string
  description?: string
  category?:    string
  unit:         string
  buyPrice:     number
  sellPrice:    number
  minPrice:     number
  minStock:     number
  isService:    boolean
  isActive:     boolean
  createdAt:    string
  updatedAt:    string
  // Computed
  totalStock?:  number
  avgPrice?:    number
  isLow?:       boolean
}

export interface ProductStats {
  total:      number
  services:   number
  goods:      number
  categories: number
  lowStock:   number
  totalValue: number
  totalQty:   number
}

export interface LowStockItem {
  id:         string
  name:       string
  unit:       string
  minStock:   number
  totalStock: number
  sellPrice:  number
}

export interface ProductQuery {
  search?:    string
  category?:  string
  isService?: boolean
  isLow?:     boolean
  page?:      number
  limit?:     number
  sortBy?:    string
  sortOrder?: 'asc' | 'desc'
}

export interface PaginatedProducts {
  data: Product[]
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
export const productService = {
  async getAll(query: ProductQuery = {}): Promise<PaginatedProducts> {
    const params = new URLSearchParams()
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== '') params.append(k, String(v))
    })
    const { data } = await api.get<{ data: PaginatedProducts }>(`/products?${params}`)
    return data.data
  },

  async getOne(id: string): Promise<Product> {
    const { data } = await api.get<{ data: Product }>(`/products/${id}`)
    return data.data
  },

  async getStats(): Promise<ProductStats> {
    const { data } = await api.get<{ data: ProductStats }>('/products/stats')
    return data.data
  },

  async getCategories(): Promise<string[]> {
    const { data } = await api.get<{ data: string[] }>('/products/categories')
    return data.data
  },

  async getLowStock(): Promise<LowStockItem[]> {
    const { data } = await api.get<{ data: LowStockItem[] }>('/products/low-stock')
    return data.data
  },

  async create(payload: Partial<Product>): Promise<Product> {
    const { data } = await api.post<{ data: Product }>('/products', payload)
    return data.data
  },

  async update(id: string, payload: Partial<Product>): Promise<Product> {
    const { data } = await api.put<{ data: Product }>(`/products/${id}`, payload)
    return data.data
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/products/${id}`)
  },

  async bulkDelete(ids: string[]): Promise<{ deleted: number }> {
    const { data } = await api.delete('/products', { data: { ids } })
    return data.data
  },
}
