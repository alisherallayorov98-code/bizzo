import { type HTMLAttributes } from 'react'
import { cn } from '@utils/cn'

// ============================================
// SKELETON
// ============================================

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded'
  width?:   string | number
  height?:  string | number
  lines?:   number
}

export function Skeleton({
  variant = 'rounded',
  width,
  height,
  lines,
  className,
  style,
  ...props
}: SkeletonProps) {
  // Ko'p qatorli matn uchun
  if (lines && lines > 1) {
    return (
      <div className="flex flex-col gap-2" {...props}>
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton
            key={i}
            variant="text"
            width={i === lines - 1 ? '60%' : '100%'}
            height={14}
            className={className}
          />
        ))}
      </div>
    )
  }

  const w = width  ? (typeof width  === 'number' ? `${width}px`  : width)  : '100%'
  const h = height ? (typeof height === 'number' ? `${height}px` : height) : '16px'

  return (
    <div
      className={cn(
        'shimmer',
        variant === 'text'        && 'rounded',
        variant === 'circular'    && 'rounded-full',
        variant === 'rectangular' && 'rounded-none',
        variant === 'rounded'     && 'rounded-[var(--radius-md)]',
        className
      )}
      style={{ width: w, height: h, ...style }}
      {...props}
    />
  )
}

// ============================================
// KARTA SKELETON
// ============================================

export function CardSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="rounded-[var(--radius-lg)] bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] p-5 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton width="45%" height={18} />
        <Skeleton width={72} height={28} />
      </div>
      <Skeleton lines={rows} />
      <div className="flex gap-2 pt-1">
        <Skeleton width={88} height={32} />
        <Skeleton width={88} height={32} />
      </div>
    </div>
  )
}

// ============================================
// JADVAL SATRI SKELETON
// ============================================

export function TableRowSkeleton({ cols = 5 }: { cols?: number }) {
  return (
    <tr className="border-b border-[var(--color-border-primary)]">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton height={15} width={i === 0 ? '75%' : i % 3 === 0 ? '50%' : '65%'} />
        </td>
      ))}
    </tr>
  )
}

// ============================================
// KPI KARTA SKELETON
// ============================================

export function KPICardSkeleton() {
  return (
    <div className="rounded-[var(--radius-lg)] bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] p-5">
      <div className="flex items-start justify-between mb-3">
        <Skeleton width="55%" height={14} />
        <Skeleton variant="rounded" width={36} height={36} />
      </div>
      <Skeleton width="70%" height={30} className="mb-2" />
      <Skeleton width="40%" height={12} />
    </div>
  )
}

export default Skeleton
