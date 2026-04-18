import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { debtService } from '@services/debt.service'

export const DEBTS_KEY = 'debts'

export function useDebts(query: Record<string, any> = {}) {
  return useQuery({
    queryKey:  [DEBTS_KEY, 'list', query],
    queryFn:   () => debtService.getAll(query),
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

export function useAddDebtPayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ debtId, amount, notes }: {
      debtId: string; amount: number; notes?: string
    }) => debtService.addPayment(debtId, amount, notes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [DEBTS_KEY] })
      qc.invalidateQueries({ queryKey: ['contacts'] })
      toast.success("To'lov qayd etildi")
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Xatolik'),
  })
}
