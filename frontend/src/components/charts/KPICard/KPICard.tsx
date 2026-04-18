import { type ReactNode } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@utils/cn'
import { KPICardSkeleton } from '@components/ui/Skeleton/Skeleton'

export interface KPICardProps {
  title:        string
  value:        string | number
  subtitle?:    string
  subtitleColor?: string
  icon?:        ReactNode
  iconColor?:   string
  iconBg?:      string
  trend?:       number
  trendLabel?:  string
  trendInverse?: boolean   // true = minus yaxshi (masalan, xarajatlar uchun)
  loading?:     boolean
  onClick?:     () => void
  className?:   string
}

export function KPICard({
  title,
  value,
  subtitle,
  subtitleColor,
  icon,
  iconColor   = 'text-[var(--color-accent-primary)]',
  iconBg      = 'bg-[var(--color-accent-subtle)]',
  trend,
  trendLabel  = "o'tgan oyga nisbatan",
  trendInverse = false,
  loading     = false,
  onClick,
  className,
}: KPICardProps) {
  if (loading) return <KPICardSkeleton />

  const hasTrend     = trend !== undefined
  const isPositive   = trend !== undefined && trend > 0
  const isNegative   = trend !== undefined && trend < 0
  const isNeutral    = trend !== undefined && trend === 0

  // Rang mantiq: trendInverse bo'lsa qizil va yashil almashadi
  const trendGood = trendInverse ? isNegative : isPositive
  const trendBad  = trendInverse ? isPositive : isNegative

  return (
    <div
      className={cn(
        'rounded-[var(--radius-lg)] bg-[var(--color-bg-secondary)]',
        'border border-[var(--color-border-primary)] p-5',
        'transition-all duration-200',
        onClick && [
          'cursor-pointer select-none',
          'hover:border-[var(--color-border-secondary)]',
          'hover:bg-[var(--color-bg-elevated)]',
          'hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]',
        ],
        className
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {/* Sarlavha + Icon */}
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm text-[var(--color-text-secondary)] font-medium leading-tight pr-2">
          {title}
        </p>
        {icon && (
          <div className={cn('p-2 rounded-[var(--radius-md)] shrink-0', iconBg)}>
            <span className={cn('block w-5 h-5 flex items-center justify-center', iconColor)}>
              {icon}
            </span>
          </div>
        )}
      </div>

      {/* Asosiy qiymat */}
      <p className="font-display font-bold text-2xl text-[var(--color-text-primary)] tabular-nums leading-none">
        {value}
      </p>

      {/* Subtitle */}
      {subtitle && (
        <p className={cn('text-xs mt-1', subtitleColor ?? 'text-[var(--color-text-muted)]')}>
          {subtitle}
        </p>
      )}

      {/* Trend */}
      {hasTrend && (
        <div className="flex items-center gap-1.5 mt-3">
          <div
            className={cn(
              'flex items-center gap-0.5 text-xs font-semibold',
              trendGood    && 'text-[var(--color-success)]',
              trendBad     && 'text-[var(--color-danger)]',
              isNeutral    && 'text-[var(--color-text-muted)]',
            )}
          >
            {isPositive && <TrendingUp  size={13} />}
            {isNegative && <TrendingDown size={13} />}
            {isNeutral  && <Minus        size={13} />}
            <span>
              {isPositive ? '+' : ''}{trend!.toFixed(1)}%
            </span>
          </div>
          <span className="text-xs text-[var(--color-text-muted)]">
            {trendLabel}
          </span>
        </div>
      )}
    </div>
  )
}

export default KPICard
