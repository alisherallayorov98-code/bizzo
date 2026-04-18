import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@utils/cn'

interface Props {
  page:       number
  totalPages: number
  total?:     number
  onPage:     (p: number) => void
  className?: string
}

export function Pagination({ page, totalPages, total, onPage, className }: Props) {
  if (totalPages <= 1) return null

  const pages: (number | '...')[] = []

  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i)
  } else {
    pages.push(1)
    if (page > 3) pages.push('...')
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i)
    if (page < totalPages - 2) pages.push('...')
    pages.push(totalPages)
  }

  return (
    <div className={cn('flex items-center justify-between px-4 py-3 border-t border-border-primary', className)}>
      {total != null ? (
        <p className="text-xs text-text-muted">
          Jami: <span className="font-medium text-text-secondary">{total}</span>
        </p>
      ) : <span />}

      <div className="flex items-center gap-1">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          className="w-7 h-7 rounded-md flex items-center justify-center text-text-secondary hover:bg-bg-tertiary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={14} />
        </button>

        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`ellipsis-${i}`} className="w-7 h-7 flex items-center justify-center text-xs text-text-muted">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPage(p as number)}
              className={cn(
                'w-7 h-7 rounded-md text-xs font-medium transition-colors',
                page === p
                  ? 'bg-accent-primary text-white'
                  : 'text-text-secondary hover:bg-bg-tertiary',
              )}
            >
              {p}
            </button>
          )
        )}

        <button
          onClick={() => onPage(page + 1)}
          disabled={page >= totalPages}
          className="w-7 h-7 rounded-md flex items-center justify-center text-text-secondary hover:bg-bg-tertiary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}
