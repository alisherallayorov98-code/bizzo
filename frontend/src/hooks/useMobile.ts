import { useState, useEffect, useCallback } from 'react'

export interface MobileState {
  isMobile:    boolean
  isSmall:     boolean
  isTablet:    boolean
  isDesktop:   boolean
  orientation: 'portrait' | 'landscape'
  isOnline:    boolean
  isPWA:       boolean
}

function readState(): MobileState {
  if (typeof window === 'undefined') {
    return {
      isMobile: false, isSmall: false, isTablet: false, isDesktop: true,
      orientation: 'landscape', isOnline: true, isPWA: false,
    }
  }
  const w = window.innerWidth
  return {
    isMobile:    w < 1024,
    isSmall:     w < 640,
    isTablet:    w >= 640 && w < 1024,
    isDesktop:   w >= 1024,
    orientation: window.innerHeight > window.innerWidth ? 'portrait' : 'landscape',
    isOnline:    navigator.onLine,
    isPWA:       window.matchMedia('(display-mode: standalone)').matches ||
                 (window.navigator as any).standalone === true,
  }
}

export function useMobile(): MobileState {
  const [state, setState] = useState<MobileState>(readState)

  useEffect(() => {
    const onResize  = () => setState(readState())
    const onOnline  = () => setState(s => ({ ...s, isOnline: true }))
    const onOffline = () => setState(s => ({ ...s, isOnline: false }))

    window.addEventListener('resize',  onResize)
    window.addEventListener('online',  onOnline)
    window.addEventListener('offline', onOffline)

    return () => {
      window.removeEventListener('resize',  onResize)
      window.removeEventListener('online',  onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  return state
}

// ============================================
// PWA O'RNATISH HOOK
// ============================================
export function usePWAInstall() {
  const [canInstall,    setCanInstall]    = useState(false)
  const [deferredEvent, setDeferredEvent] = useState<any>(null)
  const [isInstalled,   setIsInstalled]   = useState(false)

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    setIsInstalled(isStandalone)

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredEvent(e)
      setCanInstall(true)
    }
    const installed = () => {
      setIsInstalled(true)
      setCanInstall(false)
    }

    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', installed)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', installed)
    }
  }, [])

  const install = useCallback(async () => {
    if (!deferredEvent) return
    deferredEvent.prompt()
    const { outcome } = await deferredEvent.userChoice
    if (outcome === 'accepted') {
      setIsInstalled(true)
      setCanInstall(false)
    }
    setDeferredEvent(null)
  }, [deferredEvent])

  return { canInstall, isInstalled, install }
}

// ============================================
// PULL TO REFRESH HOOK
// ============================================
export function usePullToRefresh(onRefresh: () => Promise<void> | void) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)

  useEffect(() => {
    let startY = 0
    let currentDistance = 0
    const THRESHOLD = 80

    const onTouchStart = (e: TouchEvent) => {
      if (window.scrollY <= 0) startY = e.touches[0].clientY
      else startY = 0
    }

    const onTouchMove = (e: TouchEvent) => {
      if (!startY) return
      const distance = e.touches[0].clientY - startY
      if (distance > 0 && window.scrollY <= 0) {
        currentDistance = Math.min(distance, THRESHOLD * 1.5)
        setPullDistance(currentDistance)
      }
    }

    const onTouchEnd = async () => {
      if (currentDistance >= THRESHOLD) {
        setIsRefreshing(true)
        try {
          await onRefresh()
        } finally {
          setIsRefreshing(false)
        }
      }
      setPullDistance(0)
      currentDistance = 0
      startY = 0
    }

    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchmove',  onTouchMove,  { passive: true })
    document.addEventListener('touchend',   onTouchEnd)

    return () => {
      document.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchmove',  onTouchMove)
      document.removeEventListener('touchend',   onTouchEnd)
    }
  }, [onRefresh])

  return { isRefreshing, pullDistance }
}
