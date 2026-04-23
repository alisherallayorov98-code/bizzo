import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { employeeService } from '@services/employee.service'

export const EMPLOYEES_KEY = 'employees'

// ============================================
// RO'YXAT
// ============================================
export function useEmployees(query: Record<string, any> = {}) {
  return useQuery({
    queryKey:  [EMPLOYEES_KEY, 'list', query],
    queryFn:   () => employeeService.getAll(query),
    staleTime: 30_000,
  })
}

// ============================================
// BITTA XODIM
// ============================================
export function useEmployee(id: string) {
  return useQuery({
    queryKey: [EMPLOYEES_KEY, 'detail', id],
    queryFn:  () => employeeService.getOne(id),
    enabled:  !!id,
  })
}

// ============================================
// STATISTIKA
// ============================================
export function useEmployeeStats() {
  return useQuery({
    queryKey:  [EMPLOYEES_KEY, 'stats'],
    queryFn:   employeeService.getStats,
    staleTime: 60_000,
  })
}

// ============================================
// ISH HAQI TARIXI
// ============================================
export function useSalaryHistory(month: number, year: number) {
  return useQuery({
    queryKey:  [EMPLOYEES_KEY, 'salary', month, year],
    queryFn:   () => employeeService.getSalaryHistory(month, year),
    staleTime: 30_000,
  })
}

// ============================================
// YARATISH
// ============================================
export function useCreateEmployee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: employeeService.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [EMPLOYEES_KEY] })
      toast.success("Xodim qo'shildi")
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Xatolik'),
  })
}

// ============================================
// YANGILASH
// ============================================
export function useUpdateEmployee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      employeeService.update(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: [EMPLOYEES_KEY] })
      qc.invalidateQueries({ queryKey: [EMPLOYEES_KEY, 'detail', id] })
      toast.success('Xodim yangilandi')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Xatolik'),
  })
}

// ============================================
// ISH HAQI YOZUVI
// ============================================
export function useCreateSalaryRecord() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: employeeService.createSalaryRecord,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [EMPLOYEES_KEY] })
      toast.success('Ish haqi yozuvi yaratildi')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Xatolik'),
  })
}

// ============================================
// ISH HAQI TO'LASH
// ============================================
export function useMarkSalaryPaid() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: employeeService.markSalaryPaid,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [EMPLOYEES_KEY] })
      toast.success("Ish haqi to'langan deb belgilandi")
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Xatolik'),
  })
}

// ============================================
// KUNLIK ISH
// ============================================
export function useAddDailyWork() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: employeeService.addDailyWork,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [EMPLOYEES_KEY] })
      toast.success('Kunlik ish qayd etildi')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Xatolik'),
  })
}

// ============================================
// OMMAVIY ISH HAQI TO'LASH
// ============================================
export function useBulkMarkSalaryPaid() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (recordIds: string[]) => employeeService.bulkMarkSalaryPaid(recordIds),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: [EMPLOYEES_KEY] })
      toast.success(`${data.count} ta xodimga ish haqi to'landi`)
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Xatolik'),
  })
}

// ============================================
// HAFTALIK TO'LOV
// ============================================
export function useMarkWeeklyPaid() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, weekStart }: { id: string; weekStart: string }) =>
      employeeService.markWeeklyPaid(id, weekStart),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: [EMPLOYEES_KEY] })
      toast.success(result?.message ?? "Haftalik to'lov belgilandi")
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Xatolik'),
  })
}

// ============================================
// AVANS
// ============================================
export function useGiveAdvance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string; amount: number; month: number; year: number; note?: string }) =>
      employeeService.giveAdvance(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [EMPLOYEES_KEY] })
      toast.success('Avans berildi')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Xatolik'),
  })
}
