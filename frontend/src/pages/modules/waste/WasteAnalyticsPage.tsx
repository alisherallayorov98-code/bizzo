import { useState } from 'react'
import {
  TrendingDown, AlertTriangle, Star, BarChart2, Activity,
} from 'lucide-react'
import { PageHeader } from '@components/layout/PageHeader/PageHeader'
import { Card }       from '@components/ui/Card/Card'
import { Badge }      from '@components/ui/Badge/Badge'
import { Input }      from '@components/ui/Input/Input'
import { Skeleton }   from '@components/ui/Skeleton/Skeleton'
import { KPICard }    from '@components/charts/KPICard/KPICard'
import { useWasteAnalytics, useQualityTypes } from '@features/waste-module/hooks/useWaste'
import { formatPercent, formatDate } from '@utils/formatters'
import { useT } from '@i18n/index'
import { cn } from '@utils/cn'

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={12}
          className={i < rating ? 'text-warning fill-warning' : 'text-border-secondary'}
        />
      ))}
      <span className="ml-1 text-xs tabular-nums text-text-secondary">{rating}/5</span>
    </div>
  )
}

export default function WasteAnalyticsPage() {
  const t = useT()
  const [dateFrom,   setDateFrom]  = useState('')
  const [dateTo,     setDateTo]    = useState('')
  const [sourceType, setSource]    = useState('')

  const { data: qualityTypes } = useQualityTypes()

  const filters = {
    dateFrom:   dateFrom || undefined,
    dateTo:     dateTo   || undefined,
    sourceType: sourceType || undefined,
  }

  const { data, isLoading } = useWasteAnalytics(filters)

  return (
    <div>
      <PageHeader
        title={t('waste.analyticsTitle')}
        description={t('waste.analyticsDesc')}
        breadcrumbs={[
          { label: t('nav.dashboard'), path: '/dashboard' },
          { label: t('waste.processingTitle'), path: '/modules/waste' },
          { label: t('waste.analyticsTitle') },
        ]}
      />

      <Card padding="sm" className="mb-6">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              {t('waste.dateFrom')}
            </label>
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              {t('waste.dateTo')}
            </label>
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
          <select
            value={sourceType}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSource(e.target.value)}
            className="px-3 py-2 rounded-lg border border-border-primary bg-bg-secondary text-sm text-text-primary focus:outline-none focus:border-accent-primary transition-colors"
          >
            <option value="">{t('waste.allSources')}</option>
            <option value="CITIZEN">{t('waste.citizens')}</option>
            <option value="SUPPLIER">{t('waste.suppliers')}</option>
          </select>
        </div>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard
          title={t('waste.totalProcessed')}
          value={data?.summary.totalProcessed ?? '—'}
          subtitle={t('waste.recordsLabel')}
          icon={<BarChart2 size={18} />}
          iconColor="text-accent-primary"
          iconBg="bg-accent-primary/10"
          loading={isLoading}
        />
        <KPICard
          title={t('waste.avgLoss')}
          value={data ? formatPercent(data.summary.overallAvgLoss) : '—'}
          icon={<TrendingDown size={18} />}
          iconColor={
            data && data.summary.overallAvgLoss > 30
              ? 'text-danger'
              : data && data.summary.overallAvgLoss > 20
              ? 'text-warning'
              : 'text-success'
          }
          iconBg="bg-warning/10"
          loading={isLoading}
        />
        <KPICard
          title={t('waste.anomalies')}
          value={data?.summary.anomalyCount ?? '—'}
          subtitle={data ? t('waste.anomalyRateSub', { rate: formatPercent(data.summary.anomalyRate) }) : ''}
          icon={<AlertTriangle size={18} />}
          iconColor={(data?.summary.anomalyCount ?? 0) > 0 ? 'text-danger' : 'text-text-muted'}
          iconBg={(data?.summary.anomalyCount ?? 0) > 0 ? 'bg-danger/10' : 'bg-bg-elevated'}
          loading={isLoading}
        />
        <KPICard
          title={t('waste.anomalyRateTitle')}
          value={data ? formatPercent(data.summary.anomalyRate) : '—'}
          icon={<Activity size={18} />}
          iconColor="text-text-muted"
          iconBg="bg-bg-elevated"
          loading={isLoading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <Card padding="md">
          <h3 className="font-semibold text-text-primary mb-4">{t('waste.lossByQuality')}</h3>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 rounded-lg" />
              ))}
            </div>
          ) : !data || !Object.keys(data.byQuality).length ? (
            <p className="text-sm text-text-muted text-center py-8">{t('common.noData')}</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(data.byQuality).map(([name, stats]) => {
                const qt = qualityTypes?.find(q => q.name === name)
                const isHigh = stats.avgLoss > (qt?.expectedLossMax ?? 99) * 1.5
                return (
                  <div key={name} className="p-3 rounded-lg bg-bg-tertiary border border-border-primary">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-text-primary">{name}</span>
                      <div className="flex items-center gap-2">
                        {stats.anomalies > 0 && (
                          <Badge variant="danger" size="sm">
                            {t('waste.anomalyBadge', { count: stats.anomalies })}
                          </Badge>
                        )}
                        <span className={cn(
                          'text-sm font-bold tabular-nums',
                          isHigh ? 'text-danger' : 'text-success',
                        )}>
                          {formatPercent(stats.avgLoss)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-text-muted">
                      <span>{t('waste.processingCountLabel', { count: stats.count })}</span>
                      <span>Min: {formatPercent(stats.minLoss)}</span>
                      <span>Max: {formatPercent(stats.maxLoss)}</span>
                    </div>
                    <div className="h-1.5 bg-bg-elevated rounded-full overflow-hidden mt-2">
                      <div
                        className={cn(
                          'h-full rounded-full',
                          isHigh ? 'bg-danger' : stats.avgLoss > 20 ? 'bg-warning' : 'bg-success',
                        )}
                        style={{ width: `${Math.min(100, stats.avgLoss)}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        <Card padding="md">
          <h3 className="font-semibold text-text-primary mb-4">{t('waste.supplierRating')}</h3>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 rounded-lg" />
              ))}
            </div>
          ) : !data?.supplierRating?.length ? (
            <p className="text-sm text-text-muted text-center py-8">
              {t('waste.noSupplierData')}
            </p>
          ) : (
            <div className="space-y-2">
              {data.supplierRating.map((supplier, idx) => (
                <div
                  key={supplier.contactId}
                  className="flex items-center justify-between p-3 rounded-lg bg-bg-tertiary border border-border-primary"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-bold text-text-muted w-5 text-right">
                      #{idx + 1}
                    </span>
                    <div>
                      <div className="text-sm font-medium text-text-primary">
                        {t('waste.supplier')} {supplier.contactId.slice(-6)}
                      </div>
                      <div className="text-xs text-text-muted">
                        {t('waste.supplierBatchCount', { count: supplier.count })}
                        {supplier.anomalies > 0 && (
                          <span className="text-danger ml-2">
                            {t('waste.anomalyBadge', { count: supplier.anomalies })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <StarRating rating={supplier.rating} />
                    <div className="text-xs text-text-muted mt-0.5 tabular-nums">
                      {t('waste.avgAbbr')} {formatPercent(supplier.avgLoss)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card padding="md">
        <h3 className="font-semibold text-text-primary mb-4">
          {t('waste.recentAnomalies')}
          {(data?.summary.anomalyCount ?? 0) > 0 && (
            <Badge variant="danger" size="sm" className="ml-2">
              {data!.summary.anomalyCount} ta
            </Badge>
          )}
        </h3>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 rounded-lg" />
            ))}
          </div>
        ) : !data?.recentAnomalies?.length ? (
          <div className="flex flex-col items-center py-8 gap-2">
            <AlertTriangle size={28} className="text-success opacity-50" />
            <p className="text-sm text-text-muted">{t('waste.noAnomalies')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {data.recentAnomalies.map((a, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 rounded-lg bg-danger/5 border border-danger/20"
              >
                <div className="flex items-center gap-2.5">
                  <AlertTriangle size={14} className="text-danger shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-text-primary">{a.qualityType}</div>
                    {a.anomalyReason && (
                      <div className="text-xs text-text-muted">{a.anomalyReason}</div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold tabular-nums text-danger">
                    {formatPercent(a.lossPercent)}
                  </div>
                  <div className="text-xs text-text-muted">
                    {formatDate(a.processedAt)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
