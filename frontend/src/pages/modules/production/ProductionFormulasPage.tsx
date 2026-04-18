import { useState, useEffect } from 'react'
import {
  Plus, FlaskConical, ArrowDown, Recycle, Split, Wrench, Sparkles,
  Play, Trash2, CheckCircle2, Edit2, AlertTriangle, Calculator,
} from 'lucide-react'
import { PageHeader } from '@components/layout/PageHeader/PageHeader'
import { Card } from '@components/ui/Card/Card'
import { Button } from '@components/ui/Button/Button'
import { Badge } from '@components/ui/Badge/Badge'
import { Modal } from '@components/ui/Modal/Modal'
import { Input } from '@components/ui/Input/Input'
import { EmptyState } from '@components/ui/EmptyState/EmptyState'
import {
  useFormulas, useCreateFormula, useUpdateFormula, useDeleteFormula,
  useCreateBatch, useCostEstimate,
} from '@features/production/hooks/useProduction'
import { useProducts } from '@features/products/hooks/useProducts'
import { useWarehouses } from '@features/warehouse/hooks/useWarehouse'
import type { ProductionFormula } from '@services/production.service'
import { useT } from '@i18n/index'
import { cn } from '@utils/cn'
import { formatNumber } from '@utils/formatters'
import toast from 'react-hot-toast'

const PRODUCTION_TYPES = [
  { value: 'CONVERSION',  labelKey: 'production.typeConversion',  Icon: Recycle,  descKey: 'production.typeConversionDesc',  variant: 'primary'  as const },
  { value: 'DISASSEMBLY', labelKey: 'production.typeDisassembly', Icon: Split,    descKey: 'production.typeDisassemblyDesc', variant: 'warning'  as const },
  { value: 'ASSEMBLY',    labelKey: 'production.typeAssembly',    Icon: Wrench,   descKey: 'production.typeAssemblyDesc',    variant: 'success'  as const },
  { value: 'PROCESSING',  labelKey: 'production.typeProcessing',  Icon: Sparkles, descKey: 'production.typeProcessingDesc',  variant: 'info'     as const },
]

type FormulaInput  = { productId: string; quantity: string; unit: string }
type FormulaOutput = { productId: string; quantity: string; unit: string; isMainProduct: boolean; isWaste: boolean; lossPercent: string }

