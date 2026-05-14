export type AutomationTrigger =
  | 'INVOICE_OVERDUE'
  | 'STOCK_LOW'
  | 'DEAL_WON'
  | 'DEAL_STAGE_CHANGED'
  | 'CONTRACT_EXPIRING'
  | 'PAYMENT_RECEIVED'
  | 'DEBT_OVERDUE'
  | 'CONTACT_CREATED'
  | 'SALARY_DUE'
  | 'STOCK_MOVEMENT'
  | 'MANUAL'

export type ActionType =
  | 'SEND_SMS'
  | 'SEND_TELEGRAM'
  | 'SEND_EMAIL'
  | 'CREATE_NOTIFICATION'
  | 'CREATE_TASK'
  | 'WEBHOOK'

export type ConditionOperator = 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'neq' | 'contains' | 'in'

export interface AutomationCondition {
  field:    string
  operator: ConditionOperator
  value:    string | number
}

export interface AutomationAction {
  type:   ActionType
  config: Record<string, string>
}

export interface AutomationRule {
  id:          string
  name:        string
  description: string | null
  isActive:    boolean
  trigger:     AutomationTrigger
  conditions:  AutomationCondition[]
  actions:     AutomationAction[]
  runCount:    number
  lastRunAt:   string | null
  cooldownMin: number
  createdAt:   string
  updatedAt:   string
  logCount?:   number
  lastLog?:    AutomationLog | null
}

export interface AutomationLog {
  id:         string
  ruleId:     string
  companyId:  string
  status:     'SUCCESS' | 'PARTIAL' | 'FAILED'
  trigger:    string
  entityId:   string | null
  entityType: string | null
  actionsRun: Array<{ type: string; status: string; error?: string }>
  errorMsg:   string | null
  executedAt: string
  rule?:      { name: string }
}

export interface AutomationStats {
  total:      number
  active:     number
  totalRuns:  number
  recentLogs: AutomationLog[]
}

export interface TriggerMeta {
  value: AutomationTrigger
  label: string
  icon:  string
}

export interface ActionMeta {
  value: ActionType
  label: string
  icon:  string
}
