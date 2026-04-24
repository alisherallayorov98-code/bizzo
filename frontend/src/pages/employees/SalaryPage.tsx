import { useState } from 'react'
import { CheckCircle, Clock, DollarSign, Users, Plus, Calendar } from 'lucide-react'
import { PageHeader } from '@components/layout/PageHeader/PageHeader'
import { Button } from '@components/ui/Button/Button'
import { Card } from '@components/ui/Card/Card'
import { Badge } from '@components/ui/Badge/Badge'
import { KPICard } from '@components/charts/KPICard/KPICard'
import { Modal } from '@components/ui/Modal/Modal'
import { Input } from '@components/ui/Input/Input'
import { Skeleton } from '@components/ui/Skeleton/Skeleton'
import { BulkActionBar } from '@components/ui/BulkActionBar/BulkActionBar'
import {
  useSalaryHistory, useMarkSalaryPaid,
  useCreateSalaryRecord, useEmployeeStats,
  useBulkMarkSalaryPaid, useEmployees,
} from '@features/employees/hooks/useEmployees'
import type { SalaryHistoryItem } from '@services/employee.service'
import { formatCurrency } from '@utils/formatters'
import { useT } from '@i18n/index'
import { cn } from '@utils/cn'

const MONTH_KEYS = [
  'employees.jan', 'employees.feb', 'employees.mar', 'employees.apr',
  'employees.may_', 'employees.jun', 'employees.jul', 'employees.aug',
  'employees.sep', 'employees.oct', 'employees.nov', 'employees.dec',
] as const

