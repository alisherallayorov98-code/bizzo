import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Play, CheckSquare, Edit2, Plus,
  TrendingDown, AlertTriangle, CheckCircle2, DollarSign,
  Package, Clock, Wrench,
} from 'lucide-react'
import { PageHeader }    from '@components/layout/PageHeader/PageHeader'
import { Button }        from '@components/ui/Button/Button'
import { Card }          from '@components/ui/Card/Card'
import { Badge }         from '@components/ui/Badge/Badge'
import { Modal }         from '@components/ui/Modal/Modal'
import { Input }         from '@components/ui/Input/Input'
import { Skeleton }      from '@components/ui/Skeleton/Skeleton'
import {
  useBatch, useStartBatch, useCompleteBatch, useUpdateBatch, useAddOverhead,
} from '@features/production/hooks/useProduction'
import { useWarehouses } from '@features/warehouse/hooks/useWarehouse'
import { useQuery }      from '@tanstack/react-query'
import { settingsService } from '@services/settings.service'
import { formatCurrency, formatDate, formatDateTime } from '@utils/formatters'
import { cn } from '@utils/cn'
import type { ProductionBatch } from '@services/production.service'

// ============================================
// STATUS BADGE
// ============================================
function StatusBadge({ status }: { status: string }) {
  const MAP: Record<string, any> = {
    PLANNED:     { label: 'Rejalashtirilgan', variant: 'default' },
    IN_PROGRESS: { label: 'Jarayonda',        variant: 'info' },
    COMPLETED:   { label: 'Yakunlangan',      variant: 'success' },
    CANCELLED:   { label: 'Bekor qilingan',   variant: 'danger' },
  }
  const m = MAP[status] ?? { label: status, variant: 'default' }
  return <Badge variant={m.variant} size="md">{m.label}</Badge>
}

// ============================================
// PROGRESS BAR
// ============================================
function ProgressBar({ value, max, color = 'bg-accent-primary' }: {
  value: number; max: number; color?: string
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className="h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
      <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
    </div>
  )
}

