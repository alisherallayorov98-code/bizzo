import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { salesService } from '@services/sales.service'

export const SALES_KEY = 'sales'

// ============================================
// STATISTIKA
// ============================================
export function useSalesStats() {
  return useQuery({
    queryKey:  [SALES_KEY, 'stats'],
    queryFn:   salesService.getStats,
    staleTime: 60_000,
  })
}

// ============================================
// PIPELINE
// ============================================
export function usePipeline(filters?: { search?: string; assignedToId?: string }) {
  return useQuery({
    queryKey:  [SALES_KEY, 'pipeline', filters],
    queryFn:   () => salesService.getPipeline(filters),
    staleTime: 15_000,
  })
}

// ============================================
// DEALLAR
// ============================================
export function useDeals(query: Record<string, any> = {}) {
  return useQuery({
    queryKey:  [SALES_KEY, 'deals', query],
    queryFn:   () => salesService.getDeals(query),
    staleTime: 30_000,
  })
}

export function useCreateDeal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: salesService.createDeal,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: [SALES_KEY] })
      toast.success(`Deal yaratildi: ${data.dealNumber}`)
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Xatolik'),
  })
}

export function useGetDeal(id: string) {
  return useQuery({
    queryKey:  [SALES_KEY, 'deal', id],
    queryFn:   () => salesService.getDeal(id),
    enabled:   !!id,
    staleTime: 15_000,
  })
}

export function useUpdateDeal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string } & any) =>
      salesService.updateDeal(id, payload),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: [SALES_KEY] })
      toast.success('Deal yangilandi')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Xatolik'),
  })
}

export function useUpdateStage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, stage, lostReason }: {
      id: string; stage: string; lostReason?: string
    }) => salesService.updateStage(id, stage, lostReason),
    onSuccess: (_, { stage }) => {
      qc.invalidateQueries({ queryKey: [SALES_KEY] })
      if (stage === 'WON')       toast.success("Deal yutildi!")
      else if (stage === 'LOST') toast.error("Deal yo'qotildi")
      else                        toast.success('Bosqich yangilandi')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Xatolik'),
  })
}

// ============================================
// AKTIVLIKLAR
// ============================================
export function useActivities(dealId: string) {
  return useQuery({
    queryKey:  [SALES_KEY, 'activities', dealId],
    queryFn:   () => salesService.getActivities(dealId),
    enabled:   !!dealId,
    staleTime: 15_000,
  })
}

export function useAddActivity(dealId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: Parameters<typeof salesService.addActivity>[1]) =>
      salesService.addActivity(dealId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [SALES_KEY, 'activities', dealId] })
      qc.invalidateQueries({ queryKey: [SALES_KEY, 'deal', dealId] })
      toast.success("Aktivlik qo'shildi")
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Xatolik'),
  })
}

// ============================================
// INVOICELAR
// ============================================
export function useInvoices(query: Record<string, any> = {}) {
  return useQuery({
    queryKey:  [SALES_KEY, 'invoices', query],
    queryFn:   () => salesService.getInvoices(query),
    staleTime: 30_000,
  })
}

export function useCreateInvoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: salesService.createInvoice,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: [SALES_KEY] })
      toast.success(`Invoice yaratildi: ${data.invoiceNumber}`)
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Xatolik'),
  })
}

export function useGetInvoice(id: string) {
  return useQuery({
    queryKey:  [SALES_KEY, 'invoice', id],
    queryFn:   () => salesService.getInvoice(id),
    enabled:   !!id,
    staleTime: 15_000,
  })
}

export function useUpdateInvoiceStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      salesService.updateInvoiceStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [SALES_KEY] })
      toast.success('Invoice statusi yangilandi')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Xatolik'),
  })
}

export function useBulkDeleteDeals() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ids: string[]) => salesService.bulkDeleteDeals(ids),
    onSuccess: ({ deleted }) => {
      qc.invalidateQueries({ queryKey: [SALES_KEY] })
      toast.success(`${deleted} ta deal o'chirildi`)
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Xatolik'),
  })
}

export function useBulkDeleteInvoices() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ids: string[]) => salesService.bulkDeleteInvoices(ids),
    onSuccess: ({ deleted }) => {
      qc.invalidateQueries({ queryKey: [SALES_KEY] })
      toast.success(`${deleted} ta invoice o'chirildi`)
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Xatolik'),
  })
}

export function useAddPayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ invoiceId, ...payload }: {
      invoiceId: string; amount: number; method: string; notes?: string
    }) => salesService.addPayment(invoiceId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [SALES_KEY] })
      toast.success("To'lov qo'shildi")
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Xatolik'),
  })
}
