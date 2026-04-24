import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Plus, AlertTriangle, Trash2, CheckCircle2, Circle, Clock, Play,
  CheckSquare, PauseCircle, XCircle, Flag, BarChart2,
} from 'lucide-react'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import { PageHeader } from '@components/layout/PageHeader/PageHeader'
import { Card }       from '@components/ui/Card/Card'
import { Button }     from '@components/ui/Button/Button'
import { Badge }      from '@components/ui/Badge/Badge'
import { Input }      from '@components/ui/Input/Input'
import { Modal }      from '@components/ui/Modal/Modal'
import { Skeleton }   from '@components/ui/Skeleton/Skeleton'
import { Tabs }       from '@components/ui/Tabs/Tabs'
import {
  useProject, useAddBudgetItem, useAddExpense, useAddWorkLog,
  useDeleteBudgetItem, useUpdateStatus, useUpdateExpense,
  useAddTask, useUpdateTask, useDeleteTask,
} from '@features/construction/hooks/useConstruction'
import { formatCurrency, formatDate } from '@utils/formatters'
import { useT } from '@i18n/index'
import { cn } from '@utils/cn'
import type { ProjectTask } from '@services/construction.service'
import { warehouseService } from '@services/warehouse.service'

const BUDGET_CAT_KEYS = [
  { value: 'LABOR',       labelKey: 'construction.catLabor'       },
  { value: 'MATERIALS',   labelKey: 'construction.catMaterials'   },
  { value: 'EQUIPMENT',   labelKey: 'construction.catEquipment'   },
  { value: 'SUBCONTRACT', labelKey: 'construction.catSubcontract' },
  { value: 'OTHER',       labelKey: 'construction.catOther'       },
]

const CATEGORY_COLORS: Record<string, string> = {
  LABOR:       'var(--color-accent-primary)',
  MATERIALS:   'var(--color-warning)',
  EQUIPMENT:   'var(--color-info)',
  SUBCONTRACT: '#A78BFA',
  OTHER:       'var(--color-text-muted)',
}

const TASK_PRIORITY_CONFIG = {
  LOW:    { label: 'Past',     color: 'text-text-muted',   bg: 'bg-bg-tertiary' },
  MEDIUM: { label: "O'rta",   color: 'text-accent-primary', bg: 'bg-accent-subtle' },
  HIGH:   { label: 'Yuqori',  color: 'text-warning',       bg: 'bg-warning/10' },
  URGENT: { label: 'Shoshilinch', color: 'text-danger',   bg: 'bg-danger/10' },
}

const TASK_STATUS_CONFIG = {
  TODO:        { label: "Bajarilmagan", Icon: Circle,       color: 'text-text-muted'   },
  IN_PROGRESS: { label: 'Jarayonda',   Icon: Play,          color: 'text-accent-primary' },
  DONE:        { label: 'Bajarildi',   Icon: CheckCircle2,  color: 'text-success'       },
}

