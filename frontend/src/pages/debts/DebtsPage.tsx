import { useState } from 'react'
import {
  TrendingUp, TrendingDown, AlertCircle,
  DollarSign, Plus, CheckCircle, Search, Download,
} from 'lucide-react'
import { exportToExcel } from '@utils/exporters'
import { PageHeader }       from '@components/layout/PageHeader/PageHeader'
import { Card }             from '@components/ui/Card/Card'
import { Badge }            from '@components/ui/Badge/Badge'
import { Button }           from '@components/ui/Button/Button'
import { Input }            from '@components/ui/Input/Input'
import { KPICard }          from '@components/charts/KPICard/KPICard'
import { Modal }            from '@components/ui/Modal/Modal'
import { TableRowSkeleton } from '@components/ui/Skeleton/Skeleton'
import { EmptyState }       from '@components/ui/EmptyState/EmptyState'
import { useDebts, useDebtStats, useAddDebtPayment } from '@features/debts/hooks/useDebts'
import type { DebtRecord }  from '@services/debt.service'
import { formatCurrency, formatDate, formatPhone } from '@utils/formatters'
import { cn }               from '@utils/cn'
import { useDebounce }      from '@hooks/useDebounce'
import { useT }             from '@i18n/index'

// ============================================
// TO'LOV MODALI
// ============================================
function PaymentModal({
  debt, open, onClose,
}: { debt: DebtRecord | null; open: boolean; onClose: () => void }) {
  const t = useT()
  const [amount, setAmount] = useState('')
  const [notes,  setNotes]  = useState('')
  const addPayment = useAddDebtPayment()

  const maxAmount = debt ? Number(debt.remainAmount) : 0
  const payAmount = Math.min(parseFloat(amount) || 0, maxAmount)

  const handleSubmit = async () => {
    if (!debt || payAmount <= 0) return
    await addPayment.mutateAsync({ debtId: debt.id, amount: payAmount, notes })
    setAmount(''); setNotes('')
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('debts.receivePayment')}
      description={debt?.contact?.name}
      size="sm"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>{t('common.cancel')}</Button>
          <Button
            variant="success"
            size="sm"
            loading={addPayment.isPending}
            onClick={handleSubmit}
            disabled={payAmount <= 0}
          >
            {t('debts.recordPayment')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="p-3 rounded-lg bg-bg-tertiary border border-border-primary space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-text-secondary">{t('debts.totalDebt')}:</span>
            <span className="tabular-nums font-medium">{formatCurrency(debt?.amount || 0)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-text-secondary">{t('debts.paid')}:</span>
            <span className="tabular-nums text-success">{formatCurrency(debt?.paidAmount || 0)}</span>
          </div>
          <div className="flex justify-between text-sm border-t border-border-primary pt-2">
            <span className="text-text-secondary font-medium">{t('debts.remain')}:</span>
            <span className="tabular-nums font-bold text-danger">{formatCurrency(debt?.remainAmount || 0)}</span>
          </div>
        </div>

        <Input
          label={`${t('debts.paymentAmount')} *`}
          type="number"
          placeholder={String(debt?.remainAmount || 0)}
          hint={`${t('debts.maxAmount')}: ${formatCurrency(maxAmount)}`}
          value={amount}
          onChange={e => setAmount(e.target.value)}
        />

        {payAmount > 0 && payAmount >= maxAmount && (
          <div className="flex items-center gap-2 text-xs text-success">
            <CheckCircle size={12} />
            {t('debts.debtFullyClosed')}
          </div>
        )}

        <Input
          label={t('common.notes')}
          placeholder={t('debts.paymentHint')}
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />
      </div>
    </Modal>
  )
}

// ============================================
// ASOSIY SAHIFA
// ============================================
export default function DebtsPage() {
  const t = useT()
  const [activeTab,   setActiveTab]   = useState<'RECEIVABLE' | 'PAYABLE'>('RECEIVABLE')
  const [search,      setSearch]      = useState('')
  const [paymentDebt, setPaymentDebt] = useState<DebtRecord | null>(null)
  const [overdueOnly, setOverdueOnly] = useState(false)

  const debouncedSearch = useDebounce(search, 400)
  const { data: stats } = useDebtStats()
  const { data, isLoading } = useDebts({
    type:      activeTab,
    search:    debouncedSearch || undefined,
    isOverdue: overdueOnly || undefined,
  })

  return (
    <div>
      <PageHeader
        title={t('nav.debts')}
        description={t('debts.description')}
        breadcrumbs={[
          { label: t('nav.dashboard'), path: '/dashboard' },
          { label: t('nav.debts') },
        ]}
        actions={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Download size={14} />}
              onClick={() => {
                const rows = (data?.data ?? []).map((d: any) => ({
                  contact:      d.contact?.name ?? '—',
                  type:         d.type === 'RECEIVABLE' ? 'Debitor' : 'Kreditor',
                  amount:       Number(d.amount),
                  paidAmount:   Number(d.paidAmount),
                  remainAmount: Number(d.remainAmount),
                  dueDate:      d.dueDate ? new Date(d.dueDate).toLocaleDateString('uz-UZ') : '—',
                  isOverdue:    d.isOverdue,
                }))
                exportToExcel([{ name: "Qarzlar", data: rows }], `qarzlar-${activeTab.toLowerCase()}`)
              }}
            >
              Excel
            </Button>
            <Button variant="primary" size="sm" leftIcon={<Plus size={14} />}>
              {t('debts.addDebt')}
            </Button>
          </div>
        }
      />

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard
          title={t('contacts.debtorKpi')}
          value={stats ? formatCurrency(stats.receivable.total) : '—'}
          subtitle={`${stats?.receivable.count ?? 0} ${t('contacts.contactsCount')}`}
          icon={<TrendingUp size={18} />}
          iconColor="text-success"
          iconBg="bg-success/10"
          loading={!stats}
        />
        <KPICard
          title={t('debts.overdueLabel')}
          value={stats ? formatCurrency(stats.receivable.overdue) : '—'}
          subtitle={`${stats?.receivable.overdueCount ?? 0} ${t('common.count')}`}
          icon={<AlertCircle size={18} />}
          iconColor={(stats?.receivable.overdueCount ?? 0) > 0 ? 'text-danger' : 'text-text-muted'}
          iconBg={(stats?.receivable.overdueCount ?? 0) > 0 ? 'bg-danger/10' : 'bg-bg-tertiary'}
          loading={!stats}
        />
        <KPICard
          title={t('contacts.creditorKpi')}
          value={stats ? formatCurrency(stats.payable.total) : '—'}
          subtitle={`${stats?.payable.count ?? 0} ${t('contacts.contactsCount')}`}
          icon={<TrendingDown size={18} />}
          iconColor="text-warning"
          iconBg="bg-warning/10"
          loading={!stats}
        />
        <KPICard
          title={t('debts.netBalance')}
          value={stats ? formatCurrency(Math.abs(stats.netBalance)) : '—'}
          subtitle={
            !stats ? ''
            : stats.netBalance >= 0 ? t('debts.positiveBalance') : t('debts.negativeBalance')
          }
          icon={<DollarSign size={18} />}
          iconColor={
            !stats ? 'text-text-muted'
            : stats.netBalance >= 0 ? 'text-success' : 'text-danger'
          }
          iconBg={
            !stats ? 'bg-bg-tertiary'
            : stats.netBalance >= 0 ? 'bg-success/10' : 'bg-danger/10'
          }
          loading={!stats}
        />
      </div>

      {/* Jadval */}
      <Card padding="none">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 border-b border-border-primary">
          {/* Tip tanlash */}
          <div className="flex gap-1">
            {[
              { id: 'RECEIVABLE', label: t('debts.receivable'), count: stats?.receivable.count },
              { id: 'PAYABLE',    label: t('debts.payable'), count: stats?.payable.count   },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'RECEIVABLE' | 'PAYABLE')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  activeTab === tab.id
                    ? 'bg-accent-primary/10 text-accent-primary'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary',
                )}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span className={cn(
                    'px-1.5 py-0.5 rounded-full text-[10px] font-mono',
                    activeTab === tab.id
                      ? 'bg-accent-primary/20 text-accent-primary'
                      : 'bg-bg-elevated text-text-muted',
                  )}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Qidiruv */}
          <Input
            placeholder={t('debts.contactSearch')}
            leftIcon={<Search size={15} />}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="sm:max-w-xs"
          />

          {/* Muddati o'tgan filtri */}
          <button
            onClick={() => setOverdueOnly(!overdueOnly)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
              overdueOnly
                ? 'border-danger bg-danger/10 text-danger'
                : 'border-border-primary text-text-secondary hover:border-border-secondary',
            )}
          >
            <AlertCircle size={13} />
            {t('debts.overdueFilter')}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-primary">
                {[
                  t('debts.colContact'), t('debts.colTotal'), t('debts.colPaid'),
                  t('debts.colRemain'), t('debts.colDue'), t('debts.colStatus'), '',
                ].map((h, i) => (
                  <th
                    key={i}
                    className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 7 }).map((_, i) => (
                  <TableRowSkeleton key={i} cols={7} />
                ))
              ) : !data?.data?.length ? (
                <tr>
                  <td colSpan={7}>
                    <EmptyState
                      icon={<DollarSign size={28} />}
                      title={overdueOnly ? t('debts.noOverdue') : t('debts.noDebts')}
                      description={t('debts.allOk')}
                    />
                  </td>
                </tr>
              ) : (
                data.data.map((debt: DebtRecord) => {
                  const paidPercent = debt.amount > 0
                    ? (debt.paidAmount / debt.amount) * 100
                    : 0

                  return (
                    <tr
                      key={debt.id}
                      className={cn(
                        'border-b border-border-primary transition-colors group',
                        debt.isOverdue
                          ? 'hover:bg-danger/5 bg-danger/[0.02]'
                          : 'hover:bg-bg-tertiary/50',
                      )}
                    >
                      {/* Kontakt */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          {debt.isOverdue && (
                            <AlertCircle size={14} className="text-danger shrink-0" />
                          )}
                          <div>
                            <p className="text-sm font-medium text-text-primary">
                              {debt.contact?.name}
                            </p>
                            {debt.contact?.phone && (
                              <p className="text-xs text-text-muted">
                                {formatPhone(debt.contact.phone)}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Jami */}
                      <td className="px-4 py-3">
                        <span className="text-sm tabular-nums text-text-secondary">
                          {formatCurrency(debt.amount)}
                        </span>
                      </td>

                      {/* To'langan */}
                      <td className="px-4 py-3">
                        <div>
                          <span className="text-sm tabular-nums text-success">
                            {formatCurrency(debt.paidAmount)}
                          </span>
                          <div className="mt-1 w-20 h-1 rounded-full bg-bg-elevated overflow-hidden">
                            <div
                              className="h-full rounded-full bg-success transition-all"
                              style={{ width: `${paidPercent}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Qoldi */}
                      <td className="px-4 py-3">
                        <span className={cn(
                          'text-sm tabular-nums font-semibold',
                          debt.isOverdue ? 'text-danger' : 'text-text-primary',
                        )}>
                          {formatCurrency(debt.remainAmount)}
                        </span>
                      </td>

                      {/* Muddati */}
                      <td className="px-4 py-3">
                        {debt.dueDate ? (
                          <span className={cn(
                            'text-sm',
                            debt.isOverdue ? 'text-danger font-medium' : 'text-text-secondary',
                          )}>
                            {formatDate(debt.dueDate)}
                          </span>
                        ) : (
                          <span className="text-text-muted text-sm">—</span>
                        )}
                      </td>

                      {/* Holat */}
                      <td className="px-4 py-3">
                        {debt.isOverdue ? (
                          <Badge variant="danger" size="sm" dot pulse>
                            {t('debts.overdueBadge')}
                          </Badge>
                        ) : (
                          <Badge variant="warning" size="sm" dot>
                            {t('debts.pending')}
                          </Badge>
                        )}
                      </td>

                      {/* Amallar */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {activeTab === 'RECEIVABLE' && (
                            <Button
                              variant="success"
                              size="xs"
                              leftIcon={<CheckCircle size={12} />}
                              onClick={() => setPaymentDebt(debt)}
                            >
                              {t('debts.paymentBtn')}
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

      <PaymentModal
        debt={paymentDebt}
        open={!!paymentDebt}
        onClose={() => setPaymentDebt(null)}
      />
    </div>
  )
}
