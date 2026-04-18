import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Recycle, PackagePlus, TrendingDown, AlertTriangle,
  Weight, DollarSign, Activity, ArrowRight,
} from 'lucide-react'
import { PageHeader }  from '@components/layout/PageHeader/PageHeader'
import { KPICard }     from '@components/charts/KPICard/KPICard'
import { Card }        from '@components/ui/Card/Card'
import { Badge }       from '@components/ui/Badge/Badge'
import { Button }      from '@components/ui/Button/Button'
import { Skeleton }    from '@components/ui/Skeleton/Skeleton'
import { useWasteDashboard, useWasteBatches, useQualityTypes } from '@features/waste-module/hooks/useWaste'
import { formatCurrency, formatWeight, formatPercent } from '@utils/formatters'
import { cn }          from '@utils/cn'
import { useT }        from '@i18n/index'
import NewBatchModal   from './components/NewBatchModal'

function BatchStatusBadge({ status }: { status: string }) {
  const t = useT()
  if (status === 'IN_STOCK')    return <Badge variant="info"    size="sm">{t('waste.statusInStock')}</Badge>
  if (status === 'PROCESSING')  return <Badge variant="warning" size="sm">{t('waste.statusProcessing')}</Badge>
  if (status === 'COMPLETED')   return <Badge variant="success" size="sm">{t('waste.statusCompleted')}</Badge>
  return <Badge size="sm">{status}</Badge>
}

