import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Phone, Building2, Calendar, DollarSign,
  Clock, CheckCircle, Plus, Edit2,
  TrendingUp,
} from 'lucide-react'
import { PageHeader } from '@components/layout/PageHeader/PageHeader'
import { Button } from '@components/ui/Button/Button'
import { Card } from '@components/ui/Card/Card'
import { Badge } from '@components/ui/Badge/Badge'
import { Modal } from '@components/ui/Modal/Modal'
import { Input } from '@components/ui/Input/Input'
import { Skeleton } from '@components/ui/Skeleton/Skeleton'
import { EmployeeFormModal } from '@features/employees/components/EmployeeFormModal'
import {
  useEmployee, useMarkSalaryPaid, useAddDailyWork,
  useMarkWeeklyPaid, useGiveAdvance,
} from '@features/employees/hooks/useEmployees'
import { formatCurrency, formatPhone } from '@utils/formatters'
import { useT } from '@i18n/index'
import { cn } from '@utils/cn'

function DailyWorkModal({
  open, onClose, employeeId, dailyRate,
}: {
  open:       boolean
  onClose:    () => void
  employeeId: string
  dailyRate:  number
}) {
  const t = useT()
  const [workDate, setWorkDate] = useState(new Date().toISOString().slice(0, 10))
  const [hours, setHours]       = useState('8')
  const [notes, setNotes]       = useState('')
  const addWork = useAddDailyWork()

  const hoursNum = parseFloat(hours) || 8
  const amount   = (hoursNum / 8) * dailyRate

  const handleSubmit = async () => {
    await addWork.mutateAsync({
      employeeId,
      workDate,
      hoursWorked: hoursNum,
      notes:       notes || undefined,
    })
    setWorkDate(new Date().toISOString().slice(0, 10))
    setHours('8')
    setNotes('')
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={t('employees.recordWorkModal')} size="sm"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant="primary" size="sm" loading={addWork.isPending} onClick={handleSubmit}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input label={t('construction.dateLabel')} type="date" value={workDate}
          onChange={e => setWorkDate(e.target.value)} />
        <Input label={t('employees.hoursWorkedLabel')} type="number" min="1" max="24" step="0.5"
          value={hours} onChange={e => setHours(e.target.value)}
          hint={t('employees.dailyRateHint', { rate: formatCurrency(dailyRate) })} />
        <div className="p-3 rounded-lg bg-bg-tertiary border border-border-primary flex items-center justify-between">
          <span className="text-sm text-text-secondary">{t('employees.calculatedAmount')}</span>
          <span className="text-sm font-semibold text-success tabular-nums">
            {formatCurrency(amount)}
          </span>
        </div>
        <Input label={t('common.notesOptional')} value={notes}
          onChange={e => setNotes(e.target.value)} placeholder="Qo'shimcha ma'lumot..." />
      </div>
    </Modal>
  )
}