// ─── Add Budget Modal ──────────────────────────────────────────────
function AddBudgetModal({ projectId, open, onClose }: { projectId: string; open: boolean; onClose: () => void }) {
  const t = useT()
  const [form, setForm] = useState({ category: 'MATERIALS', name: '', unit: 'dona', quantity: '', unitPrice: '' })
  const addBudget = useAddBudgetItem()
  const total = (parseFloat(form.quantity) || 0) * (parseFloat(form.unitPrice) || 0)

  const handleSubmit = async () => {
    if (!form.name || !form.quantity || !form.unitPrice) return
    await addBudget.mutateAsync({ projectId, category: form.category, name: form.name, unit: form.unit,
      quantity: parseFloat(form.quantity), unitPrice: parseFloat(form.unitPrice) })
    onClose()
    setForm({ category: 'MATERIALS', name: '', unit: 'dona', quantity: '', unitPrice: '' })
  }

  return (
    <Modal open={open} onClose={onClose} title={t('construction.budgetModalTitle')} size="sm"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant="primary" size="sm" loading={addBudget.isPending} onClick={handleSubmit}
            disabled={!form.name || !form.quantity || !form.unitPrice}>
            {t('construction.addBtn')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-text-secondary">{t('construction.categoryLabel')}</label>
          <div className="grid grid-cols-3 gap-2">
            {BUDGET_CAT_KEYS.map(cat => (
              <button key={cat.value} type="button" onClick={() => setForm(f => ({ ...f, category: cat.value }))}
                className={cn('py-2 rounded-lg text-xs font-medium border text-center transition-all',
                  form.category === cat.value
                    ? 'border-accent-primary bg-accent-subtle text-accent-primary'
                    : 'border-border-primary text-text-secondary')}>
                {t(cat.labelKey as any)}
              </button>
            ))}
          </div>
        </div>
        <Input label={t('construction.itemNameLabel')} placeholder={t('construction.itemNamePh')} value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        <div className="grid grid-cols-3 gap-2">
          <Input label={t('construction.quantityLabel')} type="number" placeholder="100" value={form.quantity}
            onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
          <Input label={t('construction.unitLabel')} placeholder="qop" value={form.unit}
            onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} />
          <Input label={t('construction.unitPriceLabel')} type="number" placeholder="50000" value={form.unitPrice}
            onChange={e => setForm(f => ({ ...f, unitPrice: e.target.value }))} />
        </div>
        {total > 0 && (
          <div className="p-2.5 rounded-lg bg-success/5 border border-success/20 flex justify-between text-sm">
            <span className="text-text-secondary">{t('common.total')}:</span>
            <span className="font-bold text-success tabular-nums">{formatCurrency(total)}</span>
          </div>
        )}
      </div>
    </Modal>
  )
}

