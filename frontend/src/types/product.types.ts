export interface Product {
  id: string
  companyId: string
  code?: string
  barcode?: string
  name: string
  description?: string
  category?: string
  unit: string
  buyPrice: number
  sellPrice: number
  minPrice: number
  minStock: number
  image?: string
  isService: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string

  // Computed
  totalStock?: number
  stockValue?: number
}

export interface ProductFormData {
  code?: string
  barcode?: string
  name: string
  description?: string
  category?: string
  unit: string
  buyPrice: number
  sellPrice: number
  minPrice?: number
  minStock?: number
  isService?: boolean
}

export const PRODUCT_UNITS = [
  { value: 'dona',  label: 'Dona' },
  { value: 'kg',    label: 'Kilogramm' },
  { value: 'g',     label: 'Gramm' },
  { value: 'litr',  label: 'Litr' },
  { value: 'ml',    label: 'Millilitr' },
  { value: 'm',     label: 'Metr' },
  { value: 'm2',    label: 'Kvadrat metr' },
  { value: 'm3',    label: 'Kub metr' },
  { value: 'xalta', label: 'Xalta' },
  { value: 'quti',  label: 'Quti' },
  { value: 'juft',  label: 'Juft' },
  { value: 'to\'plam', label: 'To\'plam' },
] as const