function AdvanceModal({
  open, onClose, employeeId,
}: {
  open:       boolean
  onClose:    () => void
  employeeId: string
}) {
  const t = useT()
  const now = new Date()
  const [amount, setAmount] = useState('')
  const [month, setMonth]   = useState(String(now.getMonth() + 1))
  const [year,  setYear]    = useState(String(now.getFullYear()))
  const [note,  setNote]    = useState('')
  const giveAdvance = useGiveAdvance()

  const handleSubmit = async () => {
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) return
    await giveAdvance.mutateAsync({
      id: employeeId,
      amount: amt,
      month:  parseInt(month),
      year:   parseInt(year),
      note:   note || undefined,
    })
    setAmount('')
    setNote('')
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={t('employees.giveAdvanceModal')} size="sm"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant="primary" size="sm" loading={giveAdvance.isPending} onClick={handleSubmit}
            disabled={!parseFloat(amount) || parseFloat(amount) <= 0}>
            {t('employees.giveBtn')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input label={t('employees.advanceAmountLabel')} type="number" placeholder="500 000"
          value={amount} onChange={e => setAmount(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <Input label={t('employees.monthLabel')} type="number" min="1" max="12"
            value={month} onChange={e => setMonth(e.target.value)} />
          <Input label={t('employees.yearLabel')} type="number"
            value={year} onChange={e => setYear(e.target.value)} />
        </div>
        <Input label={t('common.notesOptional')} value={note}
          onChange={e => setNote(e.target.value)} placeholder="Sabab..." />
      </div>
    </Modal>
  )
}

export default function EmployeeDetailPage() {
  const t = useT()
  const { id }   = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [editOpen,      setEditOpen]      = useState(false)
  const [dailyWorkOpen, setDailyWorkOpen] = useState(false)
  const [advanceOpen,   setAdvanceOpen]   = useState(false)

  const { data: employee, isLoading } = useEmployee(id!)
  const markPaid      = useMarkSalaryPaid()
  const markWeeklyPaid = useMarkWeeklyPaid()

  const TYPE_MAP = {
    PERMANENT: { label: t('employees.permanentEmployee'), variant: 'success' as const },
    DAILY:     { label: t('employees.dailyEmployee'),     variant: 'warning' as const },
    CONTRACT:  { label: t('employees.contract'),          variant: 'info'    as const },
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 rounded-xl" />
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  if (!employee) {
    return (
      <div className="text-center py-12 text-text-muted">{t('employees.employeeNotFound')}</div>
    )
  }

  const typeInfo = TYPE_MAP[employee.employeeType as keyof typeof TYPE_MAP] || TYPE_MAP.PERMANENT

  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)
  const weekStartStr = weekStart.toISOString().slice(0, 10)

  return (
    <div>
      <PageHeader
        title={`${employee.lastName} ${employee.firstName}`}
        description={employee.position ?? t('nav.employees')}
        breadcrumbs={[
          { label: t('nav.dashboard'), path: '/dashboard' },
          { label: t('nav.employees'), path: '/employees' },
          { label: `${employee.lastName} ${employee.firstName}` },
        ]}
        actions={
          <div className="flex items-center gap-2">
            {employee.employeeType === 'DAILY' && (
              <>
                <Button variant="secondary" size="sm" leftIcon={<Plus size={14} />}
                  onClick={() => setDailyWorkOpen(true)}>
                  {t('employees.recordWorkBtn')}
                </Button>
                <Button variant="secondary" size="sm" leftIcon={<CheckCircle size={14} />}
                  loading={markWeeklyPaid.isPending}
                  onClick={() => markWeeklyPaid.mutate({ id: employee.id, weekStart: weekStartStr })}>
                  {t('employees.payWeeklyBtn')}
                </Button>
              </>
            )}
            {employee.employeeType !== 'DAILY' && (
              <Button variant="secondary" size="sm" leftIcon={<DollarSign size={14} />}
                onClick={() => setAdvanceOpen(true)}>
                {t('employees.advanceBtn')}
              </Button>
            )}
            <Button variant="primary" size="sm" leftIcon={<Edit2 size={14} />}
              onClick={() => setEditOpen(true)}>
              {t('employees.editBtn')}
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-accent-primary/20 border-2 border-accent-primary/30 flex items-center justify-center shrink-0">
              <span className="text-2xl font-bold text-accent-primary">
                {employee.firstName[0]}{employee.lastName[0]}
              </span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-primary">
                {employee.lastName} {employee.firstName}
              </h2>
              <Badge variant={typeInfo.variant} size="sm">{typeInfo.label}</Badge>
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-border-primary">
            {employee.phone && (
              <div className="flex items-center gap-2.5 text-sm">
                <Phone size={14} className="text-text-muted shrink-0" />
                <a href={`tel:${employee.phone}`} className="text-text-secondary hover:text-text-primary">
                  {formatPhone(employee.phone)}
                </a>
              </div>
            )}
            {employee.department && (
              <div className="flex items-center gap-2.5 text-sm">
                <Building2 size={14} className="text-text-muted shrink-0" />
                <span className="text-text-secondary">{employee.department}</span>
              </div>
            )}
            {employee.position && (
              <div className="flex items-center gap-2.5 text-sm">
                <TrendingUp size={14} className="text-text-muted shrink-0" />
                <span className="text-text-secondary">{employee.position}</span>
              </div>
            )}
            {employee.hireDate && (
              <div className="flex items-center gap-2.5 text-sm">
                <Calendar size={14} className="text-text-muted shrink-0" />
                <span className="text-text-secondary">
                  {new Date(employee.hireDate).toLocaleDateString('uz-UZ', {
                    day: '2-digit', month: 'long', year: 'numeric',
                  })}
                </span>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-border-primary">
            {employee.employeeType === 'DAILY' ? (
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-muted">{t('employees.dailyRateShort')}</span>
                <span className="text-sm font-semibold text-text-primary tabular-nums">
                  {formatCurrency(employee.dailyRate)}
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-muted">{t('employees.monthlySalaryShort')}</span>
                <span className="text-sm font-semibold text-text-primary tabular-nums">
                  {formatCurrency(employee.baseSalary)}
                </span>
              </div>
            )}
          </div>

          {employee.employeeType === 'DAILY' && employee.monthlyHours > 0 && (
            <div className="p-3 rounded-lg bg-bg-tertiary border border-border-primary">
              <p className="text-xs text-text-muted mb-1">{t('employees.monthlyHoursLabel')}</p>
              <p className="text-lg font-bold text-text-primary">
                {employee.monthlyHours}{' '}
                <span className="text-sm font-normal text-text-muted">{t('employees.hoursUnit')}</span>
              </p>
              <p className="text-xs text-success tabular-nums">
                ≈ {formatCurrency((employee.monthlyHours / 8) * employee.dailyRate)}
              </p>
            </div>
          )}

          {employee.unpaidSalary && (
            <div className="p-3 rounded-lg bg-warning/5 border border-warning/30">
              <p className="text-xs text-warning mb-1">
                {t('employees.unpaidSalaryWaiting', { month: employee.unpaidSalary.month })}
              </p>
              <p className="text-base font-bold text-warning tabular-nums">
                {formatCurrency(employee.unpaidSalary.totalAmount)}
              </p>
              <Button variant="primary" size="xs" className="mt-2 w-full"
                loading={markPaid.isPending}
                onClick={() => markPaid.mutate(employee.unpaidSalary!.id)}>
                {t('employees.markAsPaidBtn')}
              </Button>
            </div>
          )}
        </Card>

        <div className="lg:col-span-2 space-y-4">
          {employee.salaryRecords.length > 0 && (
            <Card>
              <h3 className="font-semibold text-text-primary mb-4">{t('employees.salaryHistoryTitle')}</h3>
              <div className="space-y-2">
                {employee.salaryRecords.map((record: any) => (
                  <div key={record.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border-primary hover:bg-bg-tertiary transition-colors">
                    <div>
                      <p className="text-sm font-medium text-text-primary">
                        {record.year}-{t('employees.yearLabel').toLowerCase()} {record.month}-{t('employees.monthLabel').toLowerCase()}
                      </p>
                      <p className="text-xs text-text-muted">
                        {t('employees.colBasic')}: {formatCurrency(record.baseSalary)}
                        {record.bonus > 0 && <span className="text-success ml-2">+{formatCurrency(record.bonus)}</span>}
                        {record.advance > 0 && <span className="text-warning ml-2">-{formatCurrency(record.advance)} {t('employees.advanceLabel')}</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold tabular-nums text-text-primary">
                        {formatCurrency(record.totalAmount)}
                      </span>
                      {record.isPaid ? (
                        <Badge variant="success" size="sm">{t('employees.paidBadge')}</Badge>
                      ) : (
                        <Button variant="primary" size="xs" loading={markPaid.isPending}
                          onClick={() => markPaid.mutate(record.id)}>
                          {t('employees.payBtn')}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {employee.employeeType === 'DAILY' && employee.dailyWorkRecords.length > 0 && (
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-text-primary">{t('employees.dailyWorkTitle')}</h3>
                <Button variant="secondary" size="xs" leftIcon={<Plus size={11} />}
                  onClick={() => setDailyWorkOpen(true)}>
                  {t('employees.addWorkBtn')}
                </Button>
              </div>
              <div className="space-y-1.5">
                {employee.dailyWorkRecords.map((record: any) => (
                  <div key={record.id}
                    className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-bg-tertiary transition-colors">
                    <div className="flex items-center gap-3">
                      <Clock size={13} className="text-text-muted" />
                      <div>
                        <p className="text-sm text-text-primary">
                          {new Date(record.workDate).toLocaleDateString('uz-UZ', {
                            weekday: 'short', day: '2-digit', month: 'short',
                          })}
                        </p>
                        <p className="text-xs text-text-muted">
                          {record.hoursWorked} {t('employees.hoursUnit')} × {formatCurrency(record.dailyRate)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn('text-sm font-medium tabular-nums',
                        record.isPaid ? 'text-text-muted' : 'text-text-primary')}>
                        {formatCurrency(record.amount)}
                      </span>
                      {record.isPaid ? (
                        <CheckCircle size={14} className="text-success" />
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-warning" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {employee.salaryRecords.length === 0 && employee.dailyWorkRecords.length === 0 && (
            <Card>
              <div className="py-8 text-center text-text-muted">
                <Clock size={32} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm">{t('employees.noRecordsYet')}</p>
              </div>
            </Card>
          )}
        </div>
      </div>

      <EmployeeFormModal open={editOpen} onClose={() => setEditOpen(false)} employee={employee} />

      <DailyWorkModal open={dailyWorkOpen} onClose={() => setDailyWorkOpen(false)}
        employeeId={employee.id} dailyRate={employee.dailyRate} />

      <AdvanceModal open={advanceOpen} onClose={() => setAdvanceOpen(false)}
        employeeId={employee.id} />
    </div>
  )
}
