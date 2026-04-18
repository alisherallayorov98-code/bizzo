import { Trash2, Download, X, CheckSquare } from 'lucide-react'
import { Button }  from '@components/ui/Button/Button'
import { cn }      from '@utils/cn'

export interface BulkAction {
  label:    string
  icon?:    React.ReactNode
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  loading?: boolean
  onClick:  () => void
}

interface Props {
  selectedCount: number
  totalCount:    number
  actions:       BulkAction[]
  onSelectAll:   () => void
  onClearAll:    () => void
  className?:    string
}

export function BulkActionBar({
  selectedCount,
  totalCount,
  actions,
  onSelectAll,
  onClearAll,
  className,
}: Props) {
  if (selectedCount === 0) return null

  return (
    <div className={cn(
      'flex items-center justify-between gap-3 px-4 py-2.5',
      'bg-accent-primary/5 border-b border-accent-primary/20',
      'animate-in slide-in-from-top-1 duration-150',
      className,
    )}>
      {/* Left: selection info */}
      <div className="flex items-center gap-3">
        <button
          onClick={onClearAll}
          className="w-5 h-5 flex items-center justify-center rounded text-accent-primary hover:bg-accent-primary/20 transition-colors"
        >
          <X size={13} />
        </button>

        <span className="text-sm font-medium text-text-primary">
          <span className="text-accent-primary">{selectedCount}</span>
          {' '}ta tanlandi
        </span>

        {selectedCount < totalCount && (
          <button
            onClick={onSelectAll}
            className="flex items-center gap-1 text-xs text-accent-primary hover:underline"
          >
            <CheckSquare size={12} />
            Hammasini tanlash ({totalCount})
          </button>
        )}
      </div>

      {/* Right: action buttons */}
      <div className="flex items-center gap-2">
        {actions.map((action, i) => (
          <Button
            key={i}
            variant={action.variant ?? 'secondary'}
            size="sm"
            loading={action.loading}
            leftIcon={action.icon}
            onClick={action.onClick}
          >
            {action.label}
          </Button>
        ))}
      </div>
    </div>
  )
}

export { Trash2, Download }
