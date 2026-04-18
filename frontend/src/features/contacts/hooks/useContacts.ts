import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { contactService, type ContactQuery } from '@services/contact.service'

export const CONTACTS_KEY = 'contacts'

// ============================================
// RO'YXAT
// ============================================
export function useContacts(query: ContactQuery = {}) {
  return useQuery({
    queryKey:  [CONTACTS_KEY, 'list', query],
    queryFn:   () => contactService.getAll(query),
    staleTime: 30_000,
  })
}

// ============================================
// BITTA KONTAKT
// ============================================
export function useContact(id: string) {
  return useQuery({
    queryKey: [CONTACTS_KEY, 'detail', id],
    queryFn:  () => contactService.getOne(id),
    enabled:  !!id,
  })
}

// ============================================
// STATISTIKA
// ============================================
export function useContactStats() {
  return useQuery({
    queryKey:  [CONTACTS_KEY, 'stats'],
    queryFn:   contactService.getStats,
    staleTime: 60_000,
  })
}

// ============================================
// YARATISH
// ============================================
export function useCreateContact() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: contactService.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [CONTACTS_KEY] })
      toast.success('Kontakt muvaffaqiyatli yaratildi')
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message ?? 'Xatolik yuz berdi')
    },
  })
}

// ============================================
// YANGILASH
// ============================================
export function useUpdateContact() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      contactService.update(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: [CONTACTS_KEY] })
      qc.invalidateQueries({ queryKey: [CONTACTS_KEY, 'detail', id] })
      toast.success('Kontakt yangilandi')
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message ?? 'Xatolik yuz berdi')
    },
  })
}

// ============================================
// O'CHIRISH
// ============================================
export function useDeleteContact() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: contactService.remove,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [CONTACTS_KEY] })
      toast.success("Kontakt o'chirildi")
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message ?? "O'chirib bo'lmadi")
    },
  })
}

export function useBulkDeleteContacts() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ids: string[]) => contactService.bulkDelete(ids),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: [CONTACTS_KEY] })
      toast.success(`${res.deleted} ta kontakt o'chirildi`)
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message ?? "O'chirib bo'lmadi")
    },
  })
}
