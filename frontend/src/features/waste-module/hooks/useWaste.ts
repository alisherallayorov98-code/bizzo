import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { wasteService } from '@services/waste.service'

export const WASTE_KEY = 'waste'

// ============================================
// DASHBOARD
// ============================================
export function useWasteDashboard() {
  return useQuery({
    queryKey:       [WASTE_KEY, 'dashboard'],
    queryFn:        wasteService.getDashboard,
    refetchInterval: 60_000,
    staleTime:      30_000,
  })
}

// ============================================
// SIFAT TURLARI
// ============================================
export function useQualityTypes() {
  return useQuery({
    queryKey:  [WASTE_KEY, 'quality-types'],
    queryFn:   wasteService.getQualityTypes,
    staleTime: 5 * 60_000,
  })
}

export function useCreateQualityType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: wasteService.createQualityType,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [WASTE_KEY, 'quality-types'] })
      toast.success("Sifat turi qo'shildi")
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Xatolik'),
  })
}

// ============================================
// PARTIYALAR
// ============================================
export function useWasteBatches(query: Record<string, any> = {}) {
  return useQuery({
    queryKey:  [WASTE_KEY, 'batches', query],
    queryFn:   () => wasteService.getBatches(query),
    staleTime: 15_000,
  })
}

export function useCreateBatch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: wasteService.createBatch,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: [WASTE_KEY] })
      toast.success(`Partiya qabul qilindi: ${data.batchNumber}`)
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Xatolik'),
  })
}

// ============================================
// QAYTA ISHLASH
// ============================================
export function useCreateProcessing() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: wasteService.createProcessing,
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: [WASTE_KEY] })
      if (data?.lossAnalytic?.isAnomaly) {
        toast.error(
          `Anomaliya aniqlandi! Yo'qotish: ${data.lossAnalytic.lossPercent?.toFixed(1)}%`,
          { duration: 6000 },
        )
      } else {
        toast.success('Qayta ishlash qayd etildi')
      }
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Xatolik'),
  })
}

// ============================================
// XODIM TAYINLASH
// ============================================
export function useAssignWorker() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ batchId, ...payload }: { batchId: string; employeeId: string; workDate: string; hoursWorked?: number; notes?: string }) =>
      wasteService.assignWorker(batchId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [WASTE_KEY] })
      toast.success('Xodim tayinlandi')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Xatolik'),
  })
}

// ============================================
// TAHLIL
// ============================================
export function useWasteAnalytics(filters?: { dateFrom?: string; dateTo?: string; sourceType?: string }) {
  return useQuery({
    queryKey:  [WASTE_KEY, 'analytics', filters],
    queryFn:   () => wasteService.getAnalytics(filters),
    staleTime: 60_000,
  })
}
