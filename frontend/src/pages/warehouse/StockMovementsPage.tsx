import { useState } from 'react'
import {
  ArrowDownCircle, ArrowUpCircle, RefreshCw,
  Settings, Plus, Filter, AlertTriangle,
} from 'lucide-react'
import { PageHeader } from '@components/layout/PageHeader/PageHeader'
import { Button } from '@components/ui/Button/Button'
import { Card } from '@components/ui/Card/Card'
import { Badge } from '@components/ui/Badge/Badge'
import { EmptyState } from '@components/ui/EmptyState/EmptyState'
import { TableRowSkeleton } from '@components/ui/Skeleton/Skeleton'
import { useMovements } from '@features/warehouse/hooks/useWarehouse'
import type { MovementType } from '@services/warehouse.service'
import { formatCurrency } from '@utils/formatters'
import { cn } from '@utils/cn'
import { useT } from '@i18n/index'

// ============================================
// HARAKAT TURI BADGE
// ============================================
const MOVEMENT_MAP: Record<MovementType, { label: string; variant: 'success' | 'danger' | 'info' | 'warning' | 'default'; icon: React.ReactNode }> = {
  IN:             { label: 'Kirim',      variant: 'success', icon: <ArrowDownCircle size={13} /> },
  OUT:            { label: 'Chiqim',     variant: 'danger',  icon: <ArrowUpCircle size={13} /> },
  TRANSFER:       { label: "Ko'chirish", variant: 'info',    icon: <RefreshCw size={13} /> },
  ADJUSTMENT:     { label: 'Sozlash',   variant: 'warning', icon: <Settings size={13} /> },
  PRODUCTION_IN:  { label: 'Ishlab chiqarish kirim',  variant: 'success', icon: <ArrowDownCircle size={13} /> },
  PRODUCTION_OUT: { label: 'Ishlab chiqarish chiqim', variant: 'danger',  icon: <ArrowUpCircle size={13} /> },
  WASTE_IN:       { label: 'Chiqindi kirim',  variant: 'warning', icon: <ArrowDownCircle size={13} /> },
  WASTE_OUT:      { label: 'Chiqindi chiqim', variant: 'danger',  icon: <ArrowUpCircle size={13} /> },
}

function MovementTypeBadge({ type }: { type: MovementType }) {
  const m = MOVEMENT_MAP[type] ?? { label: type, variant: 'default' as const, icon: null }
  return (
    <Badge variant={m.variant} size="sm">
      <span className="flex items-center gap-1">
        {m.icon}
        {m.label}
      </span>
    </Badge>
  )
}

// ============================================
// FILTER TABS
// ============================================
const TABS = [
  { id: '',           tKey: 'common.all' },
  { id: 'IN',         tKey: 'warehouse.in' },
  { id: 'OUT',        tKey: 'warehouse.out' },
  { id: 'TRANSFER',   tKey: 'warehouse.transfer' },
  { id: 'ADJUSTMENT', tKey: 'warehouse.adjustment' },
]

// ============================================
// ASOSIY SAHIFA
// ============================================
export default function StockMovementsPage() {
  const t = useT()
  const [typeFilter, setTypeFilter] = useState('')

  const { data, isLoading, isError, refetch } = useMovements({
    type:  typeFilter || undefined,
    page:  1,
    limit: 50,
  })

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('uz-UZ', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  return (
    <div>
      <PageHeader
        title={t('warehouse.movementsTitle')}
        description={t('warehouse.movementsDescription')}
        breadcrumbs={[
          { label: t('nav.dashboard'), path: '/dashboard' },
          { label: t('warehouse.title'), path: '/warehouse' },
          { label: t('warehouse.movements') },
        ]}
        actions={
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus size={14} />}
          >
            {t('warehouse.addMovement')}
          </Button>
        }
      />

      {isError && (
        <div className="mb-4 p-4 rounded-xl border border-danger/30 bg-danger/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-danger" />
            <p className="text-sm text-danger">Harakatlar yuklanmadi. Qayta urinib ko'ring.</p>
          </div>
          <Button variant="secondary" size="xs" leftIcon={<RefreshCw size={12} />} onClick={() => refetch()}>
            Qayta urinish
          </Button>
        </div>
      )}

      <Card padding="none">
        {/* Filter */}
        <div className="flex items-center gap-3 p-4 border-b border-border-primary flex-wrap">
          <div className="flex items-center gap-1">
            {TABS.map(tab => {
              const active = typeFilter === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setTypeFilter(tab.id)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                    active
                      ? 'bg-accent-primary/10 text-accent-primary'
                      : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary',
                  )}
                >
                  {t(tab.tKey)}
                </button>
              )
            })}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Button variant="secondary" size="xs" leftIcon={<Filter size={12} />}>
              {t('common.filter')}
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-primary">
                {['Sana', 'Mahsulot', 'Tur', 'Ombor', 'Miqdor', 'Narx', 'Summa'].map(h => (
                  <th
                    key={h}
                    className={cn(
                      'px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-text-muted',
                      h === 'Miqdor' || h === 'Narx' || h === 'Summa'
                        ? 'text-right'
                        : 'text-left',
                    )}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <TableRowSkeleton key={i} cols={7} />
                ))
              ) : !data?.data.length ? (
                <tr>
                  <td colSpan={7}>
                    <EmptyState
                      icon={<RefreshCw size={28} />}
                      title={t('warehouse.movementsNotFound')}
                      description={t('warehouse.noMovementsHint')}
                    />
                  </td>
                </tr>
              ) : (
                data.data.map(m => (
                  <tr
                    key={m.id}
                    className="border-b border-border-primary hover:bg-bg-tertiary/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span className="text-xs text-text-muted font-mono">
                        {formatDate(m.createdAt)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-text-primary">{m.product.name}</p>
                      {m.product.code && (
                        <p className="text-xs text-text-muted font-mono">{m.product.code}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <MovementTypeBadge type={m.type} />
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-text-secondary">{m.warehouse.name}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={cn(
                        'text-sm font-medium tabular-nums',
                        m.type === 'IN' || m.type === 'PRODUCTION_IN' || m.type === 'WASTE_IN'
                          ? 'text-success'
                          : m.type === 'OUT' || m.type === 'PRODUCTION_OUT' || m.type === 'WASTE_OUT'
                            ? 'text-danger'
                            : 'text-text-primary',
                      )}>
                        {m.type === 'OUT' || m.type === 'PRODUCTION_OUT' || m.type === 'WASTE_OUT' ? '-' : '+'}
                        {m.quantity} {m.product.unit}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm text-text-secondary tabular-nums">
                        {formatCurrency(m.price)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-medium text-text-primary tabular-nums">
                        {formatCurrency(m.totalAmount)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Sahifalash */}
        {data && data.meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border-primary">
            <p className="text-xs text-text-muted">
              Jami:{' '}
              <span className="font-medium text-text-secondary">{data.meta.total}</span>{' '}
              ta harakat
            </p>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(data.meta.totalPages, 10) }).map((_, i) => (
                <button
                  key={i}
                  className={cn(
                    'w-7 h-7 rounded-md text-xs font-medium transition-colors',
                    data.meta.page === i + 1
                      ? 'bg-accent-primary text-white'
                      : 'text-text-secondary hover:bg-bg-tertiary',
                  )}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
