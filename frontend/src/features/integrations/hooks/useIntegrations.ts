import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { integrationsService } from '@services/integrations.service'
import toast from 'react-hot-toast'

export function useIntegrations() {
  return useQuery({
    queryKey: ['integrations'],
    queryFn:  integrationsService.getAll,
  })
}

export function useSaveIntegration() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ type, config, isActive }: { type: string; config: Record<string, any>; isActive: boolean }) =>
      integrationsService.save(type, config, isActive),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['integrations'] })
      toast.success('Integratsiya saqlandi')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Xatolik'),
  })
}

export function useToggleIntegration() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (type: string) => integrationsService.toggle(type),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['integrations'] })
      toast.success('Holat yangilandi')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Xatolik'),
  })
}

export function useSendSms() {
  return useMutation({
    mutationFn: ({ phone, message }: { phone: string; message: string }) =>
      integrationsService.sendSms(phone, message),
    onSuccess: (data: any) => {
      if (data.success) toast.success('SMS yuborildi')
      else toast.error(data.error || 'SMS yuborishda xatolik')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Xatolik'),
  })
}

export function useNotificationLogs(filters?: { type?: string; status?: string }) {
  return useQuery({
    queryKey: ['integration-logs', filters],
    queryFn:  () => integrationsService.getLogs({ ...filters, limit: 50 }),
  })
}

export function useIntegrationStats() {
  return useQuery({
    queryKey: ['integration-stats'],
    queryFn:  integrationsService.getStats,
  })
}
