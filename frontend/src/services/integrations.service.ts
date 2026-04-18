import api from '@config/api'

export interface IntegrationDef {
  type:        string
  name:        string
  description: string
  category:    string
  color:       string
  isActive:    boolean
  lastSyncAt:  string | null
  config:      Record<string, any>
  configFields: Array<{
    key:         string
    label:       string
    type:        string
    required:    boolean
    placeholder?: string
  }>
}

export interface NotificationLog {
  id:        string
  type:      string
  recipient: string
  message:   string
  status:    string
  errorMsg:  string | null
  sentAt:    string | null
  createdAt: string
}

export const integrationsService = {
  getAll: () =>
    api.get<IntegrationDef[]>('/integrations').then(r => r.data),

  save: (type: string, config: Record<string, any>, isActive: boolean) =>
    api.post(`/integrations/${type}`, { config, isActive }).then(r => r.data),

  toggle: (type: string) =>
    api.patch(`/integrations/${type}/toggle`).then(r => r.data),

  sendSms: (phone: string, message: string) =>
    api.post('/integrations/sms/send', { phone, message }).then(r => r.data),

  sendBulkSms: (phones: string[], message: string) =>
    api.post('/integrations/sms/send-bulk', { phones, message }).then(r => r.data),

  testTelegram: (chatId: string, message: string) =>
    api.post('/integrations/telegram/test', { chatId, message }).then(r => r.data),

  getTelegramBotInfo: (botToken: string) =>
    api.post('/integrations/telegram/bot-info', { botToken }).then(r => r.data),

  getLogs: (params?: { type?: string; status?: string; limit?: number; offset?: number }) =>
    api.get<{ logs: NotificationLog[]; total: number }>('/integrations/logs', { params }).then(r => r.data),

  getStats: () =>
    api.get('/integrations/stats').then(r => r.data),
}
