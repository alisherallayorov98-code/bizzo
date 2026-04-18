import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { productionService } from '@services/production.service'

export const PRODUCTION_KEY = 'production'

export function useFormulas() {
  return useQuery({
    queryKey: [PRODUCTION_KEY, 'formulas'],
    queryFn: productionService.getFormulas,
    staleTime: 5 * 60_000,
  })
}

export function useBatches(query: Record<string, any> = {}) {
  return useQuery({
    queryKey: [PRODUCTION_KEY, 'batches', query],
    queryFn: () => productionService.getBatches(query),
    staleTime: 30_000,
  })
}

export function useProductionStats() {
  return useQuery({
    queryKey: [PRODUCTION_KEY, 'stats'],
    queryFn: productionService.getStats,
    staleTime: 60_000,
  })
}

export function useProductionAnalytics(formulaId?: string) {
  return useQuery({
    queryKey: [PRODUCTION_KEY, 'analytics', formulaId],
    queryFn: () => productionService.getAnalytics(formulaId),
    staleTime: 60_000,
  })
}

export function useBatch(id: string) {
  return useQuery({
    queryKey: [PRODUCTION_KEY, 'batch', id],
    queryFn:  () => productionService.getBatch(id),
    enabled:  !!id,
    staleTime: 15_000,
  })
}

export function useCostEstimate(formulaId: string, multiplier: number) {
  return useQuery({
    queryKey: [PRODUCTION_KEY, 'cost-estimate', formulaId, multiplier],
    queryFn:  () => productionService.getCostEstimate(formulaId, multiplier),
    enabled:  !!formulaId && multiplier > 0,
    staleTime: 30_000,
  })
}

export function useUpdateFormula() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string } & any) =>
      productionService.updateFormula(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [PRODUCTION_KEY, 'formulas'] })
      toast.success('Retsept yangilandi')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Xatolik'),
  })
}

export function useDeleteFormula() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => productionService.deleteFormula(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [PRODUCTION_KEY, 'formulas'] })
      toast.success("Retsept o'chirildi")
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Xatolik'),
  })
}

export function useUpdateBatch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string } & any) =>
      productionService.updateBatch(id, payload),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: [PRODUCTION_KEY, 'batch', id] })
      qc.invalidateQueries({ queryKey: [PRODUCTION_KEY, 'batches'] })
      toast.success('Partiya yangilandi')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Xatolik'),
  })
}

export function useAddOverhead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string; amount: number; description: string }) =>
      productionService.addOverhead(id, payload),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: [PRODUCTION_KEY, 'batch', id] })
      toast.success("Xarajat qo'shildi")
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Xatolik'),
  })
}

export function useCreateFormula() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: productionService.createFormula,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [PRODUCTION_KEY, 'formulas'] })
      toast.success('Retsept yaratildi')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Xatolik'),
  })
}

export function useCreateBatch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: productionService.createBatch,
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: [PRODUCTION_KEY, 'batches'] })
      toast.success(`Partiya yaratildi: ${data.batchNumber}`)
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Xatolik'),
  })
}

export function useStartBatch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: productionService.startBatch,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [PRODUCTION_KEY, 'batches'] })
      toast.success('Ishlab chiqarish boshlandi')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Xatolik'),
  })
}

export function useCompleteBatch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: productionService.completeBatch,
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: [PRODUCTION_KEY] })
      qc.invalidateQueries({ queryKey: ['warehouse'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      if (data.analytics?.isAnomaly) {
        toast.error(data.analytics.message)
      } else {
        toast.success(`Partiya yakunlandi. Tannarx: ${data.analytics?.unitCost} so'm/birlik`)
      }
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Xatolik'),
  })
}
