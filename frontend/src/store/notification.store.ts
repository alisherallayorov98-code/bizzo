import { create } from 'zustand'

export interface Notification {
  id: string
  type: 'info' | 'success' | 'warning' | 'danger'
  title: string
  message: string
  isRead: boolean
  createdAt: string
  link?: string
}

interface NotificationState {
  notifications: Notification[]
  unreadCount: number

  // Actions
  addNotification: (notification: Omit<Notification, 'id' | 'isRead' | 'createdAt'>) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  removeNotification: (id: string) => void
  clearAll: () => void
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,

  addNotification: (notification) => {
    const newNotification: Notification = {
      ...notification,
      id: crypto.randomUUID(),
      isRead: false,
      createdAt: new Date().toISOString(),
    }
    set((s) => ({
      notifications: [newNotification, ...s.notifications].slice(0, 50),
      unreadCount: s.unreadCount + 1,
    }))
  },

  markAsRead: (id) => {
    set((s) => ({
      notifications: s.notifications.map((n) =>
        n.id === id ? { ...n, isRead: true } : n
      ),
      unreadCount: Math.max(0, s.unreadCount - 1),
    }))
  },

  markAllAsRead: () => {
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, isRead: true })),
      unreadCount: 0,
    }))
  },

  removeNotification: (id) => {
    const { notifications } = get()
    const notification = notifications.find((n) => n.id === id)
    set((s) => ({
      notifications: s.notifications.filter((n) => n.id !== id),
      unreadCount: notification && !notification.isRead
        ? Math.max(0, s.unreadCount - 1)
        : s.unreadCount,
    }))
  },

  clearAll: () => set({ notifications: [], unreadCount: 0 }),
}))
