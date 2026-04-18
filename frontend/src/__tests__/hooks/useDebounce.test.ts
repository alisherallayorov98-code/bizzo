import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDebounce } from '@utils/performance'

describe('useDebounce', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('returns initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('a', 300))
    expect(result.current).toBe('a')
  })

  it('updates value after delay', () => {
    const { result, rerender } = renderHook(({ v }) => useDebounce(v, 300), { initialProps: { v: 'a' } })
    rerender({ v: 'b' })
    expect(result.current).toBe('a')
    act(() => { vi.advanceTimersByTime(300) })
    expect(result.current).toBe('b')
  })

  it('cancels pending update on rapid changes', () => {
    const { result, rerender } = renderHook(({ v }) => useDebounce(v, 300), { initialProps: { v: 'a' } })
    rerender({ v: 'b' })
    act(() => { vi.advanceTimersByTime(100) })
    rerender({ v: 'c' })
    act(() => { vi.advanceTimersByTime(100) })
    expect(result.current).toBe('a')
    act(() => { vi.advanceTimersByTime(300) })
    expect(result.current).toBe('c')
  })
})