// ============================================
// OVERHEAD MODAL
// ============================================
function OverheadModal({ batchId, open, onClose }: {
  batchId: string; open: boolean; onClose: () => void
}) {
  const addOverhead = useAddOverhead()
  const [amount,      setAmount]      = useState('')
  const [description, setDescription] = useState('')
  const PRESETS = [
    { label: 'Mehnat haqi', amount: '' },
    { label: 'Elektr energiyasi', amount: '' },
    { label: 'Ijara',       amount: '' },
    { label: 'Transport',   amount: '' },
  ]

  function handleAdd() {
    if (!amount || !description) return
    addOverhead.mutate({ id: batchId, amount: Number(amount), description }, {
      onSuccess: () => { onClose(); setAmount(''); setDescription('') },
    })
  }

  return (
    <Modal open={open} onClose={onClose} title="Qo'shimcha xarajat qo'shish" size="sm">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {PRESETS.map(p => (
            <button
              key={p.label}
              onClick={() => setDescription(p.label)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs border transition-all',
                description === p.label
                  ? 'bg-accent-primary text-white border-accent-primary'
                  : 'border-border-primary text-text-secondary hover:bg-bg-tertiary',
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        <Input
          label="Xarajat turi"
          placeholder="Masalan: Mehnat haqi, Elektr..."
          value={description}
          onChange={e => setDescription(e.target.value)}
        />
        <Input
          type="number"
          label="Summa (so'm)"
          placeholder="0"
          value={amount}
          onChange={e => setAmount(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Bekor</Button>
          <Button
            variant="primary"
            leftIcon={<Plus size={14} />}
            onClick={handleAdd}
            disabled={!amount || !description || addOverhead.isPending}
          >
            Qo'shish
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ============================================
// EDIT BATCH MODAL
// ============================================
function EditBatchModal({ batch, open, onClose }: {
  batch: ProductionBatch; open: boolean; onClose: () => void
}) {
  const updateBatch = useUpdateBatch()
  const { data: warehouses } = useWarehouses()
  const { data: users }      = useQuery({
    queryKey: ['settings', 'users'],
    queryFn:  settingsService.getUsers,
    staleTime: 60_000,
  })

  const [multiplier,  setMultiplier]  = useState(String(batch.inputMultiplier))
  const [warehouseId, setWarehouseId] = useState(batch.warehouseId ?? '')
  const [operatorId,  setOperatorId]  = useState(batch.operatorId ?? '')
  const [plannedStart, setPlannedStart] = useState(
    batch.plannedStart ? batch.plannedStart.slice(0, 16) : ''
  )
  const [plannedEnd, setPlannedEnd] = useState(
    batch.plannedEnd ? batch.plannedEnd.slice(0, 16) : ''
  )
  const [notes, setNotes] = useState(batch.notes ?? '')

  function handleSave() {
    updateBatch.mutate({
      id:             batch.id,
      inputMultiplier: parseFloat(multiplier) || 1,
      warehouseId:    warehouseId || undefined,
      operatorId:     operatorId  || undefined,
      plannedStart:   plannedStart || undefined,
      plannedEnd:     plannedEnd   || undefined,
      notes:          notes || undefined,
    }, { onSuccess: onClose })
  }

  return (
    <Modal open={open} onClose={onClose} title="Partiyani tahrirlash" size="md">
      <div className="space-y-4">
        <Input
          type="number"
          label="Multiplier (ko'paytiruvchi)"
          value={multiplier}
          onChange={e => setMultiplier(e.target.value)}
          disabled={batch.status !== 'PLANNED'}
        />
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1.5">Omborxona</label>
          <select
            value={warehouseId}
            onChange={e => setWarehouseId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border-primary bg-bg-secondary text-sm text-text-primary focus:outline-none focus:border-accent-primary"
          >
            <option value="">Tanlang</option>
            {warehouses?.map((w: any) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1.5">Operator</label>
          <select
            value={operatorId}
            onChange={e => setOperatorId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border-primary bg-bg-secondary text-sm text-text-primary focus:outline-none focus:border-accent-primary"
          >
            <option value="">Tayinlanmagan</option>
            {Array.isArray(users) && users.map((u: any) => (
              <option key={u.id} value={u.id}>
                {u.firstName} {u.lastName}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input
            type="datetime-local"
            label="Boshlanish (reja)"
            value={plannedStart}
            onChange={e => setPlannedStart(e.target.value)}
          />
          <Input
            type="datetime-local"
            label="Tugash (reja)"
            value={plannedEnd}
            onChange={e => setPlannedEnd(e.target.value)}
          />
        </div>
        <Input
          label="Izoh"
          placeholder="Qo'shimcha ma'lumot..."
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Bekor</Button>
          <Button variant="primary" onClick={handleSave} disabled={updateBatch.isPending}>
            Saqlash
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ============================================
// COMPLETE BATCH MODAL
// ============================================
function CompleteBatchModal({ batch, open, onClose }: {
  batch: ProductionBatch; open: boolean; onClose: () => void
}) {
  const completeBatch = useCompleteBatch()
  const { data: warehouses } = useWarehouses()
  const [outputWarehouseId, setOutputWarehouseId] = useState('')
  const [actualOutputs, setActualOutputs] = useState<Record<string, string>>({})
  const [actualInputs,  setActualInputs]  = useState<Record<string, string>>({})
  const [notes, setNotes] = useState('')

  const handleComplete = () => {
    if (!outputWarehouseId) return
    completeBatch.mutate({
      batchId: batch.id,
      outputs: (batch.outputs || []).map(o => ({
        productId: o.productId,
        actualQty: parseFloat(actualOutputs[o.productId] || '0') || 0,
      })),
      inputs: (batch.inputs || []).map(i => ({
        productId: i.productId,
        actualQty: parseFloat(actualInputs[i.productId] || String(i.plannedQty)) || Number(i.plannedQty),
      })),
      outputWarehouseId,
      notes: notes || undefined,
    }, { onSuccess: onClose })
  }

  return (
    <Modal open={open} onClose={onClose} title="Partiyani yakunlash" size="md">
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1.5">
            Tayyor mahsulot ombori <span className="text-danger">*</span>
          </label>
          <select
            value={outputWarehouseId}
            onChange={e => setOutputWarehouseId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border-primary bg-bg-secondary text-sm text-text-primary focus:outline-none focus:border-accent-primary"
          >
            <option value="">Tanlang</option>
            {warehouses?.map((w: any) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </div>

        {batch.inputs && batch.inputs.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
              Actual xomashyo sarfi
            </p>
            <div className="space-y-2">
              {batch.inputs.map(inp => (
                <div key={inp.productId} className="flex items-center gap-3">
                  <span className="flex-1 text-sm text-text-secondary">{inp.product?.name}</span>
                  <span className="text-xs text-text-muted">Reja: {inp.plannedQty} {inp.unit}</span>
                  <input
                    type="number"
                    placeholder={String(inp.plannedQty)}
                    value={actualInputs[inp.productId] || ''}
                    onChange={e => setActualInputs(p => ({ ...p, [inp.productId]: e.target.value }))}
                    className="w-24 h-8 rounded-md text-xs bg-bg-tertiary border border-border-primary px-2 text-text-primary focus:outline-none focus:border-accent-primary"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {batch.outputs && batch.outputs.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
              Actual mahsulot
            </p>
            <div className="space-y-2">
              {batch.outputs.map(out => (
                <div key={out.productId} className="flex items-center gap-3">
                  <span className="flex-1 text-sm text-text-secondary">
                    {out.product?.name}
                    {out.isWaste && <span className="ml-1 text-xs text-danger">(chiqindi)</span>}
                  </span>
                  <span className="text-xs text-text-muted">Reja: {out.plannedQty} {out.unit}</span>
                  <input
                    type="number"
                    placeholder={String(out.plannedQty)}
                    value={actualOutputs[out.productId] || ''}
                    onChange={e => setActualOutputs(p => ({ ...p, [out.productId]: e.target.value }))}
                    className="w-24 h-8 rounded-md text-xs bg-bg-tertiary border border-border-primary px-2 text-text-primary focus:outline-none focus:border-accent-primary"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <Input
          label="Izoh (ixtiyoriy)"
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Bekor</Button>
          <Button
            variant="success"
            leftIcon={<CheckSquare size={14} />}
            onClick={handleComplete}
            disabled={!outputWarehouseId || completeBatch.isPending}
          >
            Yakunlash
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ============================================
// ASOSIY SAHIFA
// ============================================
export default function ProductionBatchDetailPage() {
  const { id }   = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: batch, isLoading } = useBatch(id!)
  const startBatch = useStartBatch()

  const [editModal,     setEditModal]     = useState(false)
  const [overheadModal, setOverheadModal] = useState(false)
  const [completeModal, setCompleteModal] = useState(false)

  if (isLoading) return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-64 rounded" />
      <div className="grid grid-cols-3 gap-4">
        {[1,2,3].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
      </div>
    </div>
  )

  if (!batch) return (
    <div className="text-center py-20 text-text-muted">Partiya topilmadi</div>
  )

  const isPlanned    = batch.status === 'PLANNED'
  const isInProgress = batch.status === 'IN_PROGRESS'
  const isCompleted  = batch.status === 'COMPLETED'

  const totalInputCost  = batch.analytic?.totalInputCost ?? 0
  const overheadCost    = batch.overheadCost ?? 0
  const totalCost       = totalInputCost + overheadCost
  const plannedCost     = batch.plannedCost ?? 0
  const unitCost        = batch.analytic?.unitCost ?? 0
  const wastePercent    = batch.analytic?.wastePercent ?? 0
  const isAnomaly       = batch.analytic?.isAnomaly ?? false

  const costVariance    = isCompleted && plannedCost > 0
    ? ((totalCost - plannedCost) / plannedCost) * 100
    : null

  return (
    <div className="space-y-5">
      <PageHeader
        title={batch.batchNumber}
        description={`${batch.formula?.name ?? '—'} • ${batch.formula?.type ?? ''}`}
        breadcrumbs={[
          { label: 'Bosh sahifa',    path: '/dashboard' },
          { label: 'Ishlab chiqarish', path: '/production' },
          { label: 'Partiyalar',     path: '/production/batches' },
          { label: batch.batchNumber },
        ]}
        actions={
          <div className="flex gap-2 flex-wrap">
            <Button variant="secondary" leftIcon={<ArrowLeft size={15} />} onClick={() => navigate(-1)}>
              Orqaga
            </Button>
            {!isCompleted && (
              <Button variant="secondary" leftIcon={<Edit2 size={15} />} onClick={() => setEditModal(true)}>
                Tahrirlash
              </Button>
            )}
            {!isCompleted && (
              <Button
                variant="secondary"
                leftIcon={<Wrench size={15} />}
                onClick={() => setOverheadModal(true)}
              >
                Xarajat
              </Button>
            )}
            {isPlanned && (
              <Button
                variant="primary"
                leftIcon={<Play size={15} />}
                onClick={() => startBatch.mutate(batch.id)}
                disabled={startBatch.isPending}
              >
                Boshlash
              </Button>
            )}
            {isInProgress && (
              <Button
                variant="success"
                leftIcon={<CheckSquare size={15} />}
                onClick={() => setCompleteModal(true)}
              >
                Yakunlash
              </Button>
            )}
          </div>
        }
      />

      {/* Status + anomaly banner */}
      <div className="flex items-center gap-3 flex-wrap">
        <StatusBadge status={batch.status} />
        {isAnomaly && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-danger/10 border border-danger/30">
            <AlertTriangle size={14} className="text-danger" />
            <span className="text-xs text-danger font-medium">Anomaliya aniqlandi — yo'qotish normadan yuqori</span>
          </div>
        )}
        {isCompleted && !isAnomaly && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-success/10 border border-success/30">
            <CheckCircle2 size={14} className="text-success" />
            <span className="text-xs text-success font-medium">Muvaffaqiyatli yakunlandi</span>
          </div>
        )}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card padding="md">
          <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Xomashyo narxi</p>
          <p className="text-xl font-bold text-text-primary">{formatCurrency(totalInputCost)}</p>
          {plannedCost > 0 && (
            <p className="text-xs text-text-muted mt-0.5">Reja: {formatCurrency(plannedCost)}</p>
          )}
        </Card>
        <Card padding="md">
          <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Qo'shimcha xarajat</p>
          <p className="text-xl font-bold text-warning">{formatCurrency(overheadCost)}</p>
          <p className="text-xs text-text-muted mt-0.5">Jami: {formatCurrency(totalCost)}</p>
        </Card>
        <Card padding="md">
          <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Tannarx (1 birlik)</p>
          <p className={cn('text-xl font-bold', isCompleted ? 'text-text-primary' : 'text-text-muted')}>
            {isCompleted ? formatCurrency(unitCost) : '—'}
          </p>
          {isCompleted && <p className="text-xs text-text-muted mt-0.5">Tayyor mahsulot</p>}
        </Card>
        <Card padding="md">
          <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Yo'qotish</p>
          <p className={cn(
            'text-xl font-bold',
            isCompleted ? (isAnomaly ? 'text-danger' : 'text-success') : 'text-text-muted',
          )}>
            {isCompleted ? `${wastePercent.toFixed(1)}%` : '—'}
          </p>
          {costVariance !== null && (
            <p className={cn('text-xs mt-0.5', costVariance > 0 ? 'text-danger' : 'text-success')}>
              Xarajat: {costVariance > 0 ? '+' : ''}{costVariance.toFixed(1)}% (reja)
            </p>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* LEFT: Info */}
        <div className="space-y-4">
          <Card padding="md">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">
              Partiya ma'lumotlari
            </h3>
            <dl className="space-y-2.5">
              {[
                { label: 'Retsept',        value: batch.formula?.name ?? '—' },
                { label: 'Multiplier',     value: `×${batch.inputMultiplier}` },
                { label: 'Holat',          value: batch.status },
                { label: 'Yaratildi',      value: formatDate(batch.createdAt) },
                ...(batch.plannedStart ? [{ label: 'Reja boshlanish', value: formatDateTime(batch.plannedStart) }] : []),
                ...(batch.plannedEnd   ? [{ label: 'Reja tugash',     value: formatDateTime(batch.plannedEnd) }]   : []),
                ...(batch.actualStart  ? [{ label: 'Actual boshlanish', value: formatDateTime(batch.actualStart) }] : []),
                ...(batch.actualEnd    ? [{ label: 'Actual tugash',   value: formatDateTime(batch.actualEnd) }]   : []),
                ...(batch.notes        ? [{ label: 'Izoh',            value: batch.notes }]                        : []),
              ].map(row => (
                <div key={row.label}>
                  <dt className="text-[10px] text-text-muted uppercase tracking-wider">{row.label}</dt>
                  <dd className="text-sm text-text-primary font-medium">{row.value}</dd>
                </div>
              ))}
            </dl>
          </Card>

          {/* Tannarx tarkibi */}
          {isCompleted && (
            <Card padding="md">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">
                Tannarx tarkibi
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Xomashyo</span>
                  <span className="font-semibold text-text-primary tabular-nums">
                    {formatCurrency(totalInputCost)}
                  </span>
                </div>
                {overheadCost > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-text-secondary">Overhead</span>
                    <span className="font-semibold text-warning tabular-nums">
                      {formatCurrency(overheadCost)}
                    </span>
                  </div>
                )}
                <div className="border-t border-border-primary pt-2 flex justify-between">
                  <span className="text-sm font-bold text-text-primary">Jami tannarx</span>
                  <span className="text-sm font-bold text-accent-primary tabular-nums">
                    {formatCurrency(totalCost)}
                  </span>
                </div>
                {unitCost > 0 && (
                  <div className="p-2 rounded-lg bg-accent-primary/5 border border-accent-primary/20 text-center">
                    <p className="text-[10px] text-text-muted">1 birlik tannarxi</p>
                    <p className="text-lg font-bold text-accent-primary">{formatCurrency(unitCost)}</p>
                  </div>
                )}
                {costVariance !== null && (
                  <div className={cn(
                    'p-2 rounded-lg border text-center',
                    costVariance > 0
                      ? 'bg-danger/5 border-danger/20'
                      : 'bg-success/5 border-success/20',
                  )}>
                    <p className="text-[10px] text-text-muted">Rejalashtirilgandan farq</p>
                    <p className={cn('text-base font-bold', costVariance > 0 ? 'text-danger' : 'text-success')}>
                      {costVariance > 0 ? '+' : ''}{costVariance.toFixed(1)}%
                    </p>
                    <p className="text-xs text-text-muted">
                      Reja: {formatCurrency(plannedCost)} | Actual: {formatCurrency(totalCost)}
                    </p>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>

        {/* RIGHT: Inputs + Outputs */}
        <div className="lg:col-span-2 space-y-4">

          {/* Inputs */}
          <Card padding="md">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">
              Xomashyo (Kirish) — {batch.inputs?.length ?? 0} ta mahsulot
            </h3>
            <div className="space-y-3">
              {batch.inputs?.map(inp => {
                const actual  = Number(inp.actualQty)
                const planned = Number(inp.plannedQty)
                const diff    = actual > 0 ? actual - planned : 0
                const diffPct = planned > 0 && actual > 0 ? (diff / planned) * 100 : 0
                return (
                  <div key={inp.id} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Package size={13} className="text-text-muted" />
                        <span className="text-sm font-medium text-text-primary">
                          {inp.product?.name}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-text-primary tabular-nums">
                          {isCompleted ? `${actual} ${inp.unit}` : `${planned} ${inp.unit} (reja)`}
                        </p>
                        {isCompleted && inp.totalCost > 0 && (
                          <p className="text-xs text-text-muted">{formatCurrency(inp.totalCost)}</p>
                        )}
                      </div>
                    </div>
                    {isCompleted && planned > 0 && (
                      <div className="flex items-center gap-2">
                        <ProgressBar
                          value={actual}
                          max={planned}
                          color={diffPct > 5 ? 'bg-danger' : diffPct < -5 ? 'bg-warning' : 'bg-success'}
                        />
                        <span className={cn(
                          'text-[10px] font-medium whitespace-nowrap',
                          Math.abs(diffPct) > 5 ? (diffPct > 0 ? 'text-danger' : 'text-warning') : 'text-success',
                        )}>
                          {diffPct > 0 ? '+' : ''}{diffPct.toFixed(1)}%
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </Card>

          {/* Outputs */}
          <Card padding="md">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">
              Tayyor mahsulot (Chiqish) — {batch.outputs?.length ?? 0} ta
            </h3>
            <div className="space-y-3">
              {batch.outputs?.map(out => {
                const actual  = Number(out.actualQty)
                const planned = Number(out.plannedQty)
                const eff     = planned > 0 && actual > 0 ? (actual / planned) * 100 : 0
                return (
                  <div key={out.id} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {out.isWaste ? (
                          <TrendingDown size={13} className="text-danger" />
                        ) : (
                          <CheckCircle2 size={13} className="text-success" />
                        )}
                        <span className="text-sm font-medium text-text-primary">
                          {out.product?.name}
                        </span>
                        {out.isMainProduct && (
                          <Badge variant="success" size="sm">Asosiy</Badge>
                        )}
                        {out.isWaste && (
                          <Badge variant="danger" size="sm">Chiqindi</Badge>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-text-primary tabular-nums">
                          {isCompleted ? `${actual} ${out.unit}` : `${planned} ${out.unit} (reja)`}
                        </p>
                        {isCompleted && planned > 0 && (
                          <p className={cn(
                            'text-[10px]',
                            out.isWaste ? 'text-danger' : eff >= 90 ? 'text-success' : 'text-warning',
                          )}>
                            {eff.toFixed(1)}% samaradorlik
                          </p>
                        )}
                      </div>
                    </div>
                    {isCompleted && planned > 0 && !out.isWaste && (
                      <ProgressBar
                        value={actual}
                        max={planned}
                        color={eff >= 90 ? 'bg-success' : eff >= 70 ? 'bg-warning' : 'bg-danger'}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </Card>
        </div>
      </div>

      {/* Modals */}
      {batch && <EditBatchModal batch={batch} open={editModal} onClose={() => setEditModal(false)} />}
      <OverheadModal batchId={batch.id} open={overheadModal} onClose={() => setOverheadModal(false)} />
      {batch && (
        <CompleteBatchModal
          batch={batch}
          open={completeModal}
          onClose={() => setCompleteModal(false)}
        />
      )}
    </div>
  )
}