export default function WasteDashboardPage() {
  const t = useT()
  const [newBatchOpen, setNewBatchOpen] = useState(false)

  const { data: stats,   isLoading: statsLoading }  = useWasteDashboard()
  const { data: batches, isLoading: batchesLoading } = useWasteBatches({ limit: 5, page: 1 })
  const { data: qualityTypes }                       = useQualityTypes()

  const MONTH_ROWS = stats ? [
    { label: t('waste.totalReceived'),   value: formatWeight(stats.thisMonth.totalWeight),     color: 'text-text-primary' },
    { label: t('waste.processedWeight'), value: formatWeight(stats.thisMonth.processedWeight), color: 'text-accent-primary' },
    { label: t('waste.outputProduct'),   value: formatWeight(stats.thisMonth.outputWeight),    color: 'text-success' },
    { label: t('waste.lossWeight'),      value: formatWeight(stats.thisMonth.lossWeight),      color: 'text-danger' },
    { label: t('waste.totalCostLabel'),  value: formatCurrency(stats.thisMonth.totalCost),     color: 'text-text-primary' },
  ] : []

  const HEADERS = [
    t('waste.colBatchNum'), t('waste.colSource'), t('waste.colQuality'),
    t('waste.colInputWeight'), t('common.price'), t('common.status'),
  ]

  return (
    <div>
      <PageHeader
        title={t('waste.dashTitle')}
        description={t('waste.dashDesc')}
        breadcrumbs={[
          { label: t('nav.dashboard'), path: '/dashboard' },
          { label: t('waste.moduleName') },
        ]}
        actions={
          <Button
            variant="primary"
            leftIcon={<PackagePlus size={16} />}
            onClick={() => setNewBatchOpen(true)}
          >
            {t('waste.receiveBatch')}
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard
          title={t('waste.todayReceived')}
          value={stats ? formatWeight(stats.today.totalWeight) : '—'}
          subtitle={t('waste.todayBatchesSub', { count: stats?.today.batches ?? '—' })}
          icon={<Weight size={18} />}
          iconColor="text-accent-primary"
          iconBg="bg-accent-primary/10"
          loading={statsLoading}
        />
        <KPICard
          title={t('waste.todayCost')}
          value={stats ? formatCurrency(stats.today.totalCost) : '—'}
          icon={<DollarSign size={18} />}
          iconColor="text-success"
          iconBg="bg-success/10"
          loading={statsLoading}
        />
        <KPICard
          title={t('waste.monthAvgLoss')}
          value={stats ? formatPercent(stats.thisMonth.avgLossPercent) : '—'}
          icon={<TrendingDown size={18} />}
          iconColor={
            stats && stats.thisMonth.avgLossPercent > 30
              ? 'text-danger'
              : stats && stats.thisMonth.avgLossPercent > 20
              ? 'text-warning'
              : 'text-success'
          }
          iconBg={
            stats && stats.thisMonth.avgLossPercent > 30
              ? 'bg-danger/10'
              : 'bg-success/10'
          }
          loading={statsLoading}
        />
        <KPICard
          title={t('waste.anomalies')}
          value={stats?.thisMonth.anomalies ?? '—'}
          subtitle={t('waste.anomaliesThisMonth')}
          icon={<AlertTriangle size={18} />}
          iconColor={(stats?.thisMonth.anomalies ?? 0) > 0 ? 'text-danger' : 'text-text-muted'}
          iconBg={(stats?.thisMonth.anomalies ?? 0) > 0 ? 'bg-danger/10' : 'bg-bg-elevated'}
          loading={statsLoading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card padding="md" className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-text-primary">{t('waste.monthStats')}</h3>
            <Badge variant="info" size="sm">
              <Activity size={10} className="mr-1" />
              {t('waste.processedCount', { count: stats?.thisMonth.processed ?? 0 })}
            </Badge>
          </div>
          {statsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex justify-between items-center">
                  <Skeleton className="h-4 w-1/3 rounded" />
                  <Skeleton className="h-4 w-1/4 rounded" />
                </div>
              ))}
            </div>
          ) : stats ? (
            <div className="space-y-3">
              {MONTH_ROWS.map(({ label, value, color }) => (
                <div key={label} className="flex items-center justify-between py-2 border-b border-border-primary last:border-0">
                  <span className="text-sm text-text-secondary">{label}</span>
                  <span className={cn('text-sm font-semibold tabular-nums', color)}>{value}</span>
                </div>
              ))}

              {stats.thisMonth.processedWeight > 0 && (
                <div className="mt-2">
                  <div className="flex justify-between text-xs text-text-muted mb-1.5">
                    <span>{t('waste.lossShare')}</span>
                    <span className="tabular-nums">{formatPercent(stats.thisMonth.avgLossPercent)}</span>
                  </div>
                  <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        stats.thisMonth.avgLossPercent > 30 ? 'bg-danger' :
                        stats.thisMonth.avgLossPercent > 20 ? 'bg-warning' : 'bg-success',
                      )}
                      style={{ width: `${Math.min(100, stats.thisMonth.avgLossPercent)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-text-muted text-center py-8">{t('common.noData')}</p>
          )}
        </Card>

        <Card padding="md">
          <h3 className="font-semibold text-text-primary mb-4">{t('waste.qualityTypesTitle')}</h3>
          {!qualityTypes ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 rounded-lg" />
              ))}
            </div>
          ) : qualityTypes.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-6">
              {t('waste.noQualityTypes')}
            </p>
          ) : (
            <div className="space-y-2">
              {qualityTypes.map(qt => (
                <div
                  key={qt.id}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-bg-tertiary border border-border-primary"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: qt.color || '#888' }}
                    />
                    <span className="text-sm text-text-primary font-medium">{qt.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-xs tabular-nums text-text-secondary">
                      {qt.expectedLossMin}–{qt.expectedLossMax}%
                    </div>
                    <div className="text-xs text-text-muted">
                      {formatCurrency(qt.buyPricePerKg)}/kg
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card padding="none">
        <div className="flex items-center justify-between p-4 border-b border-border-primary">
          <div>
            <h3 className="font-semibold text-text-primary">{t('waste.recentBatches')}</h3>
            <p className="text-xs text-text-muted mt-0.5">
              {t('waste.pendingBatches', { count: stats?.pendingBatches ?? 0 })}
            </p>
          </div>
          <Link to="batches">
            <Button variant="secondary" size="sm" rightIcon={<ArrowRight size={14} />}>
              {t('common.all')}
            </Button>
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-primary">
                {HEADERS.map(h => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {batchesLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border-primary">
                    {Array.from({ length: 6 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton className="h-4 rounded" style={{ width: '70%' }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : !batches?.data?.length ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sm text-text-muted">
                    <Recycle size={32} className="mx-auto mb-2 opacity-30" />
                    {t('waste.noBatches')}
                  </td>
                </tr>
              ) : (
                batches.data.map(batch => (
                  <tr
                    key={batch.id}
                    className="border-b border-border-primary hover:bg-bg-tertiary/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span className="text-sm font-mono font-medium text-accent-primary">
                        {batch.batchNumber}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-text-primary">
                        {batch.sourceType === 'CITIZEN' ? batch.citizenName : t('waste.supplier')}
                      </div>
                      <div className="text-xs text-text-muted">
                        {batch.sourceType === 'CITIZEN' ? t('waste.citizen') : t('waste.deliverer')}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {batch.qualityType ? (
                        <span className="text-sm text-text-primary">{batch.qualityType.name}</span>
                      ) : (
                        <span className="text-sm text-text-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm tabular-nums text-text-primary">
                        {formatWeight(batch.inputWeight)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm tabular-nums text-text-primary">
                        {formatCurrency(batch.totalCost)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <BatchStatusBadge status={batch.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <NewBatchModal open={newBatchOpen} onClose={() => setNewBatchOpen(false)} />
    </div>
  )
}
