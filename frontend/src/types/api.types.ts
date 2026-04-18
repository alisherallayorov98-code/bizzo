// Standart API javob formati
export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
  timestamp: string
}

export interface ApiError {
  success: false
  error: string
  message: string
  statusCode: number
  timestamp: string
}

// Paginate javob
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

// Paginate so'rov parametrlari
export interface PaginationParams {
  page?: number
  limit?: number
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

// Filtr
export interface DateRangeFilter {
  from?: string
  to?: string
}

// Select option
export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
  icon?: string
  color?: string
}
