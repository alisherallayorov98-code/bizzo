import { api } from '@config/api'

export type ImportEntity = 'contact' | 'product' | 'debt' | 'stock' | 'employee' | 'deal'
export type DupStrategy  = 'skip' | 'update' | 'merge'

export interface MigrationSession {
  id:              string
  companyId:       string
  name:            string
  source:          string
  status:          string
  totalRows:       number
  importedRows:    number
  skippedRows:     number
  errorRows:       number
  duplicatesFound: number
  progress:        Record<string, any>
  startedAt:       string
  completedAt?:    string
}

export interface ImportTemplate {
  entity:   ImportEntity
  headers:  string[]
  example:  Record<string, string>[]
  required: string[]
  hints:    Record<string, string>
}

export interface PreviewRow {
  index:     number
  raw:       Record<string, any>
  mapped:    Record<string, any>
  issues:    string[]
  duplicate?: { internalId: string; confidence: number; matchedBy: string }
}

export interface ImportResult {
  sessionId:  string
  entity:     ImportEntity
  created:    number
  updated:    number
  skipped:    number
  errors:     number
  duplicates: number
  rows:       Array<{ index: number; action: string; message?: string; id?: string }>
}

export const importService = {
  // Templates
  getTemplates:        ()                  => api.get<ImportTemplate[]>('/import/templates').then(r => r.data),
  getTemplate:         (entity: ImportEntity) => api.get<ImportTemplate>(`/import/templates/${entity}`).then(r => r.data),

  // Sessions
  getSessions:         ()                  => api.get<MigrationSession[]>('/import/sessions').then(r => r.data),
  getSession:          (id: string)        => api.get<MigrationSession>(`/import/sessions/${id}`).then(r => r.data),
  createSession:       (name: string, source = 'EXCEL') =>
    api.post<MigrationSession>('/import/sessions', { name, source }).then(r => r.data),
  getProgress:         ()                  => api.get('/import/progress').then(r => r.data),

  // Column detection
  detectColumns:       (headers: string[]) =>
    api.post<{ mapping: Record<string, string> }>('/import/detect-columns', { headers }).then(r => r.data),

  // Preview
  preview:             (entity: ImportEntity, rows: any[], mapping: Record<string, string>) =>
    api.post<{ total: number; preview: PreviewRow[] }>('/import/preview', { entity, rows, mapping }).then(r => r.data),

  // Import
  importContacts:      (sessionId: string, rows: any[], dupStrategy?: DupStrategy) =>
    api.post<ImportResult>('/import/contacts',  { sessionId, rows, dupStrategy }).then(r => r.data),
  importProducts:      (sessionId: string, rows: any[], dupStrategy?: DupStrategy) =>
    api.post<ImportResult>('/import/products',  { sessionId, rows, dupStrategy }).then(r => r.data),
  importDebts:         (sessionId: string, rows: any[]) =>
    api.post<ImportResult>('/import/debts',     { sessionId, rows }).then(r => r.data),
  importStock:         (sessionId: string, rows: any[]) =>
    api.post<ImportResult>('/import/stock',     { sessionId, rows }).then(r => r.data),
  importEmployees:     (sessionId: string, rows: any[]) =>
    api.post<ImportResult>('/import/employees', { sessionId, rows }).then(r => r.data),
  importDeals:         (sessionId: string, rows: any[]) =>
    api.post<ImportResult>('/import/deals',     { sessionId, rows }).then(r => r.data),

  // Reconciliation
  getReconciliation:   (sessionId: string) =>
    api.get(`/import/reconciliation/${sessionId}`).then(r => r.data),

  // Rollback
  rollback:            (sessionId: string) =>
    api.delete(`/import/sessions/${sessionId}/rollback`).then(r => r.data),
}
