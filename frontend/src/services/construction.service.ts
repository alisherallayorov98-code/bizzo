import api from '@config/api'

export type ProjectStatus = 'PLANNING' | 'IN_PROGRESS' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED'

export interface ConstructionProject {
  id:             string
  projectNumber:  string
  name:           string
  address?:       string
  clientId?:      string
  client?:        { id: string; name: string; phone?: string }
  managerId?:     string
  manager?:       { id: string; firstName: string; lastName: string }
  contractAmount: number
  status:         ProjectStatus
  startDate?:     string
  endDate?:       string
  actualEndDate?: string
  description?:   string
  createdAt:      string
  budgetTotal?:   number
  expenseTotal?:  number
  profit?:        number
  budgetUsed?:    number
  isOverBudget?:  boolean
  progress?:      number
  daysLeft?:      number | null
  isLate?:        boolean
}

export interface BudgetItem {
  id:          string
  projectId:   string
  category:    string
  name:        string
  unit:        string
  quantity:    number
  unitPrice:   number
  totalAmount: number
  notes?:      string
}

export interface ProjectExpense {
  id:          string
  projectId:   string
  category:    string
  description: string
  amount:      number
  quantity:    number
  expenseDate: string
  isPaid:      boolean
  paidAt?:     string | null
}

export type TaskStatus   = 'TODO' | 'IN_PROGRESS' | 'DONE'
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

export interface ProjectTask {
  id:           string
  projectId:    string
  title:        string
  description?: string
  status:       TaskStatus
  priority:     TaskPriority
  assignedToId?: string
  dueDate?:     string | null
  completedAt?: string | null
  createdAt:    string
}

export interface ConstructionStats {
  total:               number
  active:              number
  completed:           number
  overdue:             number
  totalContractAmount: number
  totalExpenses:       number
  estimatedProfit:     number
}

export const constructionService = {
  async createProject(payload: Partial<ConstructionProject>) {
    const { data } = await api.post('/construction/projects', payload)
    return data
  },
  async getProjects(query: Record<string, any> = {}) {
    const params = new URLSearchParams(
      Object.fromEntries(Object.entries(query).filter(([, v]) => v !== undefined && v !== '')),
    )
    const { data } = await api.get(`/construction/projects?${params}`)
    return data
  },
  async getProject(id: string) {
    const { data } = await api.get(`/construction/projects/${id}`)
    return data
  },
  async getStats(): Promise<ConstructionStats> {
    const { data } = await api.get('/construction/stats')
    return data
  },
  async addBudgetItem(payload: Partial<BudgetItem> & { projectId: string }) {
    const { data } = await api.post('/construction/budget-items', payload)
    return data
  },
  async addExpense(payload: Partial<ProjectExpense> & { projectId: string }) {
    const { data } = await api.post('/construction/expenses', payload)
    return data
  },
  async addWorkLog(payload: {
    projectId: string; workDate: string
    progress: number; description?: string; workersCount?: number; issues?: string
  }) {
    const { data } = await api.post('/construction/work-logs', payload)
    return data
  },
  async updateProject(id: string, payload: Partial<ConstructionProject> & { status?: string }) {
    const { data } = await api.put(`/construction/projects/${id}`, payload)
    return data
  },
  async updateStatus(id: string, status: string) {
    const { data } = await api.put(`/construction/projects/${id}/status`, { status })
    return data
  },
  async deleteProject(id: string) {
    await api.delete(`/construction/projects/${id}`)
  },
  async deleteBudgetItem(id: string) {
    await api.delete(`/construction/budget-items/${id}`)
  },
  async addTask(payload: {
    projectId: string; title: string; description?: string
    priority?: TaskPriority; assignedToId?: string; dueDate?: string
  }) {
    const { data } = await api.post('/construction/tasks', payload)
    return data
  },
  async updateTask(id: string, payload: Partial<ProjectTask>) {
    const { data } = await api.put(`/construction/tasks/${id}`, payload)
    return data
  },
  async deleteTask(id: string) {
    await api.delete(`/construction/tasks/${id}`)
  },
  async updateExpense(id: string, payload: { isPaid: boolean }) {
    const { data } = await api.patch(`/construction/expenses/${id}`, payload)
    return data
  },
}
