import { useState, useCallback, useRef } from 'react'
import {
  Plus, Search, TrendingUp, Target,
  DollarSign, BarChart3, Calendar, ChevronRight, MoreVertical,
} from 'lucide-react'
import { PageHeader } from '@components/layout/PageHeader/PageHeader'
import { Button }     from '@components/ui/Button/Button'
import { Input }      from '@components/ui/Input/Input'
import { Badge }      from '@components/ui/Badge/Badge'
import { KPICard }    from '@components/charts/KPICard/KPICard'
import {
  usePipeline, useSalesStats, useUpdateStage,
} from '@features/sales-module/hooks/useSales'
import type { Deal, PipelineColumn } from '@services/sales.service'
import { formatCurrency, formatDate } from '@utils/formatters'
import { cn } from '@utils/cn'
import { useDebounce } from '@hooks/useDebounce'
import { useT } from '@i18n/index'
import NewDealModal from './components/NewDealModal'

// ============================================
// CONSTANTS
// ============================================
const STAGE_ORDER = ['LEAD', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST']

// ============================================
// DEAL KARTA
// ============================================
function DealCard({
  deal, onStageChange, onDragStart,
}: {
  deal: Deal
  onStageChange: (id: string, stage: string) => void
  onDragStart: (deal: Deal) => void
}) {
  const t = useT()
  const [menuOpen, setMenuOpen] = useState(false)

  const currentIdx = STAGE_ORDER.indexOf(deal.stage)
  const canAdvance = currentIdx < STAGE_ORDER.indexOf('NEGOTIATION')
  const nextStage  = canAdvance ? STAGE_ORDER[currentIdx + 1] : null

  const isOverdue = deal.expectedCloseDate
    ? new Date(deal.expectedCloseDate) < new Date()
    : false

  return (
    <div
      draggable
      onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; onDragStart(deal) }}
      className="p-3 rounded-lg border border-border-primary bg-bg-secondary hover:border-border-secondary transition-all duration-150 cursor-grab active:cursor-grabbing active:opacity-50 group"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-medium text-text-primary line-clamp-2 flex-1">
          {deal.title}
        </p>
        <div className="relative shrink-0">
          <button
            onClick={e => { e.stopPropagation(); setMenuOpen(!menuOpen) }}
            className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-bg-tertiary text-text-muted transition-all"
          >
            <MoreVertical size={13} />
          </button>
          {menuOpen && (
            <div
              className="absolute right-0 top-full mt-1 w-40 bg-bg-elevated border border-border-primary rounded-lg shadow-lg z-20 overflow-hidden"
              onMouseLeave={() => setMenuOpen(false)}
            >
              {nextStage && (
                <button
                  onClick={() => { onStageChange(deal.id, nextStage); setMenuOpen(false) }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-text-secondary hover:bg-bg-tertiary hover:text-text-primary transition-colors"
                >
                  <ChevronRight size={12} />
                  {t('sales.nextStage')}
                </button>
              )}
              <button
                onClick={() => { onStageChange(deal.id, 'WON'); setMenuOpen(false) }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-success hover:bg-success/10 transition-colors"
              >
                {t('sales.won')}
              </button>
              <button
                onClick={() => { onStageChange(deal.id, 'LOST'); setMenuOpen(false) }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-danger hover:bg-danger/10 transition-colors"
              >
                {t('sales.lost')}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 mb-2">
        <div className="w-4 h-4 rounded-full bg-accent-primary/20 flex items-center justify-center shrink-0">
          <span className="text-[8px] font-bold text-accent-primary">
            {deal.contact?.name?.[0] || '?'}
          </span>
        </div>
        <span className="text-xs text-text-secondary truncate">
          {deal.contact?.name ?? '—'}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold tabular-nums text-text-primary">
          {formatCurrency(deal.finalAmount)}
        </span>
        <div className="flex items-center gap-1.5">
          {deal.expectedCloseDate && (
            <div className={cn(
              'flex items-center gap-1 text-[10px]',
              isOverdue ? 'text-danger' : 'text-text-muted',
            )}>
              <Calendar size={10} />
              {formatDate(deal.expectedCloseDate, 'short')}
            </div>
          )}
          <Badge variant="default" size="sm">{deal.probability}%</Badge>
        </div>
      </div>

      {deal.source && (
        <div className="mt-2 pt-2 border-t border-border-primary/50">
          <span className="text-[10px] text-text-muted">{deal.source}</span>
        </div>
      )}
    </div>
  )
}

// ============================================
// KANBAN USTUN
// ============================================
function KanbanColumn({
  column, onStageChange, onDragStart, onDrop,
}: {
  column: PipelineColumn
  onStageChange: (id: string, stage: string) => void
  onDragStart: (deal: Deal) => void
  onDrop: (stage: string) => void
}) {
  const t = useT()
  const [isDragOver, setIsDragOver] = useState(false)
  const dragCounter = useRef(0)

  return (
    <div className="flex flex-col min-w-[260px] max-w-[300px]">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: column.color }}
          />
          <span className="text-sm font-semibold text-text-primary">{column.label}</span>
          <span className="text-xs px-1.5 py-0.5 rounded-full bg-bg-tertiary text-text-muted font-mono">
            {column.count}
          </span>
        </div>
        <span className="text-xs tabular-nums text-text-muted font-medium">
          {formatCurrency(column.totalValue)}
        </span>
      </div>

      <div
        className={cn(
          'flex flex-col gap-2 flex-1 min-h-[80px] rounded-xl p-1 transition-colors duration-150',
          isDragOver && 'bg-accent-primary/5 ring-2 ring-accent-primary/30 ring-dashed',
        )}
        onDragEnter={e => { e.preventDefault(); dragCounter.current++; setIsDragOver(true) }}
        onDragOver={e => e.preventDefault()}
        onDragLeave={() => { dragCounter.current--; if (dragCounter.current === 0) setIsDragOver(false) }}
        onDrop={e => { e.preventDefault(); dragCounter.current = 0; setIsDragOver(false); onDrop(column.stage) }}
      >
        {column.deals.map(deal => (
          <DealCard key={deal.id} deal={deal} onStageChange={onStageChange} onDragStart={onDragStart} />
        ))}
        {column.deals.length === 0 && (
          <div className={cn(
            'flex-1 min-h-[80px] rounded-lg border-2 border-dashed flex items-center justify-center transition-colors',
            isDragOver ? 'border-accent-primary/50' : 'border-border-primary',
          )}>
            <p className="text-xs text-text-muted">{isDragOver ? '↓' : t('sales.empty')}</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================
// ASOSIY SAHIFA
// ============================================
export default function SalesPipelinePage() {
  const t = useT()
  const [search,      setSearch]      = useState('')
  const [dealModal,   setDealModal]   = useState(false)
  const draggedDeal = useRef<Deal | null>(null)

  const debouncedSearch = useDebounce(search, 400)
  const updateStage     = useUpdateStage()

  const { data: pipelineData, isLoading } = usePipeline({
    search: debouncedSearch || undefined,
  })
  const { data: stats } = useSalesStats()

  const handleStageChange = useCallback((id: string, stage: string) => {
    updateStage.mutate({ id, stage })
  }, [updateStage])

  const handleDragStart = useCallback((deal: Deal) => {
    draggedDeal.current = deal
  }, [])

  const handleDrop = useCallback((targetStage: string) => {
    const deal = draggedDeal.current
    if (deal && deal.stage !== targetStage) {
      updateStage.mutate({ id: deal.id, stage: targetStage })
    }
    draggedDeal.current = null
  }, [updateStage])

  return (
    <div>
      <PageHeader
        title={t('sales.pipelineTitle')}
        description={t('sales.pipelineDesc')}
        breadcrumbs={[
          { label: t('nav.dashboard'), path: '/dashboard' },
          { label: t('nav.sales'),     path: '/sales' },
          { label: 'Pipeline' },
        ]}
        actions={
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus size={14} />}
            onClick={() => setDealModal(true)}
          >
            {t('sales.newDeal')}
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard
          title={t('sales.wonThisMonth')}
          value={stats ? formatCurrency(stats.wonThisMonth) : '—'}
          subtitle={t('sales.wonCountSub', { count: stats?.wonCount ?? 0 })}
          icon={<DollarSign size={18} />}
          iconColor="text-success"
          iconBg="bg-success/10"
          trend={stats?.growthRate}
          loading={!stats}
        />
        <KPICard
          title={t('dashboard.activeDeals')}
          value={stats?.activeDeals ?? '—'}
          icon={<Target size={18} />}
          iconColor="text-accent-primary"
          iconBg="bg-accent-primary/10"
          loading={!stats}
        />
        <KPICard
          title={t('dashboard.pipelineValue')}
          value={stats ? formatCurrency(stats.pipelineValue) : '—'}
          subtitle={t('sales.byProbability')}
          icon={<TrendingUp size={18} />}
          iconColor="text-warning"
          iconBg="bg-warning/10"
          loading={!stats}
        />
        <KPICard
          title={t('dashboard.conversion')}
          value={stats ? `${stats.conversionRate}%` : '—'}
          subtitle={t('sales.wonTotal')}
          icon={<BarChart3 size={18} />}
          iconColor={
            !stats ? 'text-text-muted'
              : stats.conversionRate >= 50 ? 'text-success'
              : stats.conversionRate >= 30 ? 'text-warning'
              : 'text-danger'
          }
          iconBg={
            !stats ? 'bg-bg-tertiary'
              : stats.conversionRate >= 50 ? 'bg-success/10'
              : stats.conversionRate >= 30 ? 'bg-warning/10'
              : 'bg-danger/10'
          }
          loading={!stats}
        />
      </div>

      <div className="mb-4">
        <Input
          placeholder={t('sales.searchDeals')}
          leftIcon={<Search size={15} />}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {isLoading ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {['LEAD', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION'].map(s => (
            <div key={s} className="min-w-[260px] space-y-2">
              <div className="h-6 bg-bg-tertiary rounded animate-pulse" />
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-bg-tertiary rounded-lg animate-pulse" />
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {pipelineData?.pipeline?.map((column: PipelineColumn) => (
            <KanbanColumn
              key={column.stage}
              column={column}
              onStageChange={handleStageChange}
              onDragStart={handleDragStart}
              onDrop={handleDrop}
            />
          ))}
        </div>
      )}

      {pipelineData && (
        <div className="mt-4 flex items-center gap-2 text-sm text-text-muted">
          <span>{t('sales.totalPipelineLabel')}</span>
          <span className="font-semibold text-text-primary tabular-nums">
            {formatCurrency(pipelineData.pipelineValue)}
          </span>
        </div>
      )}

      <NewDealModal open={dealModal} onClose={() => setDealModal(false)} />
    </div>
  )
}
