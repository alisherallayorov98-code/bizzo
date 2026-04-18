export type EmployeeType = 'PERMANENT' | 'DAILY' | 'CONTRACT'

export interface Employee {
  id: string
  companyId: string
  firstName: string
  lastName: string
  phone?: string
  position?: string
  department?: string
  employeeType: EmployeeType
  baseSalary: number
  dailyRate: number
  hireDate?: string
  fireDate?: string
  isActive: boolean
  notes?: string
  createdAt: string

  // Computed
  fullName?: string
  currentMonthSalary?: number
}

export interface SalaryRecord {
  id: string
  employeeId: string
  month: number
  year: number
  baseSalary: number
  bonus: number
  deduction: number
  advance: number
  totalAmount: number
  isPaid: boolean
  paidAt?: string
  notes?: string
  createdAt: string
}

export interface DailyWorkRecord {
  id: string
  employeeId: string
  workDate: string
  hoursWorked: number
  dailyRate: number
  amount: number
  isPaid: boolean
  notes?: string
  createdAt: string
}

export interface EmployeeFormData {
  firstName: string
  lastName: string
  phone?: string
  position?: string
  department?: string
  employeeType: EmployeeType
  baseSalary?: number
  dailyRate?: number
  hireDate?: string
  notes?: string
}
