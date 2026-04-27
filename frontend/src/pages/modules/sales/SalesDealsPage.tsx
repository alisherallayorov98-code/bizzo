import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Trophy, XCircle, Trash2 } from 'lucide-react'
import { PageHeader }    from '@components/layout/PageHeader/PageHeader'
import { Button }        from '@components/ui/Button/Button'
import { Card }          from '@components/ui/Card/Card'
import { Badge }         from '@components/ui/Badge/Badge'
import { Input }         from '@components/ui/Input/Input'
import { Skeleton }      from '@components/ui/Skeleton/Skeleton'
import { BulkActionBar } from '@components/ui/BulkActionBar/BulkActionBar'
import { useDeals, useBulkDeleteDeals } from '@features/sales-module/hooks/useSales'
import { formatCurrency, formatDate } from '@utils/formatters'
import { cn }         from '@utils/cn'
import { useT }       from '@i18n/index'
import type { Deal }  from '@services/sales.service'
import NewDealModal   from './components/NewDealModal'

// ============================================
// STAGE BADGE
// ============================================
function StageBadge({ stage }: { stage: string }) {
  const t = useT()
  if (stage === 'WON')         return <Badge variant="success" size="sm">{t('sales.won')}</Badge>
  if (stage === 'LOST')        return <Badge variant="danger"  size="sm">{t('sales.lost')}</Badge>
  if (stage === 'LEAD')        return <Badge variant="default" size="sm">{t('sales.stageLead')}</Badge>
  if (stage === 'QUALIFIED')   return <Badge variant="info"    size="sm">{t('sales.stageQualified')}</Badge>
  if (stage === 'PROPOSAL')    return <Badge variant="warning" size="sm">{t('sales.stageProposal')}</Badge>
  if (stage === 'NEGOTIATION') return <Badge variant="warning" size="sm">{t('sales.stageNegotiation')}</Badge>
  return <Badge size="sm">{stage}</Badge>
}

