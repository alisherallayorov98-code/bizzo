import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Search, Users, Clock, DollarSign, Download,
  Phone, Building2, Eye, Edit2, Trash2, AlertCircle,
} from 'lucide-react'
import { exportToExcel } from '@utils/exporters'
import { PageHeader } from '@components/layout/PageHeader/PageHeader'
import { Button } from '@components/ui/Button/Button'
import { Input } from '@components/ui/Input/Input'
import { Card } from '@components/ui/Card/Card'
import { Badge } from '@components/ui/Badge/Badge'
import { KPICard } from '@components/charts/KPICard/KPICard'
import { TableRowSkeleton } from '@components/ui/Skeleton/Skeleton'
import { Pagination }       from '@components/ui/Pagination/Pagination'
import { EmptyState } from '@components/ui/EmptyState/EmptyState'
import { ConfirmDialog } from '@components/ui/Modal/Modal'
import { EmployeeFormModal } from '@features/employees/components/EmployeeFormModal'
import {
  useEmployees, useEmployeeStats, useUpdateEmployee,
} from '@features/employees/hooks/useEmployees'
import type { Employee } from '@services/employee.service'
import { formatCurrency, formatPhone } from '@utils/formatters'
import { cn } from '@utils/cn'
import { useDebounce } from '@hooks/useDebounce'
import { useT } from '@i18n/index'

// ============================================
// TUR BADGE
// ============================================
const TYPE_MAP = {
  PERMANENT: { labelKey: 'employees.permanent',   variant: 'success' as const },
  DAILY:     { labelKey: 'employees.daily',       variant: 'warning' as const },
  CONTRACT:  { labelKey: 'employees.contractLabel', variant: 'info' as const },
}

function EmployeeTypeBadge({ type }: { type: Employee['employeeType'] }) {
  const t = useT()
  const cfg = TYPE_MAP[type]
  return <Badge variant={cfg.variant} size="sm">{t(cfg.labelKey)}</Badge>
}

