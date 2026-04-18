import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notificationsService } from '@services/notifications.service'
import { useNotificationsSocket } from './useNotificationsSocket'

const KEY = ['notifications']

export function useNotifications(limit = 20) {
  // WebSocket keeps data fresh in real-time; no polling needed
  useNotificationsSocket()

  return useQuery({
    queryKey:  [...KEY, limit],
    queryFn:   () => notificationsService.getAll(limit),
    staleTime: 30 * 1000,
  })
}

export function useMarkRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => notificationsService.markRead(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useMarkAllRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => notificationsService.markAllRead(),
    onSuccess:  () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useRefreshNotifications() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => notificationsService.refresh(),
    onSuccess:  () => qc.invalidateQueries({ queryKey: KEY }),
  })
}
