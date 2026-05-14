import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { debtService, avansService } from '@services/debt.service'

export const DEBTS_KEY = 'debts'
export const AVANS_KEY = 'avans'

// ─── Qarzlar ─────────────────────────────────────────────────────────────────

export function useDebts(query: Record<string, any> = {}, enabled = true) {
  return useQuery({
    queryKey:  [DEBTS_KEY, 'list', query],
    queryFn:   () => debtService.getAll(query),
    enabled,
    staleTime: 30_000,
  })
}

export function useDebtStats() {
  return useQuery({
    queryKey:  [DEBTS_KEY, 'stats'],
    queryFn:   debtService.getStats,
    staleTime: 60_000,
  })
}

export function useDebtOne(id: string | null) {
  return useQuery({
    queryKey:  [DEBTS_KEY, 'one', id],
    queryFn:   () => debtService.getOne(id!),
    enabled:   Boolean(id),
    staleTime: 10_000,
  })
}

export function useCreateDebt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: debtService.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [DEBTS_KEY] })
      qc.invalidateQueries({ queryKey: ['contacts'] })
      toast.success('Qarz qo\'shildi')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Xatolik'),
  })
}

export function useRemoveDebt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: debtService.remove,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [DEBTS_KEY] })
      toast.success('Qarz o\'chirildi')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Xatolik'),
  })
}

export function useAddDebtPayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: debtService.addPayment,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [DEBTS_KEY] })
      qc.invalidateQueries({ queryKey: [AVANS_KEY] })
      qc.invalidateQueries({ queryKey: ['contacts'] })
      toast.success('To\'lov qayd etildi')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Xatolik'),
  })
}

export function useSendDebtReminder() {
  return useMutation({
    mutationFn: (debtId: string) => debtService.sendReminder(debtId),
    onSuccess: (result) => {
      result.success
        ? toast.success('SMS eslatma yuborildi')
        : toast.error(result.error ?? 'SMS yuborib bo\'lmadi')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Xatolik'),
  })
}

// ─── Avans ───────────────────────────────────────────────────────────────────

export function useAvans(query: Record<string, any> = {}, enabled = true) {
  return useQuery({
    queryKey:  [AVANS_KEY, 'list', query],
    queryFn:   () => avansService.getAll(query),
    enabled,
    staleTime: 30_000,
  })
}

export function useCreateAvans() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: avansService.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [AVANS_KEY] })
      qc.invalidateQueries({ queryKey: [DEBTS_KEY, 'stats'] })
      toast.success('Avans qo\'shildi')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Xatolik'),
  })
}

export function useRemoveAvans() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: avansService.remove,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [AVANS_KEY] })
      qc.invalidateQueries({ queryKey: [DEBTS_KEY, 'stats'] })
      toast.success('Avans o\'chirildi')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Xatolik'),
  })
}

export function useApplyAvans() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ avansId, debtId, amount }: { avansId: string; debtId: string; amount: number }) =>
      avansService.applyToDebt(avansId, debtId, amount),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [DEBTS_KEY] })
      qc.invalidateQueries({ queryKey: [AVANS_KEY] })
      toast.success('Avans qarzga qo\'llanildi')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Xatolik'),
  })
}