function FormulaIngredients({
  t, inputs, outputs, products,
  setInputs, setOutputs,
}: {
  t: any; inputs: FormulaInput[]; outputs: FormulaOutput[]
  products: any[]
  setInputs: React.Dispatch<React.SetStateAction<FormulaInput[]>>
  setOutputs: React.Dispatch<React.SetStateAction<FormulaOutput[]>>
}) {
  const addInput  = () => setInputs(p  => [...p,  { productId: '', quantity: '', unit: 'kg' }])
  const addOutput = () => setOutputs(p => [...p,  { productId: '', quantity: '', unit: 'kg', isMainProduct: false, isWaste: false, lossPercent: '' }])

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-semibold text-text-primary">{t('production.rawMaterialInput')}</label>
          <Button variant="ghost" size="xs" leftIcon={<Plus size={11} />} onClick={addInput}>{t('sales.addItem')}</Button>
        </div>
        <div className="space-y-2">
          {inputs.map((inp, i) => (
            <div key={i} className="flex gap-2 items-center">
              <select value={inp.productId}
                onChange={e => setInputs(p => p.map((it, idx) => idx === i ? { ...it, productId: e.target.value } : it))}
                className="flex-1 h-8 rounded-md text-xs bg-bg-tertiary text-text-primary border border-border-primary px-2 focus:outline-none focus:border-accent-primary">
                <option value="">{t('production.selectProduct')}</option>
                {products.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <input type="number" placeholder={t('sales.quantityPlaceholder')} value={inp.quantity}
                onChange={e => setInputs(p => p.map((it, idx) => idx === i ? { ...it, quantity: e.target.value } : it))}
                className="w-20 h-8 rounded-md text-xs bg-bg-tertiary text-text-primary border border-border-primary px-2 focus:outline-none focus:border-accent-primary" />
              <input placeholder={t('production.units')} value={inp.unit}
                onChange={e => setInputs(p => p.map((it, idx) => idx === i ? { ...it, unit: e.target.value } : it))}
                className="w-16 h-8 rounded-md text-xs bg-bg-tertiary text-text-primary border border-border-primary px-2 focus:outline-none focus:border-accent-primary" />
              {inputs.length > 1 && (
                <button onClick={() => setInputs(p => p.filter((_, idx) => idx !== i))} className="text-text-muted hover:text-danger">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-center">
        <div className="flex flex-col items-center gap-1 text-accent-primary">
          <ArrowDown size={20} />
          <span className="text-xs font-medium">{t('production.productionStep')}</span>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-semibold text-text-primary">{t('production.finishedOutput')}</label>
          <Button variant="ghost" size="xs" leftIcon={<Plus size={11} />} onClick={addOutput}>{t('sales.addItem')}</Button>
        </div>
        <div className="space-y-2">
          {outputs.map((out, i) => (
            <div key={i} className={cn('flex gap-2 items-center p-2 rounded-lg',
              out.isWaste ? 'bg-danger/5 border border-danger/20'
                : out.isMainProduct ? 'bg-success/5 border border-success/20'
                  : 'bg-bg-tertiary border border-border-primary')}>
              <select value={out.productId}
                onChange={e => setOutputs(p => p.map((it, idx) => idx === i ? { ...it, productId: e.target.value } : it))}
                className="flex-1 h-8 rounded-md text-xs bg-bg-secondary text-text-primary border border-border-primary px-2 focus:outline-none focus:border-accent-primary">
                <option value="">{t('production.selectProduct')}</option>
                {products.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <input type="number" placeholder={t('sales.quantityPlaceholder')} value={out.quantity}
                onChange={e => setOutputs(p => p.map((it, idx) => idx === i ? { ...it, quantity: e.target.value } : it))}
                className="w-20 h-8 rounded-md text-xs bg-bg-secondary text-text-primary border border-border-primary px-2 focus:outline-none" />
              <input placeholder={t('production.units')} value={out.unit}
                onChange={e => setOutputs(p => p.map((it, idx) => idx === i ? { ...it, unit: e.target.value } : it))}
                className="w-14 h-8 rounded-md text-xs bg-bg-secondary text-text-primary border border-border-primary px-2 focus:outline-none" />
              <div className="flex gap-1">
                <button onClick={() => setOutputs(p => p.map((it, idx) =>
                  idx === i ? { ...it, isMainProduct: !it.isMainProduct, isWaste: false } : it))}
                  className={cn('text-[10px] px-2 h-8 rounded-md border transition-all whitespace-nowrap',
                    out.isMainProduct ? 'bg-success/10 border-success text-success'
                      : 'border-border-primary text-text-muted hover:border-border-secondary')}>
                  {t('production.mainProduct')}
                </button>
                <button onClick={() => setOutputs(p => p.map((it, idx) =>
                  idx === i ? { ...it, isWaste: !it.isWaste, isMainProduct: false } : it))}
                  className={cn('text-[10px] px-2 h-8 rounded-md border transition-all',
                    out.isWaste ? 'bg-danger/10 border-danger text-danger'
                      : 'border-border-primary text-text-muted hover:border-border-secondary')}>
                  {t('production.wasteProduct')}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function NewFormulaModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT()
  const [step, setStep] = useState(1)
  const [type, setType] = useState('CONVERSION')
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [inputs, setInputs]   = useState<FormulaInput[]>([{ productId: '', quantity: '', unit: 'kg' }])
  const [outputs, setOutputs] = useState<FormulaOutput[]>([
    { productId: '', quantity: '', unit: 'kg', isMainProduct: true,  isWaste: false, lossPercent: '' },
    { productId: '', quantity: '', unit: 'kg', isMainProduct: false, isWaste: true,  lossPercent: '10' },
  ])

  const createFormula = useCreateFormula()
  const { data: productsData } = useProducts({ limit: 200 })
  const products = productsData?.data || []

  const reset = () => {
    setStep(1); setName(''); setDesc(''); setType('CONVERSION')
    setInputs([{ productId: '', quantity: '', unit: 'kg' }])
    setOutputs([
      { productId: '', quantity: '', unit: 'kg', isMainProduct: true,  isWaste: false, lossPercent: '' },
      { productId: '', quantity: '', unit: 'kg', isMainProduct: false, isWaste: true,  lossPercent: '10' },
    ])
  }

  const handleSubmit = async () => {
    if (!name) return toast.error(t('production.formulaNameLabel'))
    const validInputs  = inputs.filter(i => i.productId && i.quantity)
    const validOutputs = outputs.filter(o => o.productId && o.quantity)
    if (!validInputs.length || !validOutputs.length) return

    await createFormula.mutateAsync({
      name, type, description: desc || undefined,
      inputs:  validInputs.map(i => ({ productId: i.productId, quantity: parseFloat(i.quantity), unit: i.unit })),
      outputs: validOutputs.map(o => ({
        productId: o.productId, quantity: parseFloat(o.quantity), unit: o.unit,
        isMainProduct: o.isMainProduct, isWaste: o.isWaste, lossPercent: parseFloat(o.lossPercent) || 0,
      })),
    })
    onClose(); reset()
  }

  return (
    <Modal open={open} onClose={() => { onClose(); reset() }}
      title={step === 1 ? t('production.newFormulaStep1') : t('production.newFormulaStep2')}
      size="lg"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={step === 1 ? onClose : () => setStep(1)}>
            {step === 1 ? t('common.cancel') : t('common.back')}
          </Button>
          {step === 1 ? (
            <Button variant="primary" size="sm" disabled={!name || !type} onClick={() => setStep(2)}>
              {t('production.continueBtn')}
            </Button>
          ) : (
            <Button variant="primary" size="sm" loading={createFormula.isPending} onClick={handleSubmit}>
              {t('common.create')}
            </Button>
          )}
        </>
      }
    >
      {step === 1 ? (
        <div className="space-y-4">
          <Input label={t('production.formulaNameLabel')} placeholder={t('production.formulaNamePh')}
            value={name} onChange={e => setName(e.target.value)} autoFocus />
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-secondary">{t('production.productionType')}</label>
            <div className="grid grid-cols-2 gap-2">
              {PRODUCTION_TYPES.map(pt => {
                const Icon = pt.Icon
                return (
                  <button key={pt.value} type="button" onClick={() => setType(pt.value)}
                    className={cn(
                      'flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all',
                      type === pt.value ? 'border-accent-primary bg-accent-subtle'
                        : 'border-border-primary hover:border-border-secondary',
                    )}>
                    <Icon size={18} className={cn('shrink-0 mt-0.5',
                      type === pt.value ? 'text-accent-primary' : 'text-text-muted')} />
                    <div>
                      <p className={cn('text-xs font-semibold', type === pt.value ? 'text-accent-primary' : 'text-text-primary')}>
                        {t(pt.labelKey)}
                      </p>
                      <p className="text-[10px] text-text-muted">{t(pt.descKey)}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
          <Input label={t('production.formulaDescLabel')} placeholder={t('production.formulaDescPh')}
            value={desc} onChange={e => setDesc(e.target.value)} />
        </div>
      ) : (
        <FormulaIngredients t={t} inputs={inputs} outputs={outputs}
          products={products} setInputs={setInputs} setOutputs={setOutputs} />
      )}
    </Modal>
  )
}

function EditFormulaModal({ formula, open, onClose }: {
  formula: ProductionFormula | null; open: boolean; onClose: () => void
}) {
  const t = useT()
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [inputs, setInputs]   = useState<FormulaInput[]>([])
  const [outputs, setOutputs] = useState<FormulaOutput[]>([])

  const updateFormula = useUpdateFormula()
  const { data: productsData } = useProducts({ limit: 200 })
  const products = productsData?.data || []

  useEffect(() => {
    if (!formula) return
    setName(formula.name)
    setDesc(formula.description || '')
    setInputs(formula.inputs.map(i => ({
      productId: i.productId,
      quantity:  String(i.quantity),
      unit:      i.unit,
    })))
    setOutputs(formula.outputs.map(o => ({
      productId:     o.productId,
      quantity:      String(o.quantity),
      unit:          o.unit,
      isMainProduct: o.isMainProduct,
      isWaste:       o.isWaste,
      lossPercent:   String(o.lossPercent || ''),
    })))
  }, [formula?.id])

  if (!formula) return null

  const handleSubmit = async () => {
    if (!name) return toast.error(t('production.formulaNameLabel'))
    const validInputs  = inputs.filter(i => i.productId && i.quantity)
    const validOutputs = outputs.filter(o => o.productId && o.quantity)
    if (!validInputs.length || !validOutputs.length) return

    await updateFormula.mutateAsync({
      id: formula.id,
      name, description: desc || undefined,
      inputs:  validInputs.map(i => ({ productId: i.productId, quantity: parseFloat(i.quantity), unit: i.unit })),
      outputs: validOutputs.map(o => ({
        productId: o.productId, quantity: parseFloat(o.quantity), unit: o.unit,
        isMainProduct: o.isMainProduct, isWaste: o.isWaste, lossPercent: parseFloat(o.lossPercent) || 0,
      })),
    })
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose}
      title={t('production.editFormula', { name: formula.name })} size="lg"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant="primary" size="sm" loading={updateFormula.isPending} onClick={handleSubmit}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input label={t('production.formulaNameLabel')} value={name}
          onChange={e => setName(e.target.value)} autoFocus />
        <Input label={t('production.formulaDescLabel')} value={desc}
          onChange={e => setDesc(e.target.value)} />
        <FormulaIngredients t={t} inputs={inputs} outputs={outputs}
          products={products} setInputs={setInputs} setOutputs={setOutputs} />
      </div>
    </Modal>
  )
}

function NewBatchModal({ formula, open, onClose }: {
  formula: ProductionFormula | null; open: boolean; onClose: () => void
}) {
  const t = useT()
  const [multiplier, setMultiplier] = useState('1')
  const [warehouseId, setWarehouseId] = useState('')
  const [plannedStart, setPlannedStart] = useState('')
  const [plannedEnd, setPlannedEnd]     = useState('')
  const [notes, setNotes]               = useState('')

  const createBatch = useCreateBatch()
  const { data: warehouses } = useWarehouses()

  const mult = parseFloat(multiplier) || 0
  const { data: costEstimate, isFetching: estimateFetching } = useCostEstimate(
    formula?.id || '', mult,
  )

  if (!formula) return null

  const handleSubmit = async () => {
    if (!mult || mult <= 0 || !warehouseId) return

    await createBatch.mutateAsync({
      formulaId: formula.id,
      inputMultiplier: mult,
      warehouseId,
      plannedStart: plannedStart || undefined,
      plannedEnd:   plannedEnd   || undefined,
      notes:        notes        || undefined,
    })
    onClose()
    setMultiplier('1'); setWarehouseId(''); setPlannedStart(''); setPlannedEnd(''); setNotes('')
  }

  return (
    <Modal open={open} onClose={onClose}
      title={t('production.batchTitle', { name: formula.name })} size="md"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant="primary" size="sm" loading={createBatch.isPending} onClick={handleSubmit}>
            {t('common.create')}
          </Button>
        </>
      }>
      <div className="space-y-4">
        <Input label={t('production.multiplierLabel')} type="number" value={multiplier}
          onChange={e => setMultiplier(e.target.value)} hint={t('production.multiplierHint')} />

        {mult > 0 && costEstimate && (
          <Card padding="sm" className="bg-bg-tertiary border border-accent-primary/20">
            <div className="flex items-center gap-1.5 mb-2">
              <Calculator size={13} className="text-accent-primary" />
              <p className="text-[11px] font-semibold text-accent-primary">{t('production.costEstimate')}</p>
              {estimateFetching && <span className="text-[10px] text-text-muted">{t('common.loading')}...</span>}
            </div>
            <div className="space-y-1">
              {costEstimate.lines.map((line, i) => (
                <div key={i} className="flex justify-between text-xs">
                  <span className="text-text-secondary">{line.productName}</span>
                  <span className="tabular-nums text-text-primary">
                    {line.qty.toFixed(2)} {line.unit} × {formatNumber(line.unitPrice)} = {formatNumber(line.total)}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-2 pt-2 border-t border-border-primary space-y-1">
              <div className="flex justify-between text-xs font-semibold">
                <span>{t('production.totalMaterialCost')}</span>
                <span className="tabular-nums text-accent-primary">{formatNumber(costEstimate.totalMaterialCost)} so'm</span>
              </div>
              {costEstimate.estimatedUnitCost > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-text-muted">{t('production.estimatedUnitCost')}</span>
                  <span className="tabular-nums text-text-secondary">{formatNumber(costEstimate.estimatedUnitCost)} so'm/{costEstimate.outputUnit}</span>
                </div>
              )}
            </div>
          </Card>
        )}

        {mult > 0 && !costEstimate && (
          <Card padding="sm" className="bg-bg-tertiary">
            <p className="text-[10px] text-text-muted mb-1.5">{t('production.plannedInput')}</p>
            {formula.inputs.map(inp => (
              <div key={inp.id} className="flex justify-between text-xs">
                <span className="text-text-secondary">{inp.product?.name}</span>
                <span className="tabular-nums">{(Number(inp.quantity) * mult).toFixed(2)} {inp.unit}</span>
              </div>
            ))}
          </Card>
        )}

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-text-secondary">{t('production.rawWarehouseLabel')}</label>
          <select value={warehouseId} onChange={e => setWarehouseId(e.target.value)}
            className="h-9 w-full rounded-md text-sm bg-bg-tertiary text-text-primary border border-border-primary px-3 focus:outline-none focus:ring-2 focus:ring-accent-primary/50">
            <option value="">{t('production.selectOption')}</option>
            {warehouses?.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input label={t('production.colStart')} type="datetime-local" value={plannedStart}
            onChange={e => setPlannedStart(e.target.value)} />
          <Input label={t('production.colEnd')} type="datetime-local" value={plannedEnd}
            onChange={e => setPlannedEnd(e.target.value)} />
        </div>

        <Input label={t('common.notes')} value={notes} onChange={e => setNotes(e.target.value)} />
      </div>
    </Modal>
  )
}

function FormulaCard({ formula, onStart, onEdit, onDelete }: {
  formula: ProductionFormula
  onStart:  (f: ProductionFormula) => void
  onEdit:   (f: ProductionFormula) => void
  onDelete: (f: ProductionFormula) => void
}) {
  const t = useT()
  const cfg = PRODUCTION_TYPES.find(p => p.value === formula.type) || PRODUCTION_TYPES[0]
  const TypeIcon = cfg.Icon

  return (
    <Card hoverable>
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-accent-subtle flex items-center justify-center shrink-0">
          <TypeIcon size={18} className="text-accent-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-semibold text-text-primary truncate">{formula.name}</h3>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge variant={cfg.variant} size="sm">{t(cfg.labelKey)}</Badge>
            <span className="text-[10px] text-text-muted">
              {t('production.batchesCount', { count: formula._count?.batches || 0 })}
            </span>
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          <button onClick={() => onEdit(formula)}
            className="p-1.5 rounded-lg text-text-muted hover:text-accent-primary hover:bg-accent-subtle transition-colors">
            <Edit2 size={13} />
          </button>
          <button onClick={() => onDelete(formula)}
            className="p-1.5 rounded-lg text-text-muted hover:text-danger hover:bg-danger/10 transition-colors">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="space-y-1">
          {formula.inputs.map(inp => (
            <div key={inp.id} className="flex items-center gap-2 text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-danger shrink-0" />
              <span className="text-text-secondary truncate">
                {inp.product?.name} — {inp.quantity} {inp.unit}
              </span>
            </div>
          ))}
        </div>
        <div className="flex justify-center">
          <ArrowDown size={12} className="text-text-muted" />
        </div>
        <div className="space-y-1">
          {formula.outputs.map(out => (
            <div key={out.id} className="flex items-center gap-2 text-xs">
              <span className={cn('w-1.5 h-1.5 rounded-full shrink-0',
                out.isWaste ? 'bg-warning' : 'bg-success')} />
              <span className={cn('truncate', out.isWaste ? 'text-warning' : 'text-text-secondary')}>
                {out.product?.name} — {out.quantity} {out.unit}
                {out.isWaste && ` ${t('production.wasteTag')}`}
                {out.isMainProduct && <CheckCircle2 size={10} className="inline ml-1 text-success" />}
              </span>
            </div>
          ))}
        </div>
      </div>

      <Button variant="primary" size="sm" fullWidth leftIcon={<Play size={13} />} onClick={() => onStart(formula)}>
        {t('production.startBatchBtn')}
      </Button>
    </Card>
  )
}

function DeleteFormulaModal({ formula, open, onClose }: {
  formula: ProductionFormula | null; open: boolean; onClose: () => void
}) {
  const t = useT()
  const deleteFormula = useDeleteFormula()

  if (!formula) return null

  const handleDelete = async () => {
    await deleteFormula.mutateAsync(formula.id)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={t('production.deleteFormula')} size="sm"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant="danger" size="sm" loading={deleteFormula.isPending} onClick={handleDelete}>
            {t('common.delete')}
          </Button>
        </>
      }>
      <div className="flex gap-3 p-3 bg-danger/5 rounded-lg border border-danger/20">
        <AlertTriangle size={18} className="text-danger shrink-0 mt-0.5" />
        <p className="text-sm text-text-primary">
          <span className="font-semibold">"{formula.name}"</span>{' '}
          {t('production.deleteFormulaConfirm')}
        </p>
      </div>
    </Modal>
  )
}

export default function ProductionFormulasPage() {
  const t = useT()
  const [formulaModal, setFormulaModal] = useState(false)
  const [batchFormula,  setBatchFormula]  = useState<ProductionFormula | null>(null)
  const [editFormula,   setEditFormula]   = useState<ProductionFormula | null>(null)
  const [deleteFormula, setDeleteFormula] = useState<ProductionFormula | null>(null)

  const { data: formulas, isLoading } = useFormulas()

  return (
    <div>
      <PageHeader
        title={t('production.formulasTitle')}
        description={t('production.formulasDesc')}
        breadcrumbs={[
          { label: t('nav.dashboard'), path: '/dashboard' },
          { label: t('production.moduleName'), path: '/production' },
          { label: t('production.formulasTitle') },
        ]}
        actions={
          <Button variant="primary" size="sm" leftIcon={<Plus size={14} />}
            onClick={() => setFormulaModal(true)}>
            {t('production.newFormula')}
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-48 bg-bg-tertiary rounded-lg animate-pulse" />
          ))}
        </div>
      ) : !formulas?.length ? (
        <EmptyState icon={<FlaskConical size={32} />} title={t('production.formulasEmpty')}
          description={t('production.formulasEmptyDesc')}
          action={{ label: t('production.createFormula'), onClick: () => setFormulaModal(true) }} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {formulas.map(formula => (
            <FormulaCard key={formula.id} formula={formula}
              onStart={setBatchFormula}
              onEdit={setEditFormula}
              onDelete={setDeleteFormula} />
          ))}
        </div>
      )}

      <NewFormulaModal    open={formulaModal}       onClose={() => setFormulaModal(false)} />
      <NewBatchModal      formula={batchFormula}    open={!!batchFormula}    onClose={() => setBatchFormula(null)} />
      <EditFormulaModal   formula={editFormula}     open={!!editFormula}     onClose={() => setEditFormula(null)} />
      <DeleteFormulaModal formula={deleteFormula}   open={!!deleteFormula}   onClose={() => setDeleteFormula(null)} />
    </div>
  )
}