// ============================================
// XODIM QATORI
// ============================================
function EmployeeRow({
  employee,
  onEdit,
  onDelete,
  onView,
}: {
  employee: Employee
  onEdit:   (e: Employee) => void
  onDelete: (e: Employee) => void
  onView:   (e: Employee) => void
}) {
  const t = useT()
  const initials = `${employee.firstName[0]}${employee.lastName[0]}`.toUpperCase()

  return (
    <tr className="border-b border-border-primary hover:bg-bg-tertiary/50 transition-colors group">

      {/* Xodim */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-accent-primary/20 border border-accent-primary/20 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-accent-primary">{initials}</span>
          </div>
          <div className="min-w-0">
            <button
              onClick={() => onView(employee)}
              className="text-sm font-medium text-text-primary hover:text-accent-primary transition-colors truncate block max-w-[200px] text-left"
            >
              {employee.lastName} {employee.firstName}
            </button>
            {employee.department && (
              <div className="flex items-center gap-1 text-xs text-text-muted">
                <Building2 size={10} />
                {employee.department}
              </div>
            )}
          </div>
        </div>
      </td>

      {/* Tur */}
      <td className="px-4 py-3">
        <EmployeeTypeBadge type={employee.employeeType} />
      </td>

      {/* Lavozim */}
      <td className="px-4 py-3">
        <span className="text-sm text-text-secondary truncate block max-w-[150px]">
          {employee.position ?? '—'}
        </span>
      </td>

      {/* Telefon */}
      <td className="px-4 py-3">
        {employee.phone ? (
          <a
            href={`tel:${employee.phone}`}
            className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            <Phone size={12} className="text-text-muted" />
            {formatPhone(employee.phone)}
          </a>
        ) : (
          <span className="text-text-muted text-sm">—</span>
        )}
      </td>

      {/* Maosh */}
      <td className="px-4 py-3 text-right">
        {employee.employeeType === 'DAILY' ? (
          <div>
            <p className="text-sm font-medium tabular-nums text-text-primary">
              {formatCurrency(employee.dailyRate)}
            </p>
            <p className="text-[11px] text-text-muted">{t('employees.dailyLabel')}</p>
          </div>
        ) : employee.baseSalary > 0 ? (
          <p className="text-sm font-medium tabular-nums text-text-primary">
            {formatCurrency(employee.baseSalary)}
          </p>
        ) : (
          <span className="text-text-muted text-sm">—</span>
        )}
      </td>

      {/* Amallar */}
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="xs" onClick={() => onView(employee)}>
            <Eye size={13} />
          </Button>
          <Button variant="ghost" size="xs" onClick={() => onEdit(employee)}>
            <Edit2 size={13} />
          </Button>
          <Button
            variant="ghost"
            size="xs"
            onClick={() => onDelete(employee)}
            className="hover:text-danger hover:bg-danger/10"
          >
            <Trash2 size={13} />
          </Button>
        </div>
      </td>
    </tr>
  )
}

// ============================================
// FILTER TABS
// ============================================
const TABS = [
  { id: 'ALL',       tKey: 'common.all',             label: 'Barchasi' },
  { id: 'PERMANENT', tKey: 'employees.permanent',    label: 'Doimiy' },
  { id: 'DAILY',     tKey: 'employees.daily',        label: 'Kunlik' },
  { id: 'CONTRACT',  tKey: 'employees.contract',     label: 'Shartnomaviy' },
]

// ============================================
// ASOSIY SAHIFA
// ============================================
export default function EmployeesListPage() {
  const navigate = useNavigate()
  const t = useT()

  const [search,        setSearch]        = useState('')
  const [activeTab,     setActiveTab]     = useState('ALL')
  const [page,          setPage]          = useState(1)
  const [formOpen,      setFormOpen]      = useState(false)
  const [editEmployee,  setEditEmployee]  = useState<Employee | null>(null)
  const [deleteTarget,  setDeleteTarget]  = useState<Employee | null>(null)

  const debouncedSearch = useDebounce(search, 400)
  const handleSearch    = (v: string) => { setSearch(v); setPage(1) }
  const handleTab       = (v: string) => { setActiveTab(v); setPage(1) }
  const updateMutation  = useUpdateEmployee()

  const query = {
    search:       debouncedSearch || undefined,
    employeeType: activeTab !== 'ALL' ? activeTab : undefined,
    page,
    limit:        50,
  }

  const { data, isLoading } = useEmployees(query)
  const { data: stats }     = useEmployeeStats()

  const handleEdit = useCallback((e: Employee) => {
    setEditEmployee(e)
    setFormOpen(true)
  }, [])

  const handleDelete = useCallback((e: Employee) => {
    setDeleteTarget(e)
  }, [])

  const handleView = useCallback((e: Employee) => {
    navigate(`/employees/${e.id}`)
  }, [navigate])

  const handleCloseForm = () => {
    setFormOpen(false)
    setEditEmployee(null)
  }

  const handleExport = () => {
    const rows = (data?.data ?? []).map(e => ({
      firstName:    e.firstName,
      lastName:     e.lastName,
      phone:        e.phone ?? '',
      position:     e.position,
      department:   e.department ?? '',
      employeeType: e.employeeType,
      baseSalary:   Number(e.baseSalary ?? 0),
      dailyRate:    Number(e.dailyRate ?? 0),
      hireDate:     e.hireDate ? new Date(e.hireDate).toLocaleDateString('uz-UZ') : '',
    }))
    exportToExcel([{ name: 'Xodimlar', data: rows }], `bizzo-xodimlar-${new Date().toISOString().slice(0, 10)}`)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    await updateMutation.mutateAsync({ id: deleteTarget.id, data: { isActive: false } })
    setDeleteTarget(null)
  }

  const tabCount: Record<string, number | undefined> = {
    ALL:       stats?.total,
    PERMANENT: stats?.permanent,
    DAILY:     stats?.daily,
    CONTRACT:  stats?.contract,
  }

  return (
    <div>
      <PageHeader
        title={t('nav.employees')}
        description={t('employees.description')}
        breadcrumbs={[
          { label: t('nav.dashboard'), path: '/dashboard' },
          { label: t('nav.employees') },
        ]}
        actions={
          <>
            <Button variant="secondary" size="sm" leftIcon={<Download size={14} />} onClick={handleExport}>
              {t('common.export')}
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus size={14} />}
              onClick={() => setFormOpen(true)}
            >
              {t('employees.newEmployee')}
            </Button>
          </>
        }
      />

      {/* KPI kartalar */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <KPICard
          title={t('employees.total')}
          value={stats?.total ?? '—'}
          icon={<Users size={18} />}
          iconColor="text-accent-primary"
          iconBg="bg-accent-primary/10"
          loading={!stats}
        />
        <KPICard
          title={t('employees.permanent')}
          value={stats?.permanent ?? '—'}
          subtitle={`${stats?.daily ?? 0} ${t('employees.dailyCount')}`}
          icon={<DollarSign size={18} />}
          iconColor="text-success"
          iconBg="bg-success/10"
          loading={!stats}
        />
        <KPICard
          title={t('employees.unpaidMonth')}
          value={stats ? formatCurrency(stats.unpaidTotal) : '—'}
          subtitle={`${stats?.unpaidCount ?? 0} ${t('employees.employeesCount')}`}
          icon={<Clock size={18} />}
          iconColor={stats?.unpaidCount ? 'text-warning' : 'text-text-muted'}
          iconBg={stats?.unpaidCount ? 'bg-warning/10' : 'bg-bg-elevated'}
          loading={!stats}
        />
        <KPICard
          title={t('employees.weeklyDaily')}
          value={stats ? formatCurrency(stats.weeklyUnpaid) : '—'}
          subtitle={t('employees.unpaidShort')}
          icon={<AlertCircle size={18} />}
          iconColor={stats?.weeklyUnpaid ? 'text-danger' : 'text-text-muted'}
          iconBg={stats?.weeklyUnpaid ? 'bg-danger/10' : 'bg-bg-elevated'}
          loading={!stats}
        />
      </div>

      {/* Jadval */}
      <Card padding="none">
        {/* Filtr */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 border-b border-border-primary">
          <Input
            placeholder={t('employees.searchPlaceholder')}
            leftIcon={<Search size={15} />}
            value={search}
            onChange={e => handleSearch(e.target.value)}
            className="sm:max-w-xs"
          />

          <div className="flex items-center gap-1">
            {TABS.map(tab => {
              const count  = tabCount[tab.id]
              const active = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTab(tab.id)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                    active
                      ? 'bg-accent-primary/10 text-accent-primary'
                      : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary',
                  )}
                >
                  {t(tab.tKey)}
                  {count !== undefined && (
                    <span className={cn(
                      'px-1.5 py-0.5 rounded-full text-[10px] font-mono',
                      active
                        ? 'bg-accent-primary/20 text-accent-primary'
                        : 'bg-bg-elevated text-text-muted',
                    )}>
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-primary">
                {[
                  { key: 'emp', label: t('employees.colEmployee'), align: 'left' },
                  { key: 'type', label: t('employees.colType'), align: 'left' },
                  { key: 'pos', label: t('employees.colPosition'), align: 'left' },
                  { key: 'phone', label: t('employees.colPhone'), align: 'left' },
                  { key: 'salary', label: t('employees.colSalary'), align: 'right' },
                  { key: 'actions', label: '', align: 'right' },
                ].map(h => (
                  <th
                    key={h.key}
                    className={cn(
                      'px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-text-muted',
                      h.align === 'right' ? 'text-right' : 'text-left',
                    )}
                  >
                    {h.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRowSkeleton key={i} cols={6} />
                ))
              ) : !data?.data.length ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      icon={<Users size={28} />}
                      title={t('employees.notFound')}
                      description={
                        search
                          ? t('employees.searchEmpty', { query: search })
                          : t('employees.addFirst')
                      }
                      action={
                        !search
                          ? { label: t('employees.addEmployee'), onClick: () => setFormOpen(true) }
                          : undefined
                      }
                    />
                  </td>
                </tr>
              ) : (
                data.data.map(emp => (
                  <EmployeeRow
                    key={emp.id}
                    employee={emp}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onView={handleView}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          page={page}
          totalPages={data?.meta.totalPages ?? 1}
          total={data?.meta.total}
          onPage={setPage}
        />
      </Card>

      <EmployeeFormModal
        open={formOpen}
        onClose={handleCloseForm}
        employee={editEmployee}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title={t('employees.confirmArchive', { name: `${deleteTarget?.lastName ?? ''} ${deleteTarget?.firstName ?? ''}`.trim() })}
        description={t('employees.confirmArchiveDesc')}
        confirmText={t('common.archive')}
        loading={updateMutation.isPending}
      />
    </div>
  )
}
