import api from '@config/api'

export interface ReportFilters {
  dateFrom: string
  dateTo:   string
}

export const reportService = {
  async getFinancial(filters: ReportFilters) {
    const { data } = await api.get('/reports/financial', { params: filters })
    return data
  },

  async getWarehouse(filters: ReportFilters) {
    const { data } = await api.get('/reports/warehouse', { params: filters })
    return data
  },

  async getSales(filters: ReportFilters) {
    const { data } = await api.get('/reports/sales', { params: filters })
    return data
  },

  async getEmployees(filters: ReportFilters) {
    const { data } = await api.get('/reports/employees', { params: filters })
    return data
  },

  async getWaste(filters: ReportFilters) {
    const { data } = await api.get('/reports/waste', { params: filters })
    return data
  },

  async getChartsData(): Promise<{
    sales:  { month: string; sotuv: number; maqsad: number }[]
    stock:  { month: string; kirim: number; chiqim: number }[]
    debts:  { month: string; debtor: number; creditor: number }[]
  }> {
    const { data } = await api.get('/reports/charts')
    return data
  },
}
