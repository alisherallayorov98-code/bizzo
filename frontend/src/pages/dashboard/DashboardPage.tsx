import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Users, Package, DollarSign,
  TrendingUp, AlertCircle,
  ArrowRight, Sparkles, CheckCircle,
  BarChart3, ScanLine, Wallet, Repeat, Calendar,
  Settings2, Eye, EyeOff, ChevronUp, ChevronDown, RotateCcw, X, GripVertical,
} from 'lucide-react'
import { HealthScoreWidget }  from '@components/smart/HealthScoreWidget'
import { SmartAlertsWidget }  from '@components/smart/SmartAlertsWidget'
import { DashboardCharts }    from '@components/charts/DashboardCharts/DashboardCharts'
import { PageHeader }       from '@components/layout/PageHeader/PageHeader'
import { Card }             from '@components/ui/Card/Card'
import { KPICard }          from '@components/charts/KPICard/KPICard'
import { Badge }            from '@components/ui/Badge/Badge'
import { Button }           from '@components/ui/Button/Button'
import { Skeleton }         from '@components/ui/Skeleton/Skeleton'
import { useAuth }          from '@hooks/useAuth'
import api                  from '@config/api'
import { useContactStats }  from '@features/contacts/hooks/useContacts'
import { useProductStats }  from '@features/products/hooks/useProducts'
import { useEmployeeStats } from '@features/employees/hooks/useEmployees'
import { useDebtStats }     from '@features/debts/hooks/useDebts'
import { useSalesStats }    from '@features/sales-module/hooks/useSales'
import { useAIRecommendations } from '@features/ai/hooks/useAI'
import type { AIRecommendation } from '@services/ai.service'
import { formatCurrency, formatDate } from '@utils/formatters'
import { cn }               from '@utils/cn'
import { useT }             from '@i18n/index'
import { useDashboardStore } from '@store/dashboard.store'

// ============================================
// WIDGET WRAPPER
// ============================================
function WidgetWrapper({
  id,
  children,
}: {
  id:       string
  children: React.ReactNode
}) {
  const { widgets, editMode, toggleWidget, moveWidget, reorderWidget } = useDashboardStore()
  const widget = widgets.find(w => w.id === id)
  if (!widget) return null
  if (!widget.visible && !editMode) return null

  function onDragStart(e: React.DragEvent) {
    e.dataTransfer.setData('widgetId', id)
    e.dataTransfer.effectAllowed = 'move'
  }
  function onDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }
  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    const fromId = e.dataTransfer.getData('widgetId')
    if (fromId && fromId !== id) reorderWidget(fromId, id)
  }

  return (
    <div
      draggable={editMode}
      onDragStart={editMode ? onDragStart : undefined}
      onDragOver={editMode ? onDragOver : undefined}
      onDrop={editMode ? onDrop : undefined}
      className={cn(
        'relative transition-opacity',
        !widget.visible && editMode && 'opacity-40',
        editMode && 'cursor-grab active:cursor-grabbing',
      )}
    >
      {editMode && (
        <div className="absolute -top-2 right-0 z-10 flex items-center gap-1 bg-bg-elevated border border-border-primary rounded-lg px-1.5 py-0.5 shadow-md">
          <GripVertical size={12} className="text-text-muted cursor-grab mr-0.5" />
          <button
            onClick={() => moveWidget(id, 'up')}
            className="p-0.5 rounded hover:bg-bg-tertiary text-text-muted hover:text-text-primary transition-colors"
            title="Yuqoriga"
          >
            <ChevronUp size={13} />
          </button>
          <button
            onClick={() => moveWidget(id, 'down')}
            className="p-0.5 rounded hover:bg-bg-tertiary text-text-muted hover:text-text-primary transition-colors"
            title="Pastga"
          >
            <ChevronDown size={13} />
          </button>
          <button
            onClick={() => toggleWidget(id)}
            className={cn(
              'p-0.5 rounded transition-colors',
              widget.visible
                ? 'text-text-muted hover:text-warning hover:bg-warning/10'
                : 'text-text-muted hover:text-success hover:bg-success/10',
            )}
            title={widget.visible ? "Yashirish" : "Ko'rsatish"}
          >
            {widget.visible ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
          <span className="text-[10px] text-text-muted pl-1 pr-0.5 border-l border-border-primary">
            {widget.label}
          </span>
        </div>
      )}
      {children}
    </div>
  )
}

