import { useState, useCallback } from 'react'

interface UsePaginationOptions {
  initialPage?: number
  initialLimit?: number
}

interface PaginationState {
  page: number
  limit: number
  setPage: (page: number) => void
  setLimit: (limit: number) => void
  nextPage: () => void
  prevPage: () => void
  resetPage: () => void
}

export function usePagination(options: UsePaginationOptions = {}): PaginationState {
  const { initialPage = 1, initialLimit = 20 } = options

  const [page, setPageState]   = useState(initialPage)
  const [limit, setLimitState] = useState(initialLimit)

  const setPage = useCallback((p: number) => setPageState(p), [])
  const setLimit = useCallback((l: number) => {
    setLimitState(l)
    setPageState(1)
  }, [])

  const nextPage  = useCallback(() => setPageState((p) => p + 1), [])
  const prevPage  = useCallback(() => setPageState((p) => Math.max(1, p - 1)), [])
  const resetPage = useCallback(() => setPageState(1), [])

  return { page, limit, setPage, setLimit, nextPage, prevPage, resetPage }
}
