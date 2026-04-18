import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { constructionService } from '@services/construction.service'

export const CONSTRUCTION_KEY = 'construction'

export function useProjects(query: Record<string, any> = {}) {
  return useQuery({
    queryKey:  [CONSTRUCTION_KEY, 'projects', query],
    queryFn:   () => constructionService.getProjects(query),
    staleTime: 30_000,
  })
}

export function useProject(id: string) {
  return useQuery({
    queryKey:  [CONSTRUCTION_KEY, 'project', id],
    queryFn:   () => constructionService.getProject(id),
    enabled:   !!id,
    staleTime: 15_000,
  })
}

export function useConstructionStats() {
  return useQuery({
    queryKey:  [CONSTRUCTION_KEY, 'stats'],
    queryFn:   constructionService.getStats,
    staleTime: 60_000,
  })
}

export function useCreateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: constructionService.createProject,
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: [CONSTRUCTION_KEY] })
      toast.success(`Loyiha yaratildi: ${data.projectNumber}`)
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Xatolik'),
  })
}

export function useAddBudgetItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: constructionService.addBudgetItem,
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: [CONSTRUCTION_KEY, 'project', vars.projectId] })
      qc.invalidateQueries({ queryKey: [CONSTRUCTION_KEY, 'projects'] })
      toast.success('Smeta modda qo\'shildi')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Xatolik'),
  })
}

export function useAddExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: constructionService.addExpense,
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: [CONSTRUCTION_KEY, 'project', vars.projectId] })
      qc.invalidateQueries({ queryKey: [CONSTRUCTION_KEY] })
      toast.success('Xarajat qayd etildi')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Xatolik'),
  })
}

export function useAddWorkLog() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: constructionService.addWorkLog,
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: [CONSTRUCTION_KEY, 'project', vars.projectId] })
      qc.invalidateQueries({ queryKey: [CONSTRUCTION_KEY, 'projects'] })
      toast.success('Ish yozuvi saqlandi')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Xatolik'),
  })
}

export function useUpdateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string } & any) =>
      constructionService.updateProject(id, payload),
    onSuccess: (_d, { id }) => {
      qc.invalidateQueries({ queryKey: [CONSTRUCTION_KEY, 'project', id] })
      qc.invalidateQueries({ queryKey: [CONSTRUCTION_KEY, 'projects'] })
      toast.success('Loyiha yangilandi')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Xatolik'),
  })
}

export function useUpdateStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      constructionService.updateStatus(id, status),
    onSuccess: (_d, { id }) => {
      qc.invalidateQueries({ queryKey: [CONSTRUCTION_KEY, 'project', id] })
      qc.invalidateQueries({ queryKey: [CONSTRUCTION_KEY, 'projects'] })
      toast.success('Holat yangilandi')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Xatolik'),
  })
}

export function useDeleteProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => constructionService.deleteProject(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [CONSTRUCTION_KEY, 'projects'] })
      toast.success("Loyiha o'chirildi")
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Xatolik'),
  })
}

export function useDeleteBudgetItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, projectId }: { id: string; projectId: string }) =>
      constructionService.deleteBudgetItem(id),
    onSuccess: (_d, { projectId }) => {
      qc.invalidateQueries({ queryKey: [CONSTRUCTION_KEY, 'project', projectId] })
      toast.success("Smeta modda o'chirildi")
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Xatolik'),
  })
}

export function useAddTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: constructionService.addTask,
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: [CONSTRUCTION_KEY, 'project', vars.projectId] })
      toast.success("Vazifa qo'shildi")
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Xatolik'),
  })
}

export function useUpdateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string; projectId: string } & any) =>
      constructionService.updateTask(id, payload),
    onSuccess: (_d, { projectId }) => {
      qc.invalidateQueries({ queryKey: [CONSTRUCTION_KEY, 'project', projectId] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Xatolik'),
  })
}

export function useDeleteTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id }: { id: string; projectId: string }) =>
      constructionService.deleteTask(id),
    onSuccess: (_d, { projectId }) => {
      qc.invalidateQueries({ queryKey: [CONSTRUCTION_KEY, 'project', projectId] })
      toast.success("Vazifa o'chirildi")
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Xatolik'),
  })
}

export function useUpdateExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string; projectId: string; isPaid: boolean }) =>
      constructionService.updateExpense(id, { isPaid: payload.isPaid }),
    onSuccess: (_d, { projectId }) => {
      qc.invalidateQueries({ queryKey: [CONSTRUCTION_KEY, 'project', projectId] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Xatolik'),
  })
}
