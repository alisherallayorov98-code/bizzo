import { useState } from 'react'
import { PackagePlus, Search, Filter } from 'lucide-react'
import { PageHeader } from '@components/layout/PageHeader/PageHeader'
import { Button }     from '@components/ui/Button/Button'
import { Card }       from '@components/ui/Card/Card'
import { Badge }      from '@components/ui/Badge/Badge'
import { Input }      from '@components/ui/Input/Input'
import { Skeleton }   from '@components/ui/Skeleton/Skeleton'
import { useWasteBatches, useQualityTypes } from '@features/waste-module/hooks/useWaste'
import { formatCurrency, formatWeight, formatDate } from '@utils/formatters'
import { cn }         from '@utils/cn'
import { useT }       from '@i18n/index'
import NewBatchModal  from './components/NewBatchModal'
import type { WasteBatch } from '@services/waste.service'

function BatchStatusBadge({ status }: { status: string }) {
  const t = useT()
  if (status === 'IN_STOCK')   return <Badge variant="info"    size="sm">{t('waste.statusInStock')}</Badge>
  if (status === 'PROCESSING') return <Badge variant="warning" size="sm">{t('waste.statusProcessing')}</Badge>
  if (status === 'COMPLETED')  return <Badge variant="success" size="sm">{t('waste.statusCompletedAlt')}</Badge>
  return <Badge size="sm">{status}</Badge>
}

export default function WasteBatchesPage() {
  const t = useT()
  const [search,       setSearch]   = useState('')
  const [statusFilter, setStatus]   = useState('')
  const [sourceFilter, setSource]   = useState('')
  const [qualityFilter, setQuality] = useState('')
  const [page,         setPage]     = useState(1)
  const [newBatchOpen, setNewBatch] = useState(false)

  const STATUS_TABS = [
    { key: '',           label: t('common.all') },
    { key: 'IN_STOCK',   label: t('waste.statusInStock') },
    { key: 'PROCESSING', label: t('waste.statusProcessing') },
    { key: 'COMPLETED',  label: t('waste.statusCompletedAlt') },
  ]

  const HEADERS = [
    t('waste.colBatchNum'), t('waste.colDate'), t('waste.colSource'),
    t('waste.colQuality'), t('waste.colInputWeight'), t('waste.colRemaining'),
    t('common.price'), t('common.total'), t('common.status'),
  ]

  const query: Record<string, any> = { page, limit: 20 }
  if (statusFilter)  query.status       = statusFilter
  if (sourceFilter)  query.sourceType   = sourceFilter
  if (qualityFilter) query.qualityTypeId = qualityFilter
  if (search)        query.search       = search

  const { data, isLoading } = useWasteBatches(query)
  const { data: qualityTypes } = useQualityTypes()

  return (
    <div>
      <PageHeader
        title={t('waste.batchesTitle')}
        description={t('waste.batchesDesc')}
        breadcrumbs={[
          { label: t('nav.dashboard'), path: '/dashboard' },
          { label: t('waste.processingTitle'), path: '/modules/waste' },
          { label: t('waste.batchesTitle') },
        ]}
        actions={
          <Button
            variant="primary"
            leftIcon={<PackagePlus size={16} />}
            onClick={() => setNewBatch(true)}
          >
            {t('waste.receiveBatch')}
          </Button>
        }
      />

      <Card padding="sm" className="mb-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex-1 min-w-[200px]">
            <Input
              placeholder={t('waste.searchBatch')}
              leftIcon={<Search size={14} />}
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
            />
          </div>

          <select
            value={sourceFilter}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => { setSource(e.target.value); setPage(1) }}
            className="px-3 py-2 rounded-lg border border-border-primary bg-bg-secondary text-sm text-text-primary focus:outline-none focus:border-accent-primary transition-colors"
          >
            <option value="">{t('waste.allSources')}</option>
            <option value="CITIZEN">{t('waste.citizens')}</option>
            <option value="SUPPLIER">{t('waste.suppliers')}</option>
          </select>

          <select
            value={qualityFilter}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => { setQuality(e.target.value); setPage(1) }}
            className="px-3 py-2 rounded-lg border border-border-primary bg-bg-secondary text-sm text-text-primary focus:outline-none focus:border-accent-primary transition-colors"
          >
            <option value="">{t('waste.allQualities')}</option>
            {qualityTypes?.map(qt => (
              <option key={qt.id} value={qt.id}>{qt.name}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-1.5 mt-3 flex-wrap">
          {STATUS_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => { setStatus(tab.key); setPage(1) }}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                statusFilter === tab.key
                  ? 'bg-accent-primary text-white'
                  : 'text-text-secondary hover:bg-bg-tertiary border border-border-primary',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </Card>

      <Card padding="none">
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
              {isLoading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="border-b border-border-primary">
                    {Array.from({ length: 9 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton className="h-4 rounded" style={{ width: '75%' }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : !data?.data?.length ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-sm text-text-muted">
                    <Filter size={32} className="mx-auto mb-2 opacity-30" />
                    {t('waste.batchesNotFound')}
                  </td>
                </tr>
              ) : (
                data.data.map((batch: WasteBatch) => (
                  <tr
                    key={batch.id}
                    className="border-b border-border-primary hover:bg-bg-tertiary/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span className="text-sm font-mono font-semibold text-accent-primary">
                        {batch.batchNumber}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-text-secondary">
                        {formatDate(batch.receivedAt)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-text-primary">
                        {batch.sourceType === 'CITIZEN'
                          ? batch.citizenName ?? '—'
                          : t('waste.supplier')}
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
                      <span className={cn(
                        'text-sm tabular-nums',
                        batch.remaining !== undefined && batch.remaining <= 0
                          ? 'text-text-muted'
                          : 'text-text-primary',
                      )}>
                        {batch.remaining !== undefined
                          ? formatWeight(batch.remaining)
                          : formatWeight(batch.inputWeight)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm tabular-nums text-text-secondary">
                        {formatCurrency(batch.pricePerKg)}/kg
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm tabular-nums font-medium text-text-primary">
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

        {data && data.meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border-primary">
            <span className="text-xs text-text-muted">
              {data.meta.total} ta | {(page - 1) * data.meta.limit + 1}–
              {Math.min(page * data.meta.limit, data.meta.total)}
            </span>
            <div className="flex gap-1.5">
              <Button variant="secondary" size="xs" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                {t('sales.prevPage')}
              </Button>
              <Button variant="secondary" size="xs" disabled={page >= data.meta.totalPages} onClick={() => setPage(p => p + 1)}>
                {t('sales.nextPage')}
              </Button>
            </div>
          </div>
        )}
      </Card>

      <NewBatchModal open={newBatchOpen} onClose={() => setNewBatch(false)} />
    </div>
  )
}
