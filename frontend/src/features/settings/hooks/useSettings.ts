import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { settingsService } from '@services/settings.service'

export const SETTINGS_KEY = 'settings'

export function useCompanySettings() {
  return useQuery({
    queryKey:  [SETTINGS_KEY, 'company'],
    queryFn:   settingsService.getCompany,
    staleTime: 5 * 60_000,
  })
}

export function useUpdateCompany() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: settingsService.updateCompany,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [SETTINGS_KEY] })
      qc.invalidateQueries({ queryKey: ['auth'] })
      toast.success('Kompaniya sozlamalari saqlandi')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Xatolik'),
  })
}

export function useUsers() {
  return useQuery({
    queryKey:  [SETTINGS_KEY, 'users'],
    queryFn:   settingsService.getUsers,
    staleTime: 30_000,
  })
}

export function useCreateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: settingsService.createUser,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [SETTINGS_KEY, 'users'] })
      toast.success("Foydalanuvchi qo'shildi")
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Xatolik'),
  })
}

export function useToggleUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: settingsService.toggleUserActive,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [SETTINGS_KEY, 'users'] })
      toast.success("Holat o'zgartirildi")
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Xatolik'),
  })
}

export function useModules() {
  return useQuery({
    queryKey:  [SETTINGS_KEY, 'modules'],
    queryFn:   settingsService.getModules,
    staleTime: 60_000,
  })
}

export function useActivateModule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ type, months }: { type: string; months?: number }) =>
      settingsService.activateModule(type, months),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [SETTINGS_KEY] })
      qc.invalidateQueries({ queryKey: ['auth'] })
      toast.success('Modul ulandi')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Xatolik'),
  })
}

export function usePlanInfo() {
  return useQuery({
    queryKey:  [SETTINGS_KEY, 'plan'],
    queryFn:   settingsService.getPlan,
    staleTime: 5 * 60_000,
  })
}
