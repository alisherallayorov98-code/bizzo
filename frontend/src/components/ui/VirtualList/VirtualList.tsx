import { useRef, useState, useEffect, useCallback, memo, ReactNode, UIEvent } from 'react'

interface VirtualListProps<T> {
  items: T[]
  itemHeight: number
  overscan?: number
  renderItem: (item: T, index: number) => ReactNode
  className?: string
  emptyState?: ReactNode
}

export function VirtualList<T>({
  items,
  itemHeight,
  overscan = 5,
  renderItem,
  className,
  emptyState,
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [containerHeight, setContainerHeight] = useState(600)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const ro = new ResizeObserver(entries => {
      setContainerHeight(entries[0].contentRect.height)
    })
    ro.observe(container)
    return () => ro.disconnect()
  }, [])

  const onScroll = useCallback((e: UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }, [])

  if (!items.length) return <>{emptyState}</>

  const totalHeight = items.length * itemHeight
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
  const visibleCount = Math.ceil(containerHeight / itemHeight) + overscan * 2
  const endIndex = Math.min(items.length - 1, startIndex + visibleCount)
  const visibleItems = items.slice(startIndex, endIndex + 1)
  const offsetY = startIndex * itemHeight

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ overflow: 'auto', position: 'relative' }}
      onScroll={onScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, i) => (
            <div key={startIndex + i} style={{ height: itemHeight, overflow: 'hidden' }}>
              {renderItem(item, startIndex + i)}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export const TableRow = memo(function TableRow({
  children,
  className,
  onClick,
}: {
  children: ReactNode
  className?: string
  onClick?: () => void
}) {
  return (
    <tr className={className} onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      {children}
    </tr>
  )
})

export default VirtualList
