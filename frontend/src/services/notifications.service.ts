import { api } from '@config/api'

export interface AppNotification {
  id:        string
  companyId: string
  userId:    string | null
  title:     string
  message:   string
  type:      'info' | 'success' | 'warning' | 'danger'
  category:  'stock' | 'debt' | 'salary' | 'contract' | 'system'
  link:      string | null
  isRead:    boolean
  createdAt: string
}

export interface NotificationsResponse {
  items:       AppNotification[]
  unreadCount: number
}

export const notificationsService = {
  getAll:       (limit = 20)  => api.get(`/notifications?limit=${limit}`).then(r => r.data.data as NotificationsResponse),
  markRead:     (id: string)  => api.patch(`/notifications/${id}/read`).then(r => r.data.data),
  markAllRead:  ()            => api.patch('/notifications/read-all').then(r => r.data.data),
  refresh:      ()            => api.post('/notifications/refresh').then(r => r.data.data as { count: number }),
}
