import api from '@config/api'

// ============================================
// TYPES
// ============================================
export type EmployeeType = 'PERMANENT' | 'DAILY' | 'CONTRACT'

export interface Employee {
  id:           string
  companyId:    string
  firstName:    string
  lastName:     string
  phone?:       string
  position?:    string
  department?:  string
  employeeType: EmployeeType
  baseSalary:   number
  dailyRate:    number
  hireDate?:    string
  isActive:     boolean
  notes?:       string
  createdAt:    string
  updatedAt:    string
}

export interface SalaryRecord {
  id:          string
  employeeId:  string
  month:       number
  year:        number
  baseSalary:  number
  bonus:       number
  deduction:   number
  advance:     number
  totalAmount: number
  isPaid:      boolean
  paidAt?:     string
  notes?:      string
}

export interface DailyWorkRecord {
  id:          string
  employeeId:  string
  workDate:    string
  hoursWorked: number
  dailyRate:   number
  amount:      number
  isPaid:      boolean
  notes?:      string
}

export interface EmployeeStats {
  total:         number
  permanent:     number
  daily:         number
  contract:      number
  unpaidCount:   number
  unpaidTotal:   number
  weeklyUnpaid:  number
  unpaidRecords: { id: string; name: string; amount: number; month: number; year: number }[]
}

export interface WeeklyReport {
  employee:  { id: string; firstName: string; lastName: string; dailyRate: number }
  period:    { start: string; end: string }
  records:   DailyWorkRecord[]
  summary:   { totalDays: number; totalHours: number; totalAmount: number; unpaidAmount: number }
}

export interface SalaryHistoryItem {
  id:           string
  name:         string
  position?:    string
  department?:  string
  employeeType: EmployeeType
  baseSalary:   number
  record:       SalaryRecord | null
}

export interface PaginatedEmployees {
  data: Employee[]
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
export const employeeService = {
  async getAll(query: Record<string, any> = {}): Promise<PaginatedEmployees> {
    const params = new URLSearchParams()
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== '') params.append(k, String(v))
    })
    const { data } = await api.get<{ data: PaginatedEmployees }>(`/employees?${params}`)
    return data.data
  },

  async getOne(id: string): Promise<Employee & { salaryRecords: SalaryRecord[]; dailyWorkRecords: DailyWorkRecord[]; unpaidSalary: SalaryRecord | null; monthlyHours: number }> {
    const { data } = await api.get(`/employees/${id}`)
    return data.data
  },

  async getStats(): Promise<EmployeeStats> {
    const { data } = await api.get<{ data: EmployeeStats }>('/employees/stats')
    return data.data
  },

  async getDepartments(): Promise<string[]> {
    const { data } = await api.get<{ data: string[] }>('/employees/departments')
    return data.data
  },

  async create(payload: Partial<Employee>): Promise<Employee> {
    const { data } = await api.post<{ data: Employee }>('/employees', payload)
    return data.data
  },

  async update(id: string, payload: Partial<Employee>): Promise<Employee> {
    const { data } = await api.put<{ data: Employee }>(`/employees/${id}`, payload)
    return data.data
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/employees/${id}`)
  },

  // ============================================
  // ISH HAQI
  // ============================================
  async createSalaryRecord(payload: {
    employeeId: string
    month:      number
    year:       number
    bonus?:     number
    deduction?: number
    advance?:   number
    notes?:     string
  }): Promise<SalaryRecord> {
    const { data } = await api.post<{ data: SalaryRecord }>('/employees/salary', payload)
    return data.data
  },

  async getSalaryHistory(month: number, year: number): Promise<SalaryHistoryItem[]> {
    const { data } = await api.get<{ data: SalaryHistoryItem[] }>(
      `/employees/salary/history?month=${month}&year=${year}`,
    )
    return data.data
  },

  async markSalaryPaid(recordId: string): Promise<SalaryRecord> {
    const { data } = await api.put<{ data: SalaryRecord }>(`/employees/salary/${recordId}/pay`)
    return data.data
  },

  async giveAdvance(id: string, payload: {
    amount: number
    month:  number
    year:   number
    note?:  string
  }): Promise<SalaryRecord> {
    const { data } = await api.post<{ data: SalaryRecord }>(`/employees/${id}/advance`, payload)
    return data.data
  },

  // ============================================
  // KUNLIK XODIM
  // ============================================
  async addDailyWork(payload: {
    employeeId:   string
    workDate:     string
    hoursWorked?: number
    dailyRate?:   number
    notes?:       string
  }): Promise<DailyWorkRecord> {
    const { data } = await api.post<{ data: DailyWorkRecord }>('/employees/daily-work', payload)
    return data.data
  },

  async getWeeklyReport(id: string, weekStart: string): Promise<WeeklyReport> {
    const { data } = await api.get<{ data: WeeklyReport }>(
      `/employees/${id}/weekly-report?weekStart=${weekStart}`,
    )
    return data.data
  },

  async markWeeklyPaid(id: string, weekStart: string): Promise<{ message: string; count: number }> {
    const { data } = await api.put(`/employees/${id}/weekly-pay`, { weekStart })
    return data.data
  },
}