// ─── Add Expense Modal ─────────────────────────────────────────────
function AddExpenseModal({ projectId, open, onClose }: { projectId: string; open: boolean; onClose: () => void }) {
  const t = useT()
  const [form, setForm] = useState({
    category: 'MATERIALS', description: '', amount: '', quantity: '1',
    expenseDate: new Date().toISOString().slice(0, 10), isPaid: false,
    warehouseId: '', productId: '',
  })
  const addExpense = useAddExpense()

  const { data: warehouses } = useQuery({
    queryKey: ['warehouses-list'],
    queryFn:  () => warehouseService.getWarehouses(),
    enabled:  open && form.category === 'MATERIALS',
  })
  const { data: warehouseItems } = useQuery({
    queryKey: ['warehouse-overview', form.warehouseId],
    queryFn:  () => warehouseService.getOverview(form.warehouseId),
    enabled:  open && !!form.warehouseId,
  })

  const handleSubmit = async () => {
    if (!form.description || !form.amount) return
    await addExpense.mutateAsync({
      projectId, category: form.category, description: form.description,
      amount: parseFloat(form.amount), quantity: parseFloat(form.quantity) || 1,
      expenseDate: form.expenseDate, isPaid: form.isPaid,
      warehouseId: form.warehouseId || undefined,
      productId:   form.productId   || undefined,
    } as any)
    onClose()
    setForm({ category: 'MATERIALS', description: '', amount: '', quantity: '1',
      expenseDate: new Date().toISOString().slice(0, 10), isPaid: false,
      warehouseId: '', productId: '' })
  }

  return (
    <Modal open={open} onClose={onClose} title={t('construction.expenseModalTitle')} size="sm"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant="primary" size="sm" loading={addExpense.isPending} onClick={handleSubmit}
            disabled={!form.description || !form.amount}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-text-secondary">{t('construction.categoryLabel')}</label>
          <div className="grid grid-cols-3 gap-2">
            {BUDGET_CAT_KEYS.map(cat => (
              <button key={cat.value} type="button" onClick={() => setForm(f => ({ ...f, category: cat.value }))}
                className={cn('py-2 rounded-lg text-xs font-medium border text-center transition-all',
                  form.category === cat.value
                    ? 'border-accent-primary bg-accent-subtle text-accent-primary'
                    : 'border-border-primary text-text-secondary')}>
                {t(cat.labelKey as any)}
              </button>
            ))}
          </div>
        </div>
        <Input label={t('construction.descLabel')} placeholder={t('construction.descPh')} value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
        <div className="grid grid-cols-2 gap-3">
          <Input label={t('construction.amountLabel')} type="number" placeholder="0" value={form.amount}
            onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
          <Input label={t('construction.dateLabel')} type="date" value={form.expenseDate}
            onChange={e => setForm(f => ({ ...f, expenseDate: e.target.value }))} />
        </div>
        {form.category === 'MATERIALS' && (
          <div className="space-y-3 p-3 rounded-lg border border-border-primary bg-bg-tertiary">
            <p className="text-xs font-medium text-text-muted">Ombordan chiqarish (ixtiyoriy)</p>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Ombor</label>
              <select
                className="w-full border border-border-primary rounded-lg px-3 py-2 text-sm bg-bg-primary text-text-primary"
                value={form.warehouseId}
                onChange={e => setForm(f => ({ ...f, warehouseId: e.target.value, productId: '' }))}
              >
                <option value="">Ombor tanlang</option>
                {(warehouses ?? []).map((w: any) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
            {form.warehouseId && (
              <div>
                <label className="block text-xs text-text-secondary mb-1">Mahsulot</label>
                <select
                  className="w-full border border-border-primary rounded-lg px-3 py-2 text-sm bg-bg-primary text-text-primary"
                  value={form.productId}
                  onChange={e => setForm(f => ({ ...f, productId: e.target.value }))}
                >
                  <option value="">Mahsulot tanlang</option>
                  {(warehouseItems ?? []).map((si: any) => (
                    <option key={si.productId} value={si.productId}>
                      {si.productName} — {Number(si.quantity).toFixed(1)} {si.unit}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.isPaid}
            onChange={e => setForm(f => ({ ...f, isPaid: e.target.checked }))}
            className="w-4 h-4 rounded accent-accent-primary" />
          <span className="text-sm text-text-secondary">{t('construction.markAsPaid')}</span>
        </label>
      </div>
    </Modal>
  )
}

// ─── Add Task Modal ────────────────────────────────────────────────
function AddTaskModal({ projectId, open, onClose }: { projectId: string; open: boolean; onClose: () => void }) {
  const t = useT()
  const [form, setForm] = useState({ title: '', description: '', priority: 'MEDIUM', dueDate: '' })
  const addTask = useAddTask()

  const handleSubmit = async () => {
    if (!form.title.trim()) return
    await addTask.mutateAsync({
      projectId, title: form.title,
      description: form.description || undefined,
      priority:    form.priority as any,
      dueDate:     form.dueDate || undefined,
    })
    onClose()
    setForm({ title: '', description: '', priority: 'MEDIUM', dueDate: '' })
  }

  return (
    <Modal open={open} onClose={onClose} title={t('construction.addTaskTitle')} size="sm"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant="primary" size="sm" loading={addTask.isPending} onClick={handleSubmit} disabled={!form.title}>
            {t('common.create')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input label={t('construction.taskTitleLabel')} placeholder={t('construction.taskTitlePh')} value={form.title}
          onChange={e => setForm(f => ({ ...f, title: e.target.value }))} autoFocus />
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-text-secondary">{t('construction.priorityLabel')}</label>
          <div className="grid grid-cols-4 gap-1.5">
            {Object.entries(TASK_PRIORITY_CONFIG).map(([val, cfg]) => (
              <button key={val} type="button" onClick={() => setForm(f => ({ ...f, priority: val }))}
                className={cn('py-2 rounded-lg text-xs font-medium border text-center transition-all',
                  form.priority === val
                    ? `border-current ${cfg.color} ${cfg.bg}`
                    : 'border-border-primary text-text-secondary')}>
                {cfg.label}
              </button>
            ))}
          </div>
        </div>
        <Input label={t('construction.taskDueDate')} type="date" value={form.dueDate}
          onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
        <Input label={t('common.notes')} placeholder={t('construction.taskDescPh')} value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
      </div>
    </Modal>
  )
}

// ─── Task Row ──────────────────────────────────────────────────────
function TaskRow({ task, projectId }: { task: ProjectTask; projectId: string }) {
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()
  const priCfg = TASK_PRIORITY_CONFIG[task.priority] || TASK_PRIORITY_CONFIG.MEDIUM
  const staCfg = TASK_STATUS_CONFIG[task.status]     || TASK_STATUS_CONFIG.TODO
  const StatusIcon = staCfg.Icon

  const nextStatus = { TODO: 'IN_PROGRESS', IN_PROGRESS: 'DONE', DONE: 'TODO' } as const

  return (
    <div className={cn('flex items-center gap-3 px-4 py-3 border-b border-border-primary/50 hover:bg-bg-tertiary/30',
      task.status === 'DONE' && 'opacity-60')}>
      <button
        onClick={() => updateTask.mutate({ id: task.id, projectId, status: nextStatus[task.status] })}
        className={cn('shrink-0 transition-colors', staCfg.color, 'hover:scale-110')}>
        <StatusIcon size={18} />
      </button>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm text-text-primary', task.status === 'DONE' && 'line-through text-text-muted')}>
          {task.title}
        </p>
        {task.dueDate && (
          <p className={cn('text-[10px]', new Date(task.dueDate) < new Date() && task.status !== 'DONE'
            ? 'text-danger' : 'text-text-muted')}>
            {formatDate(task.dueDate, 'short')}
          </p>
        )}
      </div>
      <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-md', priCfg.color, priCfg.bg)}>
        {priCfg.label}
      </span>
      <button onClick={() => deleteTask.mutate({ id: task.id, projectId })}
        className="text-text-muted hover:text-danger transition-colors p-1">
        <Trash2 size={13} />
      </button>
    </div>
  )
}

// ─── Progress Chart ───────────────────────────────────────────────
function ProgressChart({ workLogs }: { workLogs: any[] }) {
  const t = useT()
  if (!workLogs?.length) return null

  const chartData = [...workLogs].reverse().map((log: any) => ({
    date:     formatDate(log.workDate, 'short'),
    progress: log.progress,
    workers:  log.workersCount || 0,
  }))

  return (
    <Card className="mb-4">
      <div className="flex items-center gap-2 mb-4">
        <BarChart2 size={15} className="text-accent-primary" />
        <h3 className="text-sm font-semibold text-text-primary">{t('construction.progressChartTitle')}</h3>
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-primary)" />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
            tickLine={false} axisLine={false} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
            tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} width={36} />
          <Tooltip
            contentStyle={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-primary)', borderRadius: 8, fontSize: 11 }}
            formatter={(value: any) => [`${value}%`, t('construction.progressLabel')]} />
          <Line type="monotone" dataKey="progress" stroke="#6366f1" strokeWidth={2}
            dot={{ r: 3, fill: '#6366f1' }} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────
const STATUS_FLOW = [
  { status: 'PLANNING',    label: 'Rejalashtirish', Icon: Clock,         variant: 'default'  as const },
  { status: 'IN_PROGRESS', label: 'Jarayonda',      Icon: Play,          variant: 'primary'  as const },
  { status: 'ON_HOLD',     label: 'Kutmoqda',       Icon: PauseCircle,   variant: 'warning'  as const },
  { status: 'COMPLETED',   label: 'Yakunlandi',     Icon: CheckSquare,   variant: 'success'  as const },
  { status: 'CANCELLED',   label: 'Bekor',          Icon: XCircle,       variant: 'danger'   as const },
]

export default function ProjectDetailPage() {
  const t = useT()
  const navigate  = useNavigate()
  const { id }    = useParams<{ id: string }>()
  const [activeTab,    setActiveTab]    = useState('budget')
  const [budgetModal,  setBudgetModal]  = useState(false)
  const [expenseModal, setExpenseModal] = useState(false)
  const [taskModal,    setTaskModal]    = useState(false)
  const [progress,     setProgress]     = useState('')
  const [progressDesc, setProgressDesc] = useState('')

  const addWorkLog     = useAddWorkLog()
  const updateStatus   = useUpdateStatus()
  const deleteBudget   = useDeleteBudgetItem()
  const updateExpense  = useUpdateExpense()
  const { data: project, isLoading } = useProject(id!)

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton height={120} className="rounded-lg" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} height={80} className="rounded-lg" />)}
        </div>
      </div>
    )
  }

  if (!project) return null

  const handleUpdateProgress = async () => {
    if (!progress) return
    await addWorkLog.mutateAsync({
      projectId: id!, workDate: new Date().toISOString().slice(0, 10),
      progress: parseInt(progress), description: progressDesc || undefined,
    })
    setProgress(''); setProgressDesc('')
  }

  const FINANCE_CARDS = [
    { label: t('construction.financeContractLabel'), value: formatCurrency(project.finance?.contractAmount || 0), color: 'text-text-primary'   },
    { label: t('construction.financeBudgetLabel'),   value: formatCurrency(project.finance?.totalBudget    || 0), color: 'text-accent-primary' },
    { label: t('construction.financeExpenseLabel'),  value: formatCurrency(project.finance?.totalExpense   || 0),
      color: project.finance?.isOverBudget ? 'text-danger' : 'text-text-primary' },
    { label: t('construction.financeProfitLabel'),   value: formatCurrency(project.finance?.profit         || 0),
      color: (project.finance?.profit || 0) >= 0 ? 'text-success' : 'text-danger' },
  ]

  const TABS = [
    { id: 'budget',   label: t('construction.tabBudget') },
    { id: 'expenses', label: t('construction.tabExpenses') },
    { id: 'tasks',    label: `${t('construction.tabTasks')} ${project.taskStats ? `(${project.taskStats.total})` : ''}` },
    { id: 'logs',     label: t('construction.tabLogs') },
    { id: 'workers',  label: 'Xodimlar' },
  ]

  // Workers tab: show employees, sum of worker-days from logs
  const totalWorkerDays = (project.workLogs ?? []).reduce((s: number, l: any) => s + (l.workersCount ?? 0), 0)

  const pendingTasks = (project.tasks || []).filter((t: any) => t.status !== 'DONE').length
  const currentStatus = STATUS_FLOW.find(s => s.status === project.status)

  return (
    <div>
      <PageHeader
        title={project.name}
        description={project.projectNumber}
        breadcrumbs={[
          { label: t('nav.dashboard'),           path: '/dashboard' },
          { label: t('construction.moduleName'), path: '/construction/objects' },
          { label: project.name },
        ]}
        actions={
          <div className="flex gap-2 flex-wrap">
            {/* Status buttons */}
            <div className="flex gap-1 p-1 bg-bg-tertiary rounded-lg border border-border-primary">
              {STATUS_FLOW.map(s => {
                const Icon = s.Icon
                const isActive = project.status === s.status
                return (
                  <button key={s.status}
                    onClick={() => !isActive && updateStatus.mutate({ id: id!, status: s.status })}
                    disabled={isActive || updateStatus.isPending}
                    className={cn('flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all',
                      isActive ? 'bg-accent-primary text-white shadow-sm'
                        : 'text-text-secondary hover:bg-bg-secondary hover:text-text-primary')}>
                    <Icon size={12} />
                    <span className="hidden sm:inline">{s.label}</span>
                  </button>
                )
              })}
            </div>
            <Button variant="secondary" size="sm" leftIcon={<Plus size={14} />} onClick={() => setBudgetModal(true)}>
              {t('construction.addBudgetBtn')}
            </Button>
            <Button variant="primary" size="sm" leftIcon={<Plus size={14} />} onClick={() => setExpenseModal(true)}>
              {t('construction.addExpenseBtn')}
            </Button>
          </div>
        }
      />

      {/* Finance KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {FINANCE_CARDS.map(card => (
          <div key={card.label} className="p-4 rounded-lg bg-bg-secondary border border-border-primary">
            <p className="text-xs text-text-muted mb-1.5">{card.label}</p>
            <p className={cn('text-lg font-bold tabular-nums', card.color)}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Progress + Category Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-text-primary">
              {t('construction.progressTitle', { progress: project.progress || 0 })}
            </h3>
            <div className="flex items-center gap-2">
              {project.isLate && (
                <Badge variant="danger" size="sm">
                  {t('construction.daysDelayed', { days: Math.abs(project.daysLeft || 0) })}
                </Badge>
              )}
              {project.daysLeft !== null && !project.isLate && (
                <Badge variant="default" size="sm">
                  {t('construction.daysLeft', { days: project.daysLeft })}
                </Badge>
              )}
              {pendingTasks > 0 && (
                <Badge variant="warning" size="sm">
                  <Flag size={10} className="mr-1" />
                  {pendingTasks} {t('construction.pendingTasks')}
                </Badge>
              )}
            </div>
          </div>
          <div className="mb-4">
            <div className="h-4 rounded-full bg-bg-elevated overflow-hidden">
              <div className={cn('h-full rounded-full transition-all duration-500',
                (project.progress || 0) >= 75 ? 'bg-success'
                : (project.progress || 0) >= 40 ? 'bg-accent-primary' : 'bg-warning')}
                style={{ width: `${project.progress || 0}%` }} />
            </div>
          </div>
          <div className="flex gap-2">
            <Input type="number" placeholder="0-100" value={progress}
              onChange={e => setProgress(e.target.value)} className="max-w-[120px]" />
            <Input placeholder={t('common.notesOptional')} value={progressDesc}
              onChange={e => setProgressDesc(e.target.value)} className="flex-1" />
            <Button variant="primary" size="sm" loading={addWorkLog.isPending}
              onClick={handleUpdateProgress} disabled={!progress}>
              {t('common.save')}
            </Button>
          </div>
        </Card>

        <Card padding="none">
          <div className="p-4 border-b border-border-primary">
            <h3 className="font-display font-semibold text-text-primary text-sm">{t('construction.categoriesLabel')}</h3>
          </div>
          <div className="divide-y divide-border-primary">
            {project.finance?.categoryAnalysis
              ?.filter((c: any) => c.budget > 0 || c.actual > 0)
              .map((cat: any) => {
                const cfg = BUDGET_CAT_KEYS.find(b => b.value === cat.category)
                return (
                  <div key={cat.category} className="px-4 py-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-text-secondary">{cfg ? t(cfg.labelKey as any) : cat.category}</span>
                      <div className="flex items-center gap-1.5">
                        {cat.isOver && <AlertTriangle size={11} className="text-danger" />}
                        <span className={cn('text-xs font-medium tabular-nums',
                          cat.isOver ? 'text-danger' : 'text-text-primary')}>
                          {cat.percent.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-bg-elevated overflow-hidden">
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${Math.min(100, cat.percent)}%`,
                          background: cat.isOver ? 'var(--color-danger)' : CATEGORY_COLORS[cat.category] }} />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-[10px] text-text-muted">{t('construction.expenseCatLabel')} {formatCurrency(cat.actual)}</span>
                      <span className="text-[10px] text-text-muted">{t('construction.budgetCatLabel')} {formatCurrency(cat.budget)}</span>
                    </div>
                  </div>
                )
              })}
          </div>
        </Card>
      </div>

      {/* Progress History Chart */}
      {project.workLogs?.length > 1 && <ProgressChart workLogs={project.workLogs} />}

      {/* Tabs */}
      <Tabs tabs={TABS} active={activeTab} onChange={setActiveTab} variant="pills" />

      <div className="mt-4">
        {/* ── Budget tab ── */}
        {activeTab === 'budget' && (
          <Card padding="none">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-primary">
                  {[t('construction.colCategory'), t('common.name'),
                    t('construction.colQuantity'), t('construction.colUnitPrice'), t('common.total'), ''].map((h, i) => (
                    <th key={i} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {project.budgetItems?.length === 0 ? (
                  <tr><td colSpan={6} className="py-8 text-center text-sm text-text-muted">{t('construction.noBudgetItems')}</td></tr>
                ) : project.budgetItems?.map((item: any) => {
                  const cfg = BUDGET_CAT_KEYS.find(b => b.value === item.category)
                  return (
                    <tr key={item.id} className="border-b border-border-primary/50 hover:bg-bg-tertiary/30 group">
                      <td className="px-4 py-3"><Badge variant="default" size="sm">{cfg ? t(cfg.labelKey as any) : item.category}</Badge></td>
                      <td className="px-4 py-3 text-sm text-text-primary">{item.name}</td>
                      <td className="px-4 py-3 text-sm tabular-nums text-text-secondary">{item.quantity} {item.unit}</td>
                      <td className="px-4 py-3 text-sm tabular-nums text-text-secondary">{formatCurrency(item.unitPrice)}</td>
                      <td className="px-4 py-3 text-sm tabular-nums font-medium text-text-primary">{formatCurrency(item.totalAmount)}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => deleteBudget.mutate({ id: item.id, projectId: id! })}
                          className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-danger transition-all p-1">
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              {project.budgetItems?.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-border-secondary bg-bg-tertiary/50">
                    <td colSpan={4} className="px-4 py-3 text-right text-sm font-semibold text-text-secondary">
                      {t('construction.totalBudgetLabel')}
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-accent-primary tabular-nums">
                      {formatCurrency(project.finance?.totalBudget || 0)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </Card>
        )}

        {/* ── Expenses tab ── */}
        {activeTab === 'expenses' && (
          <Card padding="none">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-primary">
                  {[t('construction.dateLabel'), t('construction.colCategory'),
                    t('construction.descLabel'), t('common.amount'), t('construction.paidStatus')].map((h, i) => (
                    <th key={i} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {project.expenses?.length === 0 ? (
                  <tr><td colSpan={5} className="py-8 text-center text-sm text-text-muted">{t('construction.noExpenses')}</td></tr>
                ) : project.expenses?.map((exp: any) => {
                  const cfg = BUDGET_CAT_KEYS.find(b => b.value === exp.category)
                  return (
                    <tr key={exp.id} className="border-b border-border-primary/50 hover:bg-bg-tertiary/30">
                      <td className="px-4 py-3 text-xs text-text-muted">{formatDate(exp.expenseDate, 'short')}</td>
                      <td className="px-4 py-3"><Badge variant="default" size="sm">{cfg ? t(cfg.labelKey as any) : exp.category}</Badge></td>
                      <td className="px-4 py-3 text-sm text-text-primary">{exp.description}</td>
                      <td className="px-4 py-3 text-sm tabular-nums font-medium text-text-primary">{formatCurrency(exp.amount)}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => updateExpense.mutate({ id: exp.id, projectId: id!, isPaid: !exp.isPaid })}
                          className={cn('flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-all',
                            exp.isPaid
                              ? 'bg-success/10 border-success/30 text-success'
                              : 'border-border-primary text-text-muted hover:border-success/50 hover:text-success')}>
                          {exp.isPaid ? <CheckCircle2 size={12} /> : <Circle size={12} />}
                          {exp.isPaid ? t('construction.paid') : t('construction.unpaid')}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              {project.expenses?.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-border-secondary bg-bg-tertiary/50">
                    <td colSpan={3} className="px-4 py-3 text-right text-sm font-semibold text-text-secondary">
                      {t('construction.totalExpenseLabel')}
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-danger tabular-nums">
                      {formatCurrency(project.finance?.totalExpense || 0)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </Card>
        )}

        {/* ── Tasks tab ── */}
        {activeTab === 'tasks' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex gap-3 text-xs text-text-muted">
                {project.taskStats && (
                  <>
                    <span className="text-success font-medium">{project.taskStats.done} {t('construction.taskDone')}</span>
                    <span className="text-accent-primary font-medium">{project.taskStats.inProgress} {t('construction.taskInProgress')}</span>
                    <span>{project.taskStats.todo} {t('construction.taskTodo')}</span>
                  </>
                )}
              </div>
              <Button variant="primary" size="sm" leftIcon={<Plus size={13} />} onClick={() => setTaskModal(true)}>
                {t('construction.addTaskBtn')}
              </Button>
            </div>
            <Card padding="none">
              {!project.tasks?.length ? (
                <div className="py-8 text-center text-sm text-text-muted">{t('construction.noTasks')}</div>
              ) : (
                <div>
                  {/* Group: TODO */}
                  {project.tasks.filter((t: any) => t.status === 'TODO').length > 0 && (
                    <div>
                      <div className="px-4 py-2 bg-bg-tertiary/50 border-b border-border-primary text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                        {t('construction.taskTodo')}
                      </div>
                      {project.tasks.filter((t: any) => t.status === 'TODO').map((task: any) => (
                        <TaskRow key={task.id} task={task} projectId={id!} />
                      ))}
                    </div>
                  )}
                  {/* Group: IN_PROGRESS */}
                  {project.tasks.filter((t: any) => t.status === 'IN_PROGRESS').length > 0 && (
                    <div>
                      <div className="px-4 py-2 bg-accent-subtle/50 border-b border-border-primary text-[11px] font-semibold uppercase tracking-wider text-accent-primary">
                        {t('construction.taskInProgress')}
                      </div>
                      {project.tasks.filter((t: any) => t.status === 'IN_PROGRESS').map((task: any) => (
                        <TaskRow key={task.id} task={task} projectId={id!} />
                      ))}
                    </div>
                  )}
                  {/* Group: DONE */}
                  {project.tasks.filter((t: any) => t.status === 'DONE').length > 0 && (
                    <div>
                      <div className="px-4 py-2 bg-success/5 border-b border-border-primary text-[11px] font-semibold uppercase tracking-wider text-success">
                        {t('construction.taskDone')}
                      </div>
                      {project.tasks.filter((t: any) => t.status === 'DONE').map((task: any) => (
                        <TaskRow key={task.id} task={task} projectId={id!} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ── Work Logs tab ── */}
        {activeTab === 'logs' && (
          <Card padding="none">
            <div className="divide-y divide-border-primary">
              {project.workLogs?.length === 0 ? (
                <div className="py-8 text-center text-sm text-text-muted">{t('construction.noLogs')}</div>
              ) : project.workLogs?.map((log: any) => (
                <div key={log.id} className="flex items-center gap-4 px-4 py-3">
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm',
                    log.progress >= 75 ? 'bg-success/10 text-success'
                    : log.progress >= 40 ? 'bg-accent-subtle text-accent-primary'
                    : 'bg-warning/10 text-warning')}>
                    {log.progress}%
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary">{log.description || t('construction.workInProgress')}</p>
                    {log.workersCount > 0 && (
                      <p className="text-xs text-text-muted">{t('construction.workersCount', { count: log.workersCount })}</p>
                    )}
                    {log.issues && (
                      <p className="text-xs text-danger mt-0.5 flex items-center gap-1">
                        <AlertTriangle size={10} /> {log.issues}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-text-muted shrink-0">{formatDate(log.workDate, 'short')}</span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

        {/* ── Workers tab ── */}
        {activeTab === 'workers' && (
          <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <Card padding="sm">
                <p className="text-xs text-text-muted mb-1">Menejer</p>
                <p className="text-sm font-semibold">{project.manager ? `${project.manager.firstName ?? ''} ${project.manager.lastName ?? ''}`.trim() : '—'}</p>
              </Card>
              <Card padding="sm">
                <p className="text-xs text-text-muted mb-1">Jami ish-kuni</p>
                <p className="text-sm font-semibold">{totalWorkerDays} kishi-kun</p>
              </Card>
              <Card padding="sm">
                <p className="text-xs text-text-muted mb-1">Jurnallar</p>
                <p className="text-sm font-semibold">{(project.workLogs ?? []).length} ta</p>
              </Card>
            </div>

            {/* Work logs with worker counts */}
            <Card padding="none">
              <div className="px-4 py-3 border-b border-border-primary">
                <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">Ish kuni yozuvlari (xodimlar soni)</p>
              </div>
              <div className="divide-y divide-border-primary">
                {(project.workLogs ?? []).filter((l: any) => l.workersCount > 0).length === 0 ? (
                  <p className="px-4 py-6 text-sm text-text-muted text-center">Xodim yozuvlari yo'q. Ish jurnaliga xodimlar sonini qo'shing.</p>
                ) : (project.workLogs ?? [])
                    .filter((l: any) => l.workersCount > 0)
                    .map((log: any) => (
                      <div key={log.id} className="flex items-center gap-4 px-4 py-3">
                        <div className="w-10 h-10 rounded-xl bg-accent-subtle flex items-center justify-center text-accent-primary font-bold text-sm shrink-0">
                          {log.workersCount}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-text-primary">{log.description || 'Ish bajarildi'}</p>
                          <p className="text-xs text-text-muted">{log.workersCount} nafar xodim</p>
                        </div>
                        <span className="text-xs text-text-muted">{formatDate(log.workDate, 'short')}</span>
                      </div>
                    ))}
              </div>
            </Card>
          </div>
        )}
      </div>

      <AddBudgetModal  projectId={id!} open={budgetModal}  onClose={() => setBudgetModal(false)} />
      <AddExpenseModal projectId={id!} open={expenseModal} onClose={() => setExpenseModal(false)} />
      <AddTaskModal    projectId={id!} open={taskModal}    onClose={() => setTaskModal(false)} />
    </div>
  )
}
