import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  warehouseService,
  type MovementQuery,
  type CreateMovementPayload,
  type CreateIncomingPayload,
  type CreateOutgoingPayload,
} from '@services/warehouse.service'

export const WAREHOUSE_KEY = 'warehouse'

// ============================================
// OMBORLAR
// ============================================
export function useWarehouses() {
  return useQuery({
    queryKey:  [WAREHOUSE_KEY, 'list'],
    queryFn:   warehouseService.getWarehouses,
    staleTime: 60_000,
  })
}

export function useCreateWarehouse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: warehouseService.createWarehouse,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [WAREHOUSE_KEY] })
      toast.success('Ombor yaratildi')
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message ?? 'Xatolik yuz berdi')
    },
  })
}

// ============================================
// QOLDIQLAR
// ============================================
export function useStockOverview(warehouseId?: string) {
  return useQuery({
    queryKey:  [WAREHOUSE_KEY, 'overview', warehouseId],
    queryFn:   () => warehouseService.getOverview(warehouseId),
    staleTime: 30_000,
  })
}

// ============================================
// HARAKATLAR
// ============================================
export function useMovements(query: MovementQuery = {}) {
  return useQuery({
    queryKey:  [WAREHOUSE_KEY, 'movements', query],
    queryFn:   () => warehouseService.getMovements(query),
    staleTime: 20_000,
  })
}

export function useCreateMovement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateMovementPayload) =>
      warehouseService.createMovement(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [WAREHOUSE_KEY] })
      qc.invalidateQueries({ queryKey: ['products'] })
      toast.success('Harakat qayd etildi')
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message ?? 'Xatolik yuz berdi')
    },
  })
}

// ============================================
// KIRIM HUJJATI
// ============================================
export function useCreateIncoming() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateIncomingPayload) =>
      warehouseService.createIncoming(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [WAREHOUSE_KEY] })
      qc.invalidateQueries({ queryKey: ['debts'] })
      toast.success('Kirim hujjati saqlandi')
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message ?? 'Xatolik yuz berdi')
    },
  })
}

// ============================================
// CHIQIM HUJJATI
// ============================================
export function useCreateOutgoing() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateOutgoingPayload) =>
      warehouseService.createOutgoing(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [WAREHOUSE_KEY] })
      qc.invalidateQueries({ queryKey: ['debts'] })
      toast.success('Chiqim hujjati saqlandi')
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message ?? 'Xatolik yuz berdi')
    },
  })
}

// ============================================
// INVENTARIZATSIYA
// ============================================
export function useAdjustStock() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: warehouseService.adjustStock,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [WAREHOUSE_KEY] })
      qc.invalidateQueries({ queryKey: ['products'] })
      toast.success('Qoldiq sozlandi')
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message ?? 'Xatolik yuz berdi')
    },
  })
}