// ============================================
// BUGUNGI KASSA XARAJATLARI
// ============================================
interface CashSummary {
  today:  { amount: number; count: number }
  month:  { amount: number; count: number }
  recent: Array<{ id: string; payeeName: string; amount: number; notes: string; expenseDate: string; category: string }>
}

function CashTodayWidget() {
  const { data, isLoading } = useQuery<CashSummary>({
    queryKey: ['cash-expenses', 'today-summary'],
    queryFn:  async () => (await api.get('/cash-expenses/today-summary')).data.data,
  })

  return (
    <Card padding="md">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-warning/10 flex items-center justify-center">
            <Wallet size={14} className="text-warning" />
          </div>
          <h3 className="font-semibold text-text-primary text-sm">Kassa xarajatlari</h3>
        </div>
        <Link to="/cash-expenses">
          <Button variant="ghost" size="xs" rightIcon={<ArrowRight size={12} />}>
            Hammasi
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <Skeleton className="h-24 rounded" />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="p-2 rounded-lg bg-bg-tertiary">
              <p className="text-[10px] text-text-muted uppercase tracking-wider">Bugun</p>
              <p className="text-base font-bold tabular-nums text-text-primary">
                {formatCurrency(data?.today.amount ?? 0)}
              </p>
              <p className="text-[10px] text-text-muted">{data?.today.count ?? 0} ta hujjat</p>
            </div>
            <div className="p-2 rounded-lg bg-bg-tertiary">
              <p className="text-[10px] text-text-muted uppercase tracking-wider">30 kunda</p>
              <p className="text-base font-bold tabular-nums text-text-primary">
                {formatCurrency(data?.month.amount ?? 0)}
              </p>
              <p className="text-[10px] text-text-muted">{data?.month.count ?? 0} ta hujjat</p>
            </div>
          </div>

          {data?.recent && data.recent.length > 0 ? (
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Oxirgi 3 ta</p>
              {data.recent.slice(0, 3).map(r => (
                <div key={r.id} className="flex items-center justify-between py-1 border-b border-border-primary/40 last:border-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-text-primary truncate">{r.payeeName}</p>
                    <p className="text-[10px] text-text-muted truncate">{r.notes}</p>
                  </div>
                  <span className="text-xs tabular-nums font-semibold text-warning shrink-0 ml-2">
                    −{formatCurrency(r.amount)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-text-muted text-center py-3">Hozircha xarajatlar yo'q</p>
          )}
        </>
      )}
    </Card>
  )
}

// ============================================
// YAQIN KUNLARDAGI TAKRORIY OPERATSIYALAR
// ============================================
interface UpcomingRule {
  id: string; type: string; title: string; amount: number | string
  frequency: string; nextRunAt: string
}

function UpcomingRecurringWidget() {
  const { data, isLoading } = useQuery<UpcomingRule[]>({
    queryKey: ['recurring', 'upcoming'],
    queryFn:  async () => (await api.get('/recurring/upcoming')).data.data,
  })

  const TYPE_DOTS: Record<string, string> = {
    EXPENSE:      'bg-warning',
    INCOME:       'bg-success',
    DEBT_PAYMENT: 'bg-info',
  }

  return (
    <Card padding="md">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-accent-primary/10 flex items-center justify-center">
            <Repeat size={14} className="text-accent-primary" />
          </div>
          <h3 className="font-semibold text-text-primary text-sm">Yaqin takroriy to'lovlar</h3>
        </div>
        <Link to="/recurring">
          <Button variant="ghost" size="xs" rightIcon={<ArrowRight size={12} />}>
            Hammasi
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <Skeleton className="h-24 rounded" />
      ) : !data?.length ? (
        <div className="text-center py-6">
          <Calendar size={24} className="mx-auto text-text-muted opacity-30 mb-2" />
          <p className="text-xs text-text-muted">Yaqin 7 kunda takroriy to'lov yo'q</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {data.map(r => (
            <div key={r.id} className="flex items-center gap-2 py-1.5 border-b border-border-primary/40 last:border-0">
              <span className={cn('w-2 h-2 rounded-full shrink-0', TYPE_DOTS[r.type] ?? 'bg-text-muted')} />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-text-primary truncate">{r.title}</p>
                <p className="text-[10px] text-text-muted">{formatDate(r.nextRunAt)}</p>
              </div>
              <span className="text-xs tabular-nums font-semibold text-text-primary shrink-0">
                {formatCurrency(Number(r.amount))}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

// ============================================
// AI TAVSIYALAR PANELI
// ============================================
function RecommendationsPanel() {
  const t = useT()
  const { data: recommendations, isLoading } = useAIRecommendations()

  const typeConfig = {
    success: { color: 'text-success', bg: 'bg-success/10', border: 'border-success/20', icon: CheckCircle },
    warning: { color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/20', icon: AlertCircle },
    danger:  { color: 'text-danger',  bg: 'bg-danger/10',  border: 'border-danger/20',  icon: AlertCircle },
    info:    { color: 'text-info',    bg: 'bg-info/10',    border: 'border-info/20',    icon: Sparkles },
  }

  return (
    <Card padding="md" className="h-full">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-6 h-6 rounded-md bg-gradient-to-br from-accent-primary to-purple-500 flex items-center justify-center">
          <Sparkles size={13} className="text-white" />
        </div>
        <h3 className="font-semibold text-text-primary">{t('dashboard.aiRecommendations')}</h3>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      ) : !recommendations?.length ? (
        <p className="text-sm text-text-muted text-center py-6">{t('dashboard.recLoading')}</p>
      ) : (
        <div className="space-y-2.5">
          {recommendations.map((rec: AIRecommendation, i: number) => {
            const config = typeConfig[rec.type] || typeConfig.info
            const Icon   = config.icon
            return (
              <div
                key={i}
                className={cn(
                  'p-3 rounded-lg border',
                  config.bg, config.border,
                )}
              >
                <div className="flex items-start gap-2.5">
                  <Icon size={14} className={cn('shrink-0 mt-0.5', config.color)} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-text-primary">{rec.title}</p>
                    <p className="text-xs text-text-muted mt-0.5 line-clamp-2">{rec.message}</p>
                    {rec.action && rec.link && (
                      <Link
                        to={rec.link}
                        className={cn('text-[10px] font-medium mt-1 inline-flex items-center gap-1 hover:underline', config.color)}
                      >
                        {rec.action} <ArrowRight size={10} />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}

// ============================================
// TEZKOR HAVOLALAR
// ============================================
const QUICK_LINKS = [
  { to: '/pos',          icon: ScanLine,   labelKey: 'nav.pos',         color: 'text-green-400',       bg: 'bg-green-400/10' },
  { to: '/contacts',     icon: Users,      labelKey: 'nav.contacts',    color: 'text-accent-primary',  bg: 'bg-accent-primary/10' },
  { to: '/products',     icon: Package,    labelKey: 'nav.products',    color: 'text-info',             bg: 'bg-info/10' },
  { to: '/debts',        icon: DollarSign, labelKey: 'nav.debts',       color: 'text-warning',          bg: 'bg-warning/10' },
  { to: '/sales',         icon: TrendingUp, labelKey: 'dashboard.sales', color: 'text-success',          bg: 'bg-success/10' },
  { to: '/salary',       icon: BarChart3,  labelKey: 'dashboard.salary',color: 'text-orange-400',       bg: 'bg-orange-400/10' },
]

// ============================================
// ASOSIY DASHBOARD
// ============================================
export default function DashboardPage() {
  const { company, fullName } = useAuth()
  const t = useT()
  const now = new Date()
  const { editMode, setEditMode, resetWidgets, widgets } = useDashboardStore()

  const { data: contactStats }  = useContactStats()
  const { data: productStats }  = useProductStats()
  const { data: employeeStats } = useEmployeeStats()
  const { data: debtStats }     = useDebtStats()
  const { data: salesStats }    = useSalesStats()

  const greeting = now.getHours() < 12
    ? t('dashboard.goodMorning')
    : now.getHours() < 17
    ? t('dashboard.goodAfternoon')
    : t('dashboard.goodEvening')

  const sorted = [...widgets].sort((a, b) => a.order - b.order)

  return (
    <div>
      <PageHeader
        title={`${greeting}, ${fullName?.split(' ')[0] ?? t('dashboard.user')}! 👋`}
        description={`${company?.name ?? t('dashboard.company')} — ${now.toLocaleDateString('uz-UZ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`}
        breadcrumbs={[{ label: t('nav.dashboard') }]}
        actions={
          <div className="flex items-center gap-2">
            {editMode && (
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<RotateCcw size={13} />}
                onClick={resetWidgets}
                title="Asliga qaytarish"
              >
                Reset
              </Button>
            )}
            <Button
              variant={editMode ? 'primary' : 'secondary'}
              size="sm"
              leftIcon={editMode ? <X size={13} /> : <Settings2 size={13} />}
              onClick={() => setEditMode(!editMode)}
            >
              {editMode ? 'Tayyor' : 'Sozlash'}
            </Button>
          </div>
        }
      />

      {/* Sozlash rejimi banneri */}
      {editMode && (
        <div className="mb-4 p-3 rounded-xl border border-accent-primary/30 bg-accent-primary/5 flex items-center gap-2 text-sm text-accent-primary">
          <Settings2 size={14} />
          <span>Sozlash rejimi yoqilgan — widgetlarni ko'rsatish/yashirish va tartibini o'zgartiring</span>
        </div>
      )}

      {/* Widgetlar (tartib bo'yicha) */}
      <div className="space-y-6">
        {sorted.map(widget => {
          if (widget.id === 'kpi') return (
            <WidgetWrapper key="kpi" id="kpi">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard
                  title={t('dashboard.contactsKpi')}
                  value={contactStats?.total ?? '—'}
                  subtitle={`${contactStats?.customers ?? 0} ${t('dashboard.customer')}`}
                  icon={<Users size={18} />}
                  iconColor="text-accent-primary"
                  iconBg="bg-accent-primary/10"
                  loading={!contactStats}
                />
                <KPICard
                  title={t('dashboard.productsKpi')}
                  value={productStats?.total ?? '—'}
                  subtitle={productStats?.lowStock ? `${productStats.lowStock} ${t('dashboard.lowStockCount')}` : undefined}
                  subtitleColor={productStats?.lowStock ? 'text-warning' : undefined}
                  icon={<Package size={18} />}
                  iconColor="text-info"
                  iconBg="bg-info/10"
                  loading={!productStats}
                />
                <KPICard
                  title={t('dashboard.salesKpi')}
                  value={salesStats ? formatCurrency(salesStats.wonThisMonth) : '—'}
                  subtitle={`${salesStats?.wonCount ?? 0} ${t('dashboard.deals')}`}
                  trend={salesStats?.growthRate}
                  icon={<TrendingUp size={18} />}
                  iconColor="text-success"
                  iconBg="bg-success/10"
                  loading={!salesStats}
                />
                <KPICard
                  title={t('dashboard.receivable')}
                  value={debtStats ? formatCurrency(debtStats.receivable.total) : '—'}
                  subtitle={
                    debtStats?.receivable.overdueCount
                      ? `${debtStats.receivable.overdueCount} ${t('dashboard.overdue')}`
                      : `${debtStats?.receivable.count ?? 0} ${t('dashboard.pcs')}`
                  }
                  subtitleColor={debtStats?.receivable.overdueCount ? 'text-danger' : undefined}
                  icon={<DollarSign size={18} />}
                  iconColor={debtStats?.receivable.overdueCount ? 'text-danger' : 'text-warning'}
                  iconBg={debtStats?.receivable.overdueCount ? 'bg-danger/10' : 'bg-warning/10'}
                  loading={!debtStats}
                />
              </div>
            </WidgetWrapper>
          )

          if (widget.id === 'cashRec') return (
            <WidgetWrapper key="cashRec" id="cashRec">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <CashTodayWidget />
                <UpcomingRecurringWidget />
              </div>
            </WidgetWrapper>
          )

          if (widget.id === 'smart') return (
            <WidgetWrapper key="smart" id="smart">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <HealthScoreWidget />
                <SmartAlertsWidget />
              </div>
            </WidgetWrapper>
          )

          if (widget.id === 'charts') return (
            <WidgetWrapper key="charts" id="charts">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2">
                  <DashboardCharts />
                </div>
                <div>
                  <RecommendationsPanel />
                </div>
              </div>
            </WidgetWrapper>
          )

          if (widget.id === 'stats') return (
            <WidgetWrapper key="stats" id="stats">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Pipeline holati */}
                <Card padding="md">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-text-primary text-sm">{t('dashboard.salesPipeline')}</h3>
                    <Link to="/sales">
                      <Button variant="ghost" size="xs" rightIcon={<ArrowRight size={12} />}>
                        {t('dashboard.view')}
                      </Button>
                    </Link>
                  </div>
                  <div className="space-y-2">
                    {[
                      { label: t('dashboard.activeDeals'),   value: salesStats?.activeDeals   ?? '—', color: 'text-accent-primary' },
                      { label: t('dashboard.pipelineValue'), value: salesStats ? formatCurrency(salesStats.pipelineValue) : '—', color: 'text-warning' },
                      { label: t('dashboard.conversion'),    value: salesStats ? `${salesStats.conversionRate}%` : '—', color: salesStats && salesStats.conversionRate >= 50 ? 'text-success' : 'text-warning' },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="flex justify-between items-center py-1.5 border-b border-border-primary/50 last:border-0">
                        <span className="text-xs text-text-secondary">{label}</span>
                        <span className={cn('text-xs font-semibold tabular-nums', color)}>{value}</span>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Xodimlar */}
                <Card padding="md">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-text-primary text-sm">{t('dashboard.employees')}</h3>
                    <Link to="/employees">
                      <Button variant="ghost" size="xs" rightIcon={<ArrowRight size={12} />}>
                        {t('dashboard.view')}
                      </Button>
                    </Link>
                  </div>
                  <div className="space-y-2">
                    {[
                      { label: t('dashboard.totalEmployees'),     value: employeeStats?.total    ?? '—', color: 'text-text-primary' },
                      { label: t('dashboard.permanentEmployees'), value: employeeStats?.permanent ?? '—', color: 'text-accent-primary' },
                      { label: t('dashboard.unpaidSalary'),       value: employeeStats?.unpaidCount ? `${employeeStats.unpaidCount} ${t('dashboard.pcs')}` : '—', color: (employeeStats?.unpaidCount ?? 0) > 0 ? 'text-warning' : 'text-success' },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="flex justify-between items-center py-1.5 border-b border-border-primary/50 last:border-0">
                        <span className="text-xs text-text-secondary">{label}</span>
                        <span className={cn('text-xs font-semibold tabular-nums', color)}>{value}</span>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Qarzlar holati */}
                <Card padding="md">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-text-primary text-sm">{t('dashboard.debtStatus')}</h3>
                    <Link to="/debts">
                      <Button variant="ghost" size="xs" rightIcon={<ArrowRight size={12} />}>
                        {t('dashboard.view')}
                      </Button>
                    </Link>
                  </div>
                  <div className="space-y-2">
                    {[
                      { label: t('dashboard.debtor'),     value: debtStats ? formatCurrency(debtStats.receivable.total) : '—', color: 'text-success' },
                      { label: t('dashboard.creditor'),   value: debtStats ? formatCurrency(debtStats.payable.total) : '—',    color: 'text-warning' },
                      { label: t('dashboard.netBalance'), value: debtStats ? formatCurrency(Math.abs(debtStats.netBalance)) : '—', color: (debtStats?.netBalance ?? 0) >= 0 ? 'text-success' : 'text-danger' },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="flex justify-between items-center py-1.5 border-b border-border-primary/50 last:border-0">
                        <span className="text-xs text-text-secondary">{label}</span>
                        <span className={cn('text-xs font-semibold tabular-nums', color)}>{value}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </WidgetWrapper>
          )

          if (widget.id === 'quick') return (
            <WidgetWrapper key="quick" id="quick">
              <Card padding="md">
                <h3 className="font-semibold text-text-primary mb-4 text-sm">{t('dashboard.quickAccess')}</h3>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                  {QUICK_LINKS.map(({ to, icon: Icon, labelKey, color, bg }) => (
                    <Link
                      key={to}
                      to={to}
                      className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border-primary hover:border-border-secondary hover:bg-bg-tertiary transition-all group"
                    >
                      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', bg)}>
                        <Icon size={18} className={color} />
                      </div>
                      <span className="text-xs text-text-secondary group-hover:text-text-primary transition-colors text-center">
                        {t(labelKey)}
                      </span>
                    </Link>
                  ))}
                </div>
              </Card>
            </WidgetWrapper>
          )

          return null
        })}
      </div>

      {/* AssistantWidget AppLayout'da global qo'yilgan, bu yerda alohida tugma kerak emas */}
    </div>
  )
}
