import { useRef, useState, useEffect, useCallback, memo, ReactNode, UIEvent, KeyboardEvent } from 'react'

interface VirtualListProps<T> {
  items: T[]
  itemHeight: number
  overscan?: number
  renderItem: (item: T, index: number) => ReactNode
  className?: string
  emptyState?: ReactNode
  /** Keyboard navigation: called when user presses Enter on a focused item */
  onSelectItem?: (item: T, index: number) => void
  /** Controlled cursor for keyboard navigation */
  cursor?: number
  onCursorChange?: (index: number) => void
}

export function VirtualList<T>({
  items,
  itemHeight,
  overscan = 5,
  renderItem,
  className,
  emptyState,
  onSelectItem,
  cursor: controlledCursor,
  onCursorChange,
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [containerHeight, setContainerHeight] = useState(600)
  const [internalCursor, setInternalCursor] = useState(-1)

  const cursor = controlledCursor ?? internalCursor
  const setCursor = onCursorChange ?? setInternalCursor

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const ro = new ResizeObserver(entries => {
      setContainerHeight(entries[0].contentRect.height)
    })
    ro.observe(container)
    return () => ro.disconnect()
  }, [])

  // Auto-scroll to keep cursor in view
  useEffect(() => {
    if (cursor < 0 || !containerRef.current) return
    const top = cursor * itemHeight
    const bot = top + itemHeight
    const { scrollTop: st, clientHeight } = containerRef.current
    if (top < st) containerRef.current.scrollTop = top
    else if (bot > st + clientHeight) containerRef.current.scrollTop = bot - clientHeight
  }, [cursor, itemHeight])

  const onScroll = useCallback((e: UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }, [])

  const onKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
    if (!onSelectItem) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setCursor(Math.min(cursor + 1, items.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setCursor(Math.max(cursor - 1, 0))
    } else if (e.key === 'Enter' && cursor >= 0 && items[cursor]) {
      e.preventDefault()
      onSelectItem(items[cursor], cursor)
    }
  }, [cursor, items, onSelectItem, setCursor])

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
      tabIndex={onSelectItem ? 0 : undefined}
      onScroll={onScroll}
      onKeyDown={onSelectItem ? onKeyDown : undefined}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, i) => (
            <div
              key={startIndex + i}
              style={{ height: itemHeight, overflow: 'hidden' }}
              data-cursor={cursor === startIndex + i ? 'true' : undefined}
            >
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
