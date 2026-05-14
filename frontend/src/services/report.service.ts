import api from '@config/api'

export interface ReportFilters {
  dateFrom: string
  dateTo:   string
}

export const reportService = {
  async getFinancial(filters: ReportFilters) {
    const { data } = await api.get('/reports/financial', { params: filters })
    return data.data
  },

  async getWarehouse(filters: ReportFilters) {
    const { data } = await api.get('/reports/warehouse', { params: filters })
    return data.data
  },

  async getSales(filters: ReportFilters) {
    const { data } = await api.get('/reports/sales', { params: filters })
    return data.data
  },

  async getEmployees(filters: ReportFilters) {
    const { data } = await api.get('/reports/employees', { params: filters })
    return data.data
  },

  async getWaste(filters: ReportFilters) {
    const { data } = await api.get('/reports/waste', { params: filters })
    return data.data
  },

  async getConstruction(filters: ReportFilters) {
    const { data } = await api.get('/reports/construction', { params: filters })
    return data.data
  },

  async getProduction(filters: ReportFilters) {
    const { data } = await api.get('/reports/production', { params: filters })
    return data.data
  },

  async getPnL(filters: ReportFilters) {
    const { data } = await api.get('/reports/pnl', { params: filters })
    return data.data ?? data
  },

  async getBalanceSheet() {
    const { data } = await api.get('/reports/balance-sheet')
    return data.data ?? data
  },

  async getCashFlow(filters: ReportFilters) {
    const { data } = await api.get('/reports/cash-flow', { params: filters })
    return data.data ?? data
  },

  async getChartsData(): Promise<{
    sales:  { month: string; sotuv: number; maqsad: number }[]
    stock:  { month: string; kirim: number; chiqim: number }[]
    debts:  { month: string; debtor: number; creditor: number }[]
  }> {
    const { data } = await api.get('/reports/charts')
    return data.data
  },
}
