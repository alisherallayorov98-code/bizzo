import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, FileText, AlertTriangle, CheckCircle, Clock, XCircle, Search,
} from 'lucide-react'
import { PageHeader }       from '@components/layout/PageHeader/PageHeader'
import { Card }             from '@components/ui/Card/Card'
import { Button }           from '@components/ui/Button/Button'
import { Badge }            from '@components/ui/Badge/Badge'
import { KPICard }          from '@components/charts/KPICard/KPICard'
import { EmptyState }       from '@components/ui/EmptyState/EmptyState'
import { TableRowSkeleton } from '@components/ui/Skeleton/Skeleton'
import { useContracts, useExpiringContracts } from '@features/contracts/hooks/useContracts'
import type { ContractDto } from '@services/contracts.service'
import { formatCurrency, formatDate } from '@utils/formatters'
import { useT }       from '@i18n/index'
import { cn }         from '@utils/cn'
import { useDebounce } from '@hooks/useDebounce'

const STATUS_CFG = {
  DRAFT:     { labelKey: 'contracts.draft',     variant: 'default'  as const },
  ACTIVE:    { labelKey: 'contracts.active',    variant: 'success'  as const },
  COMPLETED: { labelKey: 'contracts.completed', variant: 'primary'  as const },
  CANCELED:  { labelKey: 'contracts.canceled',  variant: 'danger'   as const },
}

const TYPE_CFG: Record<string, { labelKey: string; variant: 'primary'|'info'|'warning'|'default' }> = {
  SALE:     { labelKey: 'contracts.typeSale',     variant: 'primary' },
  PURCHASE: { labelKey: 'contracts.typePurchase', variant: 'info'    },
  SERVICE:  { labelKey: 'contracts.typeService',  variant: 'warning' },
  RENT:     { labelKey: 'contracts.typeRent',     variant: 'default' },
  OTHER:    { labelKey: 'contracts.typeOther',    variant: 'default' },
}