function SalaryModal({
  open, onClose, item, month, year,
}: {
  open:     boolean
  onClose:  () => void
  item:     SalaryHistoryItem | null
  month:    number
  year:     number
}) {
  const t = useT()
  const [form, setForm] = useState({ bonus: '0', deduction: '0', advance: '0', notes: '' })
  const create = useCreateSalaryRecord()

  if (!item) return null

  const baseSalary = item.baseSalary
  const bonus      = parseFloat(form.bonus)     || 0
  const deduction  = parseFloat(form.deduction) || 0
  const advance    = parseFloat(form.advance)   || 0
  const total      = baseSalary + bonus - deduction - advance

  const handleSubmit = async () => {
    await create.mutateAsync({
      employeeId: item.id,
      month, year, bonus, deduction, advance,
      notes: form.notes || undefined,
    })
    setForm({ bonus: '0', deduction: '0', advance: '0', notes: '' })
    onClose()
  }

  const monthName = t(MONTH_KEYS[month - 1])

  return (
    <Modal open={open} onClose={onClose} title={t('employees.salaryModalTitle')}
      description={`${item.name} — ${monthName} ${year}`} size="sm"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant="primary" size="sm" loading={create.isPending} onClick={handleSubmit} disabled={total < 0}>
            {t('common.create')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between p-3 rounded-lg bg-bg-tertiary border border-border-primary">
          <span className="text-sm text-text-secondary">{t('employees.baseSalaryLabel')}</span>
          <span className="text-sm font-semibold tabular-nums text-text-primary">
            {formatCurrency(baseSalary)}
          </span>
        </div>

        <Input label={t('employees.bonusLabel')} type="number" placeholder="0"
          value={form.bonus} onChange={e => setForm(f => ({ ...f, bonus: e.target.value }))} />
        <Input label={t('employees.deductionLabel')} type="number" placeholder="0"
          hint={t('employees.deductionHint')} value={form.deduction}
          onChange={e => setForm(f => ({ ...f, deduction: e.target.value }))} />
        <Input label={t('employees.advanceSalaryLabel')} type="number" placeholder="0"
          hint={t('employees.advanceHint')} value={form.advance}
          onChange={e => setForm(f => ({ ...f, advance: e.target.value }))} />

        <div className={cn('p-3 rounded-lg border space-y-1.5 text-sm',
          total < 0 ? 'bg-danger/5 border-danger/30' : 'bg-success/5 border-success/30')}>
          <div className="flex justify-between text-text-secondary">
            <span>{t('employees.baseSalaryLabel')}</span>
            <span className="tabular-nums">{formatCurrency(baseSalary)}</span>
          </div>
          {bonus > 0 && (
            <div className="flex justify-between text-success">
              <span>+ {t('employees.colBonus')}</span>
              <span className="tabular-nums">+{formatCurrency(bonus)}</span>
            </div>
          )}
          {deduction > 0 && (
            <div className="flex justify-between text-danger">
              <span>- {t('employees.colDeduction')}</span>
              <span className="tabular-nums">-{formatCurrency(deduction)}</span>
            </div>
          )}
          {advance > 0 && (
            <div className="flex justify-between text-warning">
              <span>- {t('employees.colAdvance')}</span>
              <span className="tabular-nums">-{formatCurrency(advance)}</span>
            </div>
          )}
          <div className="border-t border-border-primary pt-1.5 flex justify-between font-semibold">
            <span className={total < 0 ? 'text-danger' : 'text-text-primary'}>
              {t('employees.totalPayment')}
            </span>
            <span className={cn('tabular-nums', total < 0 ? 'text-danger' : 'text-success')}>
              {formatCurrency(total)}
            </span>
          </div>
        </div>

        {total < 0 && (
          <p className="text-xs text-danger text-center">{t('employees.negativeError')}</p>
        )}

        <Input label={t('common.notesOptional')} placeholder="Qo'shimcha ma'lumot..."
          value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
      </div>
    </Modal>
  )
}

export default function SalaryPage() {
  const t = useT()
  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1)
  const [selectedYear,  setSelectedYear]  = useState(now.getFullYear())
  const [salaryModal,   setSalaryModal]   = useState<SalaryHistoryItem | null>(null)
  const [selectedIds,   setSelectedIds]   = useState<Set<string>>(new Set())
  const [activeTab,     setActiveTab]     = useState<'monthly' | 'weekly' | 'advances'>('monthly')

  const { data: stats }              = useEmployeeStats()
  const { data: history, isLoading } = useSalaryHistory(selectedMonth, selectedYear)
  const { data: dailyEmployees }     = useEmployees({ employeeType: 'DAILY', isActive: true, limit: 100 })
  const markPaid                     = useMarkSalaryPaid()
  const bulkPay                      = useBulkMarkSalaryPaid()

  const unpaidRecords = (history ?? []).filter((e: SalaryHistoryItem) => e.record && !e.record.isPaid)

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const totalPayable = history?.reduce(
    (sum: number, emp: SalaryHistoryItem) =>
      sum + (emp.record?.totalAmount ?? emp.baseSalary),
    0,
  ) ?? 0

  const paidCount   = history?.filter((e: SalaryHistoryItem) => e.record?.isPaid).length   ?? 0
  const unpaidCount = history?.filter((e: SalaryHistoryItem) => e.record && !e.record.isPaid).length ?? 0

  const HEADERS = [
    '', t('employees.colEmployee'), t('employees.colPosition'), t('employees.colBasic'),
    t('employees.colBonus'), t('employees.colDeduction'), t('employees.colAdvance'),
    t('employees.colTotal'), t('employees.colStatus'), '',
  ]

  return (
    <div>
      <PageHeader
        title={t('employees.salaryTitle')}
        description={t('employees.salaryDesc')}
        breadcrumbs={[
          { label: t('nav.dashboard'), path: '/dashboard' },
          { label: t('nav.employees'), path: '/employees' },
          { label: t('employees.salaryTitle') },
        ]}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard title={t('employees.total')} value={stats?.total ?? '—'}
          icon={<Users size={18} />} iconColor="text-accent-primary" iconBg="bg-accent-primary/10" loading={!stats} />
        <KPICard title={t('employees.monthPayment')} value={formatCurrency(totalPayable)}
          icon={<DollarSign size={18} />} iconColor="text-success" iconBg="bg-success/10" />
        <KPICard title={t('employees.paidBadge')} value={paidCount}
          subtitle={t('employees.employeesCount')}
          icon={<CheckCircle size={18} />} iconColor="text-success" iconBg="bg-success/10" />
        <KPICard title={t('employees.unpaid')} value={unpaidCount}
          subtitle={t('employees.employeesCount')}
          icon={<Clock size={18} />}
          iconColor={unpaidCount > 0 ? 'text-warning' : 'text-text-muted'}
          iconBg={unpaidCount > 0 ? 'bg-warning/10' : 'bg-bg-elevated'} />
      </div>

      <Card padding="sm" className="mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm font-medium text-text-secondary">{t('employees.monthSelectorLabel')}</span>
          <div className="flex flex-wrap gap-1.5">
            {MONTH_KEYS.map((key, i) => (
              <button key={i} onClick={() => setSelectedMonth(i + 1)}
                className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  selectedMonth === i + 1
                    ? 'bg-accent-primary text-white'
                    : 'text-text-secondary hover:bg-bg-tertiary border border-border-primary')}>
                {t(key)}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 ml-2">
            {[now.getFullYear() - 1, now.getFullYear()].map(y => (
              <button key={y} onClick={() => setSelectedYear(y)}
                className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-all border',
                  selectedYear === y
                    ? 'border-accent-primary bg-accent-primary/10 text-accent-primary'
                    : 'border-border-primary text-text-secondary hover:border-border-secondary')}>
                {y}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Tab selector */}
      <div className="flex gap-1 mb-4">
        {([
          ['monthly',  'Oylik maosh',   DollarSign],
          ['weekly',   'Haftalik (kunlik)', Calendar],
          ['advances', 'Avans tarixi',  Clock],
        ] as const).map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              activeTab === id
                ? 'bg-accent-primary text-white shadow-sm'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary border border-border-primary',
            )}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Weekly tab */}
      {activeTab === 'weekly' && (
        <Card padding="none">
          <div className="px-4 py-3 border-b border-border-primary">
            <h3 className="font-semibold text-text-primary">Kunlik xodimlar — {t(MONTH_KEYS[selectedMonth - 1])} {selectedYear}</h3>
          </div>
          {!dailyEmployees?.data?.length ? (
            <div className="py-8 text-center text-text-muted text-sm">Kunlik xodimlar yo'q</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-bg-tertiary text-text-muted">
                <tr>
                  {['Xodim', 'Lavozim', 'Kunlik stavka', 'Bu oydagi holat'].map(h => (
                    <th key={h} className="px-4 py-2 text-left text-xs font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(dailyEmployees?.data ?? []).map((emp: any) => {
                  const record = history?.find((h: SalaryHistoryItem) => h.id === emp.id)
                  return (
                    <tr key={emp.id} className="border-t border-border-primary hover:bg-bg-tertiary">
                      <td className="px-4 py-3 font-medium">{emp.firstName} {emp.lastName}</td>
                      <td className="px-4 py-3 text-text-secondary">{emp.position ?? '—'}</td>
                      <td className="px-4 py-3 tabular-nums text-accent-primary font-medium">{formatCurrency(emp.dailyRate)}</td>
                      <td className="px-4 py-3">
                        {record?.record ? (
                          <Badge variant={record.record.isPaid ? 'success' : 'warning'} size="sm">
                            {record.record.isPaid ? "To'langan" : `${formatCurrency(record.record.totalAmount)} — Kutilmoqda`}
                          </Badge>
                        ) : (
                          <span className="text-xs text-text-muted">Yozuv yo'q</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {/* Advances tab */}
      {activeTab === 'advances' && (
        <Card padding="none">
          <div className="px-4 py-3 border-b border-border-primary">
            <h3 className="font-semibold text-text-primary">Avans tarixi — {t(MONTH_KEYS[selectedMonth - 1])} {selectedYear}</h3>
          </div>
          {!history?.filter((e: SalaryHistoryItem) => (e.record?.advance ?? 0) > 0).length ? (
            <div className="py-8 text-center text-text-muted text-sm">Bu oyda avans berilmagan</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-bg-tertiary text-text-muted">
                <tr>
                  {['Xodim', 'Lavozim', 'Avans summasi', 'Ish haqi', 'Sof'].map(h => (
                    <th key={h} className="px-4 py-2 text-left text-xs font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(history ?? [])
                  .filter((e: SalaryHistoryItem) => (e.record?.advance ?? 0) > 0)
                  .map((emp: SalaryHistoryItem) => (
                    <tr key={emp.id} className="border-t border-border-primary hover:bg-bg-tertiary">
                      <td className="px-4 py-3 font-medium">{emp.name}</td>
                      <td className="px-4 py-3 text-text-secondary">{emp.position ?? '—'}</td>
                      <td className="px-4 py-3 tabular-nums text-warning font-medium">
                        -{formatCurrency(emp.record?.advance ?? 0)}
                      </td>
                      <td className="px-4 py-3 tabular-nums">{formatCurrency(emp.record?.baseSalary ?? emp.baseSalary)}</td>
                      <td className="px-4 py-3 tabular-nums font-semibold">
                        {formatCurrency((emp.record?.totalAmount ?? 0))}
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          )}
        </Card>
      )}

      {activeTab === 'monthly' && <Card padding="none">
        <div className="flex items-center justify-between p-4 border-b border-border-primary">
          <div>
            <h3 className="font-semibold text-text-primary">
              {t('employees.salaryListTitle', { month: t(MONTH_KEYS[selectedMonth - 1]), year: selectedYear })}
            </h3>
            <p className="text-xs text-text-muted mt-0.5">{t('employees.salaryListDesc')}</p>
          </div>
        </div>

        <BulkActionBar
          selectedCount={selectedIds.size}
          totalCount={unpaidRecords.length}
          onSelectAll={() => setSelectedIds(new Set(unpaidRecords.map((e: SalaryHistoryItem) => e.record!.id)))}
          onClearAll={() => setSelectedIds(new Set())}
          actions={[{
            label:   `To'lash (${selectedIds.size})`,
            variant: 'primary',
            loading: bulkPay.isPending,
            onClick: async () => {
              await bulkPay.mutateAsync(Array.from(selectedIds))
              setSelectedIds(new Set())
            },
          }]}
        />

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
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-border-primary">
                    {Array.from({ length: 10 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton className="h-4 rounded" style={{ width: '70%' }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : !history?.length ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-sm text-text-muted">
                    {t('employees.notFoundThisMonth')}
                  </td>
                </tr>
              ) : (
                history.map((emp: SalaryHistoryItem) => (
                  <tr key={emp.id}
                    className="border-b border-border-primary hover:bg-bg-tertiary/50 transition-colors group">
                    <td className="px-3 py-3 w-8">
                      {emp.record && !emp.record.isPaid && (
                        <input
                          type="checkbox"
                          checked={selectedIds.has(emp.record.id)}
                          onChange={() => toggleSelect(emp.record!.id)}
                          className="w-4 h-4 rounded border-border-primary accent-accent-primary cursor-pointer"
                        />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-accent-primary/20 flex items-center justify-center shrink-0">
                          <span className="text-[11px] font-bold text-accent-primary">
                            {emp.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-text-primary">{emp.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-text-secondary">{emp.position ?? '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm tabular-nums text-text-primary">
                        {formatCurrency(emp.record?.baseSalary ?? emp.baseSalary)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('text-sm tabular-nums',
                        (emp.record?.bonus ?? 0) > 0 ? 'text-success' : 'text-text-muted')}>
                        {(emp.record?.bonus ?? 0) > 0 ? `+${formatCurrency(emp.record!.bonus)}` : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('text-sm tabular-nums',
                        (emp.record?.deduction ?? 0) > 0 ? 'text-danger' : 'text-text-muted')}>
                        {(emp.record?.deduction ?? 0) > 0 ? `-${formatCurrency(emp.record!.deduction)}` : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('text-sm tabular-nums',
                        (emp.record?.advance ?? 0) > 0 ? 'text-warning' : 'text-text-muted')}>
                        {(emp.record?.advance ?? 0) > 0 ? `-${formatCurrency(emp.record!.advance)}` : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {emp.record ? (
                        <span className="text-sm font-semibold tabular-nums text-text-primary">
                          {formatCurrency(emp.record.totalAmount)}
                        </span>
                      ) : (
                        <span className="text-sm text-text-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {emp.record ? (
                        emp.record.isPaid ? (
                          <Badge variant="success" size="sm">{t('employees.paidBadge')}</Badge>
                        ) : (
                          <Badge variant="warning" size="sm">{t('employees.statusPending')}</Badge>
                        )
                      ) : (
                        <Badge variant="default" size="sm">{t('employees.statusNotCalc')}</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!emp.record ? (
                          <Button variant="secondary" size="xs" leftIcon={<Plus size={11} />}
                            onClick={() => setSalaryModal(emp)}>
                            {t('employees.calculateBtn')}
                          </Button>
                        ) : !emp.record.isPaid ? (
                          <Button variant="primary" size="xs" loading={markPaid.isPending}
                            onClick={() => markPaid.mutate(emp.record!.id)}>
                            {t('employees.payBtn')}
                          </Button>
                        ) : (
                          <span className="text-xs text-success font-medium">
                            {emp.record.paidAt
                              ? new Date(emp.record.paidAt).toLocaleDateString('uz-UZ')
                              : t('employees.paidBadge')}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>}

      <SalaryModal open={!!salaryModal} onClose={() => setSalaryModal(null)}
        item={salaryModal} month={selectedMonth} year={selectedYear} />
    </div>
  )
}
