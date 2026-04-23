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
  getTemplates:        (): Promise<ImportTemplate[]>    => api.get('/import/templates').then(r => r.data.data),
  getTemplate:         (entity: ImportEntity): Promise<ImportTemplate> => api.get(`/import/templates/${entity}`).then(r => r.data.data),

  // Sessions
  getSessions:         (): Promise<MigrationSession[]>  => api.get('/import/sessions').then(r => r.data.data),
  getSession:          (id: string): Promise<MigrationSession> => api.get(`/import/sessions/${id}`).then(r => r.data.data),
  createSession:       (name: string, source = 'EXCEL'): Promise<MigrationSession> =>
    api.post('/import/sessions', { name, source }).then(r => r.data.data),
  getProgress:         (): Promise<any>                 => api.get('/import/progress').then(r => r.data.data),

  // Column detection
  detectColumns:       (headers: string[]): Promise<{ mapping: Record<string, string> }> =>
    api.post('/import/detect-columns', { headers }).then(r => r.data.data),

  // Preview
  preview:             (entity: ImportEntity, rows: any[], mapping: Record<string, string>): Promise<{ total: number; preview: PreviewRow[] }> =>
    api.post('/import/preview', { entity, rows, mapping }).then(r => r.data.data),

  // Import
  importContacts:      (sessionId: string, rows: any[], dupStrategy?: DupStrategy): Promise<ImportResult> =>
    api.post('/import/contacts',  { sessionId, rows, dupStrategy }).then(r => r.data.data),
  importProducts:      (sessionId: string, rows: any[], dupStrategy?: DupStrategy): Promise<ImportResult> =>
    api.post('/import/products',  { sessionId, rows, dupStrategy }).then(r => r.data.data),
  importDebts:         (sessionId: string, rows: any[]): Promise<ImportResult> =>
    api.post('/import/debts',     { sessionId, rows }).then(r => r.data.data),
  importStock:         (sessionId: string, rows: any[]): Promise<ImportResult> =>
    api.post('/import/stock',     { sessionId, rows }).then(r => r.data.data),
  importEmployees:     (sessionId: string, rows: any[]): Promise<ImportResult> =>
    api.post('/import/employees', { sessionId, rows }).then(r => r.data.data),
  importDeals:         (sessionId: string, rows: any[]): Promise<ImportResult> =>
    api.post('/import/deals',     { sessionId, rows }).then(r => r.data.data),

  // Reconciliation
  getReconciliation:   (sessionId: string): Promise<any> =>
    api.get(`/import/reconciliation/${sessionId}`).then(r => r.data.data),

  // Rollback
  rollback:            (sessionId: string): Promise<any> =>
    api.delete(`/import/sessions/${sessionId}/rollback`).then(r => r.data.data),
}
