import {
  useRef, useCallback, useEffect, useState, memo,
  DependencyList, RefObject,
} from 'react'

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debouncedValue
}

export function useThrottle<T extends (...args: any[]) => any>(fn: T, delay: number): T {
  const lastCall = useRef(0)
  return useCallback((...args: Parameters<T>) => {
    const now = Date.now()
    if (now - lastCall.current >= delay) {
      lastCall.current = now
      return fn(...args)
    }
  }, [fn, delay]) as T
}

export function useIntersectionObserver(
  ref: RefObject<Element>,
  options?: IntersectionObserverInit,
) {
  const [isIntersecting, setIsIntersecting] = useState(false)
  useEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new IntersectionObserver(
      ([entry]) => setIsIntersecting(entry.isIntersecting),
      { threshold: 0.1, ...options },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref, options])
  return isIntersecting
}

export function useDeepMemo<T>(factory: () => T, deps: DependencyList): T {
  const ref = useRef<{ deps: DependencyList; value: T }>()
  if (!ref.current || !deps.every((dep, i) => Object.is(dep, ref.current!.deps[i]))) {
    ref.current = { deps, value: factory() }
  }
  return ref.current.value
}

export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>()
  useEffect(() => { ref.current = value }, [value])
  return ref.current
}

interface LazyImageProps {
  src: string
  alt: string
  className?: string
  fallback?: string
}

export const LazyImage = memo(function LazyImage({ src, alt, className, fallback }: LazyImageProps) {
  const imgRef = useRef<HTMLDivElement>(null)
  const isVisible = useIntersectionObserver(imgRef)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)

  return (
    <div ref={imgRef} className={className}>
      {isVisible && !error ? (
        <img
          src={src}
          alt={alt}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          style={{ opacity: loaded ? 1 : 0, transition: 'opacity 0.3s' }}
          loading="lazy"
          decoding="async"
        />
      ) : error && fallback ? (
        <img src={fallback} alt={alt} />
      ) : (
        <div className="bg-bg-tertiary animate-pulse w-full h-full rounded" />
      )}
    </div>
  )
})

export function measurePerformance(name: string) {
  if (!import.meta.env.DEV) return { end: () => {} }
  const start = performance.now()
  return {
    end: () => {
      const duration = performance.now() - start
      if (duration > 16) {
        console.warn(`[Perf] ${name}: ${duration.toFixed(2)}ms (> 16ms)`)
      }
    },
  }
}
