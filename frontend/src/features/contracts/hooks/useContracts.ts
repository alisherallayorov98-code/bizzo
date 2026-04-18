import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { contractsService } from '@services/contracts.service'

export const CONTRACTS_KEY = 'contracts'

export function useContracts(params: Record<string, any> = {}) {
  return useQuery({
    queryKey:  [CONTRACTS_KEY, 'list', params],
    queryFn:   () => contractsService.list(params),
    staleTime: 30_000,
  })
}

export function useContract(id: string) {
  return useQuery({
    queryKey:  [CONTRACTS_KEY, 'detail', id],
    queryFn:   () => contractsService.get(id),
    enabled:   !!id,
    staleTime: 15_000,
  })
}

export function useContractTemplates() {
  return useQuery({
    queryKey:  [CONTRACTS_KEY, 'templates'],
    queryFn:   contractsService.templates,
    staleTime: 60_000,
  })
}

export function useExpiringContracts(days = 30) {
  return useQuery({
    queryKey:  [CONTRACTS_KEY, 'expiring', days],
    queryFn:   () => contractsService.expiring(days),
    staleTime: 60_000,
  })
}

export function useCreateContract() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: contractsService.create,
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: [CONTRACTS_KEY, 'list'] })
      toast.success(`Shartnoma yaratildi: ${data.contractNumber}`)
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Xatolik'),
  })
}

export function useUpdateContract() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string } & any) =>
      contractsService.update(id, payload),
    onSuccess: (_d, { id }) => {
      qc.invalidateQueries({ queryKey: [CONTRACTS_KEY, 'detail', id] })
      qc.invalidateQueries({ queryKey: [CONTRACTS_KEY, 'list'] })
      toast.success('Shartnoma yangilandi')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Xatolik'),
  })
}

export function useSignContract() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => contractsService.sign(id),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: [CONTRACTS_KEY, 'detail', id] })
      qc.invalidateQueries({ queryKey: [CONTRACTS_KEY, 'list'] })
      toast.success('Shartnoma imzolandi')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Xatolik'),
  })
}

export function useCancelContract() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => contractsService.cancel(id),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: [CONTRACTS_KEY, 'detail', id] })
      qc.invalidateQueries({ queryKey: [CONTRACTS_KEY, 'list'] })
      toast.success('Shartnoma bekor qilindi')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Xatolik'),
  })
}

export function useGeneratePdf() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => contractsService.generatePdf(id),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: [CONTRACTS_KEY, 'detail', id] })
      toast.success('PDF yaratildi')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Xatolik'),
  })
}

export function useCreateTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: contractsService.createTemplate,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [CONTRACTS_KEY, 'templates'] })
      toast.success('Shablon yaratildi')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Xatolik'),
  })
}

export function useUpdateTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string } & any) =>
      contractsService.updateTemplate(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [CONTRACTS_KEY, 'templates'] })
      toast.success('Shablon yangilandi')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Xatolik'),
  })
}

export function useDeleteTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => contractsService.deleteTemplate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [CONTRACTS_KEY, 'templates'] })
      toast.success("Shablon o'chirildi")
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Xatolik'),
  })
}
