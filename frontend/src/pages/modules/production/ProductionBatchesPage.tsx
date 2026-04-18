import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Play, CheckSquare, Clock, AlertTriangle, TrendingDown, Package, BarChart2,
} from 'lucide-react'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import { PageHeader } from '@components/layout/PageHeader/PageHeader'
import { Card } from '@components/ui/Card/Card'
import { Button } from '@components/ui/Button/Button'
import { Badge } from '@components/ui/Badge/Badge'
import { Input } from '@components/ui/Input/Input'
import { KPICard } from '@components/charts/KPICard/KPICard'
import { Modal } from '@components/ui/Modal/Modal'
import { EmptyState } from '@components/ui/EmptyState/EmptyState'
import { TableRowSkeleton } from '@components/ui/Skeleton/Skeleton'
import {
  useBatches, useProductionStats, useStartBatch, useCompleteBatch, useProductionAnalytics,
} from '@features/production/hooks/useProduction'
import { useWarehouses } from '@features/warehouse/hooks/useWarehouse'
import type { ProductionBatch } from '@services/production.service'
import { formatDate, formatNumber } from '@utils/formatters'
import { useT } from '@i18n/index'
import { cn } from '@utils/cn'
import toast from 'react-hot-toast'

function CompleteBatchModal({ batch, open, onClose }: {
  batch: ProductionBatch | null; open: boolean; onClose: () => void
}) {
  const t = useT()
  const [outputWarehouseId, setOutputWarehouseId] = useState('')
  const [actualOutputs, setActualOutputs] = useState<Record<string, string>>({})
  const [actualInputs, setActualInputs] = useState<Record<string, string>>({})
  const [notes, setNotes] = useState('')
  const completeBatch = useCompleteBatch()
  const { data: warehouses } = useWarehouses()

  if (!batch) return null

  const handleComplete = async () => {
    if (!outputWarehouseId) return toast.error(t('production.outputWarehouse'))

    const outputs = batch.outputs?.map(o => ({
      productId: o.productId,
      actualQty: parseFloat(actualOutputs[o.productId] || '0') || 0,
    })) || []
    const inputs = batch.inputs?.map(i => ({
      productId: i.productId,
      actualQty: parseFloat(actualInputs[i.productId] || String(i.plannedQty)) || Number(i.plannedQty),
    })) || []

    await completeBatch.mutateAsync({
      batchId: batch.id, outputs, inputs, outputWarehouseId,
      notes: notes || undefined,
    })
    onClose()
  }

  const totalInputQty = batch.inputs?.reduce((s, i) => s + (
    parseFloat(actualInputs[i.productId] || String(i.plannedQty)) || Number(i.plannedQty)
  ), 0) || 0
  const totalOutputQty = (batch.outputs || [])
    .filter(o => !o.isWaste)
    .reduce((s, o) => s + (parseFloat(actualOutputs[o.productId] || '0') || 0), 0)
  const lossQty = totalInputQty - totalOutputQty
  const lossPercent = totalInputQty > 0 ? (lossQty / totalInputQty) * 100 : 0

  return (
    <Modal open={open} onClose={onClose}
      title={t('production.completeBatchTitle', { number: batch.batchNumber })} size="lg"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant="success" size="sm" loading={completeBatch.isPending}
            onClick={handleComplete} disabled={!outputWarehouseId}>
            {t('production.completeBtn')}
          </Button>
        </>
      }>
      <div className="space-y-5">
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-text-secondary">{t('production.outputWarehouse')}</label>
          <select value={outputWarehouseId} onChange={e => setOutputWarehouseId(e.target.value)}
            className="h-9 w-full rounded-md text-sm bg-bg-tertiary text-text-primary border border-border-primary px-3 focus:outline-none focus:ring-2 focus:ring-accent-primary/50">
            <option value="">{t('production.selectWarehouse')}</option>
            {warehouses?.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>

        <div>
          <p className="text-sm font-semibold text-text-secondary mb-2">{t('production.rawMaterialActual')}</p>
          <div className="space-y-2">
            {batch.inputs?.map(inp => (
              <div key={inp.productId} className="flex items-center gap-3">
                <span className="text-sm text-text-primary flex-1 truncate">{inp.product?.name}</span>
                <span className="text-xs text-text-muted">{t('production.planned')}: {inp.plannedQty} {inp.unit}</span>
                <input type="number" placeholder={String(inp.plannedQty)}
                  value={actualInputs[inp.productId] || ''}
                  onChange={e => setActualInputs(prev => ({ ...prev, [inp.productId]: e.target.value }))}
                  className="w-24 h-8 rounded-md text-xs bg-bg-tertiary text-text-primary border border-border-primary px-2 focus:outline-none focus:border-accent-primary" />
                <span className="text-xs text-text-muted w-8">{inp.unit}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-text-secondary mb-2">{t('production.finishedProductActual')}</p>
          <div className="space-y-2">
            {batch.outputs?.map(out => (
              <div key={out.productId} className={cn('flex items-center gap-3 p-2 rounded-lg',
                out.isWaste ? 'bg-warning/5' : 'bg-success/5')}>
                <span className={cn('text-sm flex-1 truncate', out.isWaste ? 'text-warning' : 'text-text-primary')}>
                  {out.product?.name}{out.isWaste && ` ${t('production.wasteTag')}`}
                </span>
                <span className="text-xs text-text-muted">{t('production.planned')}: {out.plannedQty} {out.unit}</span>
                <input type="number" placeholder={String(out.plannedQty)}
                  value={actualOutputs[out.productId] || ''}
                  onChange={e => setActualOutputs(prev => ({ ...prev, [out.productId]: e.target.value }))}
                  className="w-24 h-8 rounded-md text-xs bg-bg-secondary text-text-primary border border-border-primary px-2 focus:outline-none focus:border-accent-primary" />
                <span className="text-xs text-text-muted w-8">{out.unit}</span>
              </div>
            ))}
          </div>
        </div>

        {totalInputQty > 0 && totalOutputQty > 0 && (
          <div className={cn('p-3 rounded-lg border',
            lossPercent > 20 ? 'bg-danger/5 border-danger/20' : 'bg-success/5 border-success/20')}>
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">{t('production.totalInput')}</span>
              <span className="tabular-nums">{totalInputQty.toFixed(2)} {t('production.units')}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">{t('production.totalOutput')}</span>
              <span className="tabular-nums">{totalOutputQty.toFixed(2)} {t('production.units')}</span>
            </div>
            <div className="flex justify-between text-sm font-semibold mt-1 pt-1 border-t border-border-primary">
              <span>{t('production.wasteLabel')}</span>
              <span className={cn('tabular-nums', lossPercent > 20 ? 'text-danger' : 'text-success')}>
                {lossQty.toFixed(2)} {t('production.units')} ({lossPercent.toFixed(1)}%)
              </span>
            </div>
          </div>
        )}

        <Input label={t('common.notes')} placeholder="Qo'shimcha ma'lumot..."
          value={notes} onChange={e => setNotes(e.target.value)} />
      </div>
    </Modal>
  )
}

function UnitCostTrendChart() {
  const t = useT()
  const { data: analytics, isLoading } = useProductionAnalytics()

  if (isLoading) {
    return <div className="h-48 bg-bg-tertiary rounded-lg animate-pulse" />
  }

  const chartData = analytics
    ? [...analytics].reverse().slice(-20).map((a: any) => ({
        name: a.batchNumber,
        tannarx: a.unitCost,
        chiqindi: Number(a.wastePercent.toFixed(1)),
        anomaly: a.isAnomaly,
      }))
    : []

  if (!chartData.length) return null

  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props
    if (payload.anomaly) {
      return <circle cx={cx} cy={cy} r={5} fill="#ef4444" stroke="#fff" strokeWidth={2} />
    }
    return <circle cx={cx} cy={cy} r={3} fill="#6366f1" />
  }

  return (
    <Card className="mb-6">
      <div className="flex items-center gap-2 mb-4">
        <BarChart2 size={16} className="text-accent-primary" />
        <h3 className="text-sm font-semibold text-text-primary">{t('production.costTrendTitle')}</h3>
        <span className="text-[11px] text-text-muted ml-auto">{t('production.last20Batches')}</span>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-primary)" />
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
            tickLine={false} axisLine={false} />
          <YAxis yAxisId="cost" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
            tickLine={false} axisLine={false}
            tickFormatter={v => formatNumber(v)} width={70} />
          <YAxis yAxisId="waste" orientation="right" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
            tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} width={40} />
          <Tooltip
            contentStyle={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-primary)', borderRadius: 8, fontSize: 11 }}
            formatter={(value: any, name: string) =>
              name === 'tannarx' ? [`${formatNumber(value)} so'm`, t('production.unitCostLabel')]
                : [`${value}%`, t('production.wasteLabel')]
            } />
          <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
          <Line yAxisId="cost" type="monotone" dataKey="tannarx" stroke="#6366f1"
            strokeWidth={2} dot={<CustomDot />} activeDot={{ r: 5 }} />
          <Line yAxisId="waste" type="monotone" dataKey="chiqindi" stroke="#f59e0b"
            strokeWidth={1.5} strokeDasharray="4 2" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  )
}

