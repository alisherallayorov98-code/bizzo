import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { productService, type ProductQuery } from '@services/product.service'

export const PRODUCTS_KEY = 'products'

// ============================================
// RO'YXAT
// ============================================
export function useProducts(query: ProductQuery = {}) {
  return useQuery({
    queryKey:  [PRODUCTS_KEY, 'list', query],
    queryFn:   () => productService.getAll(query),
    staleTime: 30_000,
  })
}

// ============================================
// BITTA MAHSULOT
// ============================================
export function useProduct(id: string) {
  return useQuery({
    queryKey: [PRODUCTS_KEY, 'detail', id],
    queryFn:  () => productService.getOne(id),
    enabled:  !!id,
  })
}

// ============================================
// STATISTIKA
// ============================================
export function useProductStats() {
  return useQuery({
    queryKey:  [PRODUCTS_KEY, 'stats'],
    queryFn:   productService.getStats,
    staleTime: 60_000,
  })
}

// ============================================
// KATEGORIYALAR
// ============================================
export function useCategories() {
  return useQuery({
    queryKey:  [PRODUCTS_KEY, 'categories'],
    queryFn:   productService.getCategories,
    staleTime: 120_000,
  })
}

// ============================================
// MINIMAL QOLDIQ OGOHLANTIRISHLARI
// ============================================
export function useLowStockAlerts() {
  return useQuery({
    queryKey:  [PRODUCTS_KEY, 'low-stock'],
    queryFn:   productService.getLowStock,
    staleTime: 30_000,
  })
}

// ============================================
// YARATISH
// ============================================
export function useCreateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: productService.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [PRODUCTS_KEY] })
      toast.success('Mahsulot muvaffaqiyatli yaratildi')
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message ?? 'Xatolik yuz berdi')
    },
  })
}

// ============================================
// YANGILASH
// ============================================
export function useUpdateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      productService.update(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: [PRODUCTS_KEY] })
      qc.invalidateQueries({ queryKey: [PRODUCTS_KEY, 'detail', id] })
      toast.success('Mahsulot yangilandi')
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message ?? 'Xatolik yuz berdi')
    },
  })
}

// ============================================
// O'CHIRISH
// ============================================
export function useDeleteProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: productService.remove,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [PRODUCTS_KEY] })
      toast.success("Mahsulot o'chirildi")
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message ?? "O'chirib bo'lmadi")
    },
  })
}

export function useBulkDeleteProducts() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ids: string[]) => productService.bulkDelete(ids),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: [PRODUCTS_KEY] })
      toast.success(`${res.deleted} ta mahsulot o'chirildi`)
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message ?? "O'chirib bo'lmadi")
    },
  })
}
