import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { serviceTicketsService } from '@services/service-tickets.service'
import type { ServiceStatus, ServicePriority } from '@services/service-tickets.service'

const KEY = 'service-tickets'

export function useServiceTickets(query: Record<string, any> = {}) {
  return useQuery({
    queryKey:  [KEY, 'list', query],
    queryFn:   () => serviceTicketsService.getAll(query),
    staleTime: 30_000,
  })
}

export function useServiceTicketStats() {
  return useQuery({
    queryKey:  [KEY, 'stats'],
    queryFn:   serviceTicketsService.getStats,
    staleTime: 60_000,
  })
}

export function useCreateServiceTicket() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: {
      title:        string
      description?: string
      contactId?:   string
      priority?:    ServicePriority
      dueDate?:     string
      notes?:       string
    }) => serviceTicketsService.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] })
      toast.success("Tiket yaratildi")
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Xatolik'),
  })
}

export function useUpdateServiceTicket() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string; status?: ServiceStatus; priority?: ServicePriority; [k: string]: any }) =>
      serviceTicketsService.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] })
      toast.success("Yangilandi")
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Xatolik'),
  })
}

export function useDeleteServiceTicket() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => serviceTicketsService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY] })
      toast.success("Tiket o'chirildi")
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Xatolik'),
  })
}