export default function ContractsListPage() {
  const t        = useT()
  const navigate = useNavigate()
  const [search,       setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter,   setTypeFilter]   = useState('')
  const debouncedSearch = useDebounce(search, 300)

  const { data, isLoading } = useContracts({
    search: debouncedSearch || undefined,
    status: statusFilter    || undefined,
    type:   typeFilter      || undefined,
  })
  const { data: expiring } = useExpiringContracts(30)

  const contracts: ContractDto[] = data?.data || []
  const meta = data?.meta

  const kpiActive   = contracts.filter(c => c.status === 'ACTIVE').length
  const kpiDraft    = contracts.filter(c => c.status === 'DRAFT').length
  const expiringN   = expiring?.length || 0

  const STATUS_TABS = [
    { id: '',          label: t('common.all')           },
    { id: 'DRAFT',     label: t('contracts.draft')      },
    { id: 'ACTIVE',    label: t('contracts.active')     },
    { id: 'COMPLETED', label: t('contracts.completed')  },
    { id: 'CANCELED',  label: t('contracts.canceled')   },
  ]

  return (
    <div>
      <PageHeader
        title={t('contracts.title')}
        description={t('contracts.titleDesc')}
        breadcrumbs={[
          { label: t('nav.dashboard'), path: '/dashboard' },
          { label: t('contracts.title') },
        ]}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" leftIcon={<FileText size={14} />}
              onClick={() => navigate('/contracts/templates')}>
              {t('contracts.templates')}
            </Button>
            <Button variant="primary" size="sm" leftIcon={<Plus size={14} />}
              onClick={() => navigate('/contracts/new')}>
              {t('contracts.newContract')}
            </Button>
          </div>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard title={t('contracts.kpiTotal')} value={meta?.total ?? contracts.length}
          icon={<FileText size={18} />} iconColor="text-accent-primary" iconBg="bg-accent-subtle"
          loading={isLoading} />
        <KPICard title={t('contracts.kpiActive')} value={kpiActive}
          icon={<CheckCircle size={18} />} iconColor="text-success" iconBg="bg-success/10"
          loading={isLoading} />
        <KPICard title={t('contracts.kpiDraft')} value={kpiDraft}
          icon={<Clock size={18} />} iconColor="text-warning" iconBg="bg-warning/10"
          loading={isLoading} />
        <KPICard title={t('contracts.kpiExpiring')} value={expiringN}
          icon={<AlertTriangle size={18} />}
          iconColor={expiringN > 0 ? 'text-danger' : 'text-text-muted'}
          iconBg={expiringN > 0 ? 'bg-danger/10' : 'bg-bg-tertiary'}
          loading={isLoading} />
      </div>

      {/* Expiring banner */}
      {expiringN > 0 && (
        <div className="flex items-center gap-3 p-3 mb-4 bg-warning/5 border border-warning/20 rounded-lg">
          <AlertTriangle size={15} className="text-warning shrink-0" />
          <p className="text-sm text-text-primary">
            <span className="font-semibold text-warning">{expiringN}</span>{' '}
            {t('contracts.expiringWarning')}
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder={t('common.search')}
            className="w-full h-9 pl-8 pr-3 rounded-md text-sm bg-bg-tertiary text-text-primary border border-border-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/50" />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="h-9 rounded-md text-sm bg-bg-tertiary text-text-primary border border-border-primary px-3 focus:outline-none">
          <option value="">{t('contracts.allTypes')}</option>
          {Object.entries(TYPE_CFG).map(([val, cfg]) => (
            <option key={val} value={val}>{t(cfg.labelKey as any)}</option>
          ))}
        </select>
      </div>

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

      {/* Table */}
      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-primary">
                {[t('contracts.colNumber'), t('common.contact'), t('contracts.colTitle'), t('contracts.colType'),
                  t('contracts.colAmount'), t('contracts.colEndDate'), t('contracts.colStatus'), ''].map((h, i) => (
                  <th key={i} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} cols={7} />)
              ) : !contracts.length ? (
                <tr>
                  <td colSpan={8}>
                    <EmptyState icon={<FileText size={28} />}
                      title={t('contracts.noContracts')}
                      description={t('contracts.noContractsDesc')}
                      action={{ label: t('contracts.newContract'), onClick: () => navigate('/contracts/new') }} />
                  </td>
                </tr>
              ) : contracts.map((c) => {
                  const stCfg  = STATUS_CFG[c.status as keyof typeof STATUS_CFG] || STATUS_CFG.DRAFT
                  const typCfg = TYPE_CFG[c.type] || TYPE_CFG.OTHER
                  const isExpiringSoon = expiring?.some(e => e.id === c.id)

                  return (
                    <tr key={c.id} onClick={() => navigate(`/contracts/${c.id}`)}
                      className="border-b border-border-primary hover:bg-bg-tertiary/50 transition-colors cursor-pointer group">
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono text-accent-primary">{c.contractNumber}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-text-secondary truncate max-w-[160px] block">
                          {(c as any).contact?.name || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm text-text-primary font-medium truncate max-w-[200px]">{c.title}</span>
                          {isExpiringSoon && <AlertTriangle size={11} className="text-warning" />}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={typCfg.variant} size="sm">{t(typCfg.labelKey as any)}</Badge>
                      </td>
                      <td className="px-4 py-3 text-sm tabular-nums font-medium text-text-primary">
                        {c.totalAmount ? formatCurrency(c.totalAmount) : '—'}
                      </td>
                      <td className={cn('px-4 py-3 text-sm', isExpiringSoon ? 'text-warning font-medium' : 'text-text-secondary')}>
                        {c.endDate ? formatDate(c.endDate, 'short') : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={stCfg.variant} size="sm">{t(stCfg.labelKey as any)}</Badge>
                      </td>
                      <td className="px-4 py-3 w-8">
                        <XCircle size={14} className="opacity-0 group-hover:opacity-0" />
                      </td>
                    </tr>
                  )
                })
              }
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