// ============================================
// ASOSIY SAHIFA
// ============================================
export default function SalesDealsPage() {
  const t        = useT()
  const navigate = useNavigate()
  const [search,      setSearch]     = useState('')
  const [stageTab,    setStageTab]   = useState('')
  const [dateFrom,    setDateFrom]   = useState('')
  const [dateTo,      setDateTo]     = useState('')
  const [page,        setPage]       = useState(1)
  const [dealModal,   setDealModal]  = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const TABS = [
    { key: '',            label: t('common.all') },
    { key: 'LEAD',        label: t('sales.stageLead') },
    { key: 'QUALIFIED',   label: t('sales.stageQualified') },
    { key: 'PROPOSAL',    label: t('sales.stageProposal') },
    { key: 'NEGOTIATION', label: t('sales.stageNegotiation') },
    { key: 'WON',         label: t('sales.won') },
    { key: 'LOST',        label: t('sales.lost') },
  ]

  const query: Record<string, any> = { page, limit: 20 }
  if (stageTab) query.stage    = stageTab
  if (search)   query.search   = search
  if (dateFrom) query.dateFrom = dateFrom
  if (dateTo)   query.dateTo   = dateTo

  const { data, isLoading } = useDeals(query)
  const bulkDelete = useBulkDeleteDeals()

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  }, [])
  const selectAll  = useCallback(() => setSelectedIds(new Set(data?.data?.map((d: Deal) => d.id) ?? [])), [data])
  const clearSelect = useCallback(() => setSelectedIds(new Set()), [])

  const HEADERS = [
    t('sales.colDealNum'), t('sales.colName'), t('sales.colContact'),
    t('sales.colStage'), t('common.amount'), t('sales.colProb'),
    t('sales.colCloseDate'), t('sales.colSource'),
  ]

  return (
    <div>
      <PageHeader
        title={t('sales.dealsTitle')}
        description={t('sales.dealsDesc')}
        breadcrumbs={[
          { label: t('nav.dashboard'), path: '/dashboard' },
          { label: t('nav.sales'),     path: '/sales' },
          { label: t('sales.dealsTitle') },
        ]}
        actions={
          <Button
            variant="primary"
            leftIcon={<Plus size={16} />}
            onClick={() => setDealModal(true)}
          >
            {t('sales.newDeal')}
          </Button>
        }
      />

      <Card padding="sm" className="mb-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex-1 min-w-[200px]">
            <Input
              placeholder={t('sales.searchDealsPlaceholder')}
              leftIcon={<Search size={14} />}
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
            />
          </div>
          <div className="flex gap-2">
            <Input
              type="date"
              value={dateFrom}
              onChange={e => { setDateFrom(e.target.value); setPage(1) }}
            />
            <Input
              type="date"
              value={dateTo}
              onChange={e => { setDateTo(e.target.value); setPage(1) }}
            />
          </div>
        </div>

        <div className="flex gap-1.5 mt-3 flex-wrap">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => { setStageTab(tab.key); setPage(1) }}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                stageTab === tab.key
                  ? 'bg-accent-primary text-white'
                  : 'text-text-secondary hover:bg-bg-tertiary border border-border-primary',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </Card>

      <BulkActionBar
        selectedCount={selectedIds.size}
        totalCount={data?.data?.length ?? 0}
        onSelectAll={selectAll}
        onClearAll={clearSelect}
        actions={[{
          label: "O'chirish",
          icon: <Trash2 size={14} />,
          variant: 'danger' as const,
          onClick: () => {
            if (confirm(`${selectedIds.size} ta deal o'chirilsinmi?`)) {
              bulkDelete.mutate(Array.from(selectedIds), { onSuccess: clearSelect })
            }
          },
        }]}
      />

      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-primary">
                <th className="px-4 py-3 w-8">
                  <input
                    type="checkbox"
                    checked={selectedIds.size > 0 && selectedIds.size === (data?.data?.length ?? 0)}
                    onChange={e => e.target.checked ? selectAll() : clearSelect()}
                    className="rounded border-border-primary"
                  />
                </th>
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
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-border-primary">
                    {Array.from({ length: 9 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton className="h-4 rounded" style={{ width: '70%' }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : !data?.data?.length ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-sm text-text-muted">
                    <div className="flex flex-col items-center gap-2">
                      {stageTab === 'WON' ? (
                        <Trophy size={32} className="opacity-30" />
                      ) : stageTab === 'LOST' ? (
                        <XCircle size={32} className="opacity-30" />
                      ) : (
                        <Search size={32} className="opacity-30" />
                      )}
                      {t('sales.dealsNotFound')}
                    </div>
                  </td>
                </tr>
              ) : (
                data.data.map((deal: Deal) => (
                  <tr
                    key={deal.id}
                    onClick={() => navigate(`/sales/deals/${deal.id}`)}
                    className={cn(
                      'border-b border-border-primary hover:bg-bg-tertiary/50 transition-colors cursor-pointer',
                      selectedIds.has(deal.id) && 'bg-accent-primary/5',
                    )}
                  >
                    <td className="px-4 py-3" onClick={e => { e.stopPropagation(); toggleSelect(deal.id) }}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(deal.id)}
                        onChange={() => toggleSelect(deal.id)}
                        className="rounded border-border-primary"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-mono font-semibold text-accent-primary">
                        {deal.dealNumber}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-text-primary line-clamp-1 max-w-[200px]">
                        {deal.title}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-text-secondary">
                        {deal.contact?.name ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StageBadge stage={deal.stage} />
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm tabular-nums font-medium text-text-primary">
                        {formatCurrency(deal.finalAmount)}
                      </span>
                      {deal.discount > 0 && (
                        <span className="text-xs text-success ml-1">-{deal.discount}%</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        'text-sm tabular-nums font-medium',
                        deal.probability >= 75 ? 'text-success'
                          : deal.probability >= 50 ? 'text-warning'
                          : 'text-text-secondary',
                      )}>
                        {deal.probability}%
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {deal.expectedCloseDate ? (
                        <span className={cn(
                          'text-sm',
                          !deal.closedAt && new Date(deal.expectedCloseDate) < new Date()
                            ? 'text-danger'
                            : 'text-text-secondary',
                        )}>
                          {formatDate(deal.expectedCloseDate)}
                        </span>
                      ) : (
                        <span className="text-sm text-text-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-text-muted">{deal.source ?? '—'}</span>
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
              {data.meta.total} ta natijadan {(page - 1) * data.meta.limit + 1}–
              {Math.min(page * data.meta.limit, data.meta.total)} ko'rsatilmoqda
            </span>
            <div className="flex gap-1.5">
              <Button
                variant="secondary" size="xs"
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
              >
                {t('sales.prevPage')}
              </Button>
              <Button
                variant="secondary" size="xs"
                disabled={page >= data.meta.totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                {t('sales.nextPage')}
              </Button>
            </div>
          </div>
        )}
      </Card>

      <NewDealModal open={dealModal} onClose={() => setDealModal(false)} />
    </div>
  )
}
