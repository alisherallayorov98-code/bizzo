import { useRef, useEffect } from 'react'

interface SwipeHandlers {
  onSwipeLeft?:  () => void
  onSwipeRight?: () => void
  onSwipeUp?:    () => void
  onSwipeDown?:  () => void
  threshold?:    number
}

export function useSwipe(
  elementRef: React.RefObject<HTMLElement | null>,
  handlers: SwipeHandlers,
) {
  const start  = useRef<{ x: number; y: number } | null>(null)
  const { threshold = 50 } = handlers

  useEffect(() => {
    const el = elementRef.current
    if (!el) return

    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0]
      start.current = { x: t.clientX, y: t.clientY }
    }

    const onTouchEnd = (e: TouchEvent) => {
      if (!start.current) return
      const t = e.changedTouches[0]
      const dx = t.clientX - start.current.x
      const dy = t.clientY - start.current.y
      start.current = null

      const absDx = Math.abs(dx)
      const absDy = Math.abs(dy)

      if (absDx < threshold && absDy < threshold) return

      if (absDx > absDy) {
        if (dx > 0) handlers.onSwipeRight?.()
        else        handlers.onSwipeLeft?.()
      } else {
        if (dy > 0) handlers.onSwipeDown?.()
        else        handlers.onSwipeUp?.()
      }
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchend',   onTouchEnd,   { passive: true })
    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchend',   onTouchEnd)
    }
  }, [handlers, threshold, elementRef])
}