export default function ProductionBatchesPage() {
  const t = useT()
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [completeBatch, setCompleteBatch] = useState<ProductionBatch | null>(null)

  const { data, isLoading } = useBatches({
    status: statusFilter !== 'ALL' ? statusFilter : undefined,
  })
  const { data: stats } = useProductionStats()
  const startBatch = useStartBatch()

  const STATUS_CONFIG = {
    PLANNED:     { label: t('production.statusPlanned'),    variant: 'default'  as const },
    IN_PROGRESS: { label: t('production.statusInProgress'), variant: 'primary'  as const },
    COMPLETED:   { label: t('production.statusCompleted'),  variant: 'success'  as const },
    CANCELLED:   { label: t('production.statusCancelled'),  variant: 'danger'   as const },
  }

  const STATUS_TABS = [
    { id: 'ALL',         label: t('common.all') },
    { id: 'PLANNED',     label: t('production.statusPlanned') },
    { id: 'IN_PROGRESS', label: t('production.statusInProgress') },
    { id: 'COMPLETED',   label: t('production.statusCompleted') },
  ]

  const HEADERS = [
    t('production.colNumber'), t('production.colFormula'), t('production.colMultiplier'),
    t('production.colStart'), t('production.colEnd'), t('common.status'), '',
  ]

  return (
    <div>
      <PageHeader
        title={t('production.batchesTitle')}
        description={t('production.batchesDesc')}
        breadcrumbs={[
          { label: t('nav.dashboard'), path: '/dashboard' },
          { label: t('production.moduleName'), path: '/production' },
          { label: t('production.batchesTitle') },
        ]}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard title={t('production.activeBatches')} value={stats?.activeBatches ?? '-'}
          icon={<Clock size={18} />} iconColor="text-accent-primary"
          iconBg="bg-accent-subtle" loading={!stats} />
        <KPICard title={t('production.monthlyBatches')} value={stats?.monthlyBatches ?? '-'}
          icon={<Package size={18} />} iconColor="text-success"
          iconBg="bg-success/10" loading={!stats} />
        <KPICard title={t('production.avgWaste')}
          value={stats ? `${stats.avgWastePercent}%` : '-'}
          icon={<TrendingDown size={18} />}
          iconColor={stats && parseFloat(stats.avgWastePercent) > 15 ? 'text-danger' : 'text-success'}
          iconBg={stats && parseFloat(stats.avgWastePercent) > 15 ? 'bg-danger/10' : 'bg-success/10'}
          loading={!stats} />
        <KPICard title={t('production.anomalies')} value={stats?.anomaliesThisMonth ?? '-'}
          icon={<AlertTriangle size={18} />}
          iconColor={stats?.anomaliesThisMonth ? 'text-danger' : 'text-text-muted'}
          iconBg={stats?.anomaliesThisMonth ? 'bg-danger/10' : 'bg-bg-tertiary'}
          loading={!stats} />
      </div>

      <UnitCostTrendChart />

      <div className="flex flex-wrap gap-2 mb-4">
        {STATUS_TABS.map(tab => (
          <button key={tab.id} onClick={() => setStatusFilter(tab.id)}
            className={cn('px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
              statusFilter === tab.id
                ? 'border-accent-primary bg-accent-subtle text-accent-primary'
                : 'border-border-primary text-text-secondary hover:border-border-secondary')}>
            {tab.label}
          </button>
        ))}
      </div>

      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-primary">
                {HEADERS.map((h, i) => (
                  <th key={i} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} cols={7} />)
              ) : !data?.data?.length ? (
                <tr>
                  <td colSpan={7}>
                    <EmptyState icon={<Package size={28} />} title={t('production.batchesNotFound')}
                      description={t('production.batchesNotFoundDesc')} />
                  </td>
                </tr>
              ) : (
                data.data.map((batch: ProductionBatch) => {
                  const cfg = STATUS_CONFIG[batch.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.PLANNED
                  return (
                    <tr key={batch.id}
                      onClick={() => navigate(`/production/batches/${batch.id}`)}
                      className="border-b border-border-primary hover:bg-bg-tertiary/50 transition-colors group cursor-pointer">
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono text-accent-primary">{batch.batchNumber}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-text-primary">{batch.formula?.name}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm tabular-nums text-text-secondary">
                          ×{batch.inputMultiplier}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {batch.actualStart ? formatDate(batch.actualStart, 'short')
                          : batch.plannedStart ? formatDate(batch.plannedStart, 'short') : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {batch.actualEnd ? formatDate(batch.actualEnd, 'short')
                          : batch.plannedEnd ? formatDate(batch.plannedEnd, 'short') : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={cfg.variant} size="sm">{cfg.label}</Badge>
                      </td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {batch.status === 'PLANNED' && (
                            <Button variant="primary" size="xs" leftIcon={<Play size={11} />}
                              onClick={() => startBatch.mutate(batch.id)} loading={startBatch.isPending}>
                              {t('production.startBtn')}
                            </Button>
                          )}
                          {batch.status === 'IN_PROGRESS' && (
                            <Button variant="success" size="xs" leftIcon={<CheckSquare size={11} />}
                              onClick={() => setCompleteBatch(batch)}>
                              {t('production.completeBtn')}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <CompleteBatchModal batch={completeBatch} open={!!completeBatch}
        onClose={() => setCompleteBatch(null)} />
    </div>
  )
}
