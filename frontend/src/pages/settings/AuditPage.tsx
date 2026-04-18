import { useState, Fragment } from 'react'
import {
  Shield, AlertTriangle, LogIn,
  Trash2, Edit2, Download, Eye,
  User, Clock, Globe,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Card }     from '@components/ui/Card/Card'
import { Badge }    from '@components/ui/Badge/Badge'
import { Button }   from '@components/ui/Button/Button'
import { Input }    from '@components/ui/Input/Input'
import { TableRowSkeleton } from '@components/ui/Skeleton/Skeleton'
import { EmptyState }       from '@components/ui/EmptyState/EmptyState'
import api                  from '@config/api'
import { formatDateTime }   from '@utils/formatters'
import { cn }               from '@utils/cn'
import { useDebounce }      from '@hooks/useDebounce'
import { useT }             from '@i18n/index'

// ============================================
// ACTION KONFIGURATSIYASI
// ============================================
type Variant = 'success' | 'danger' | 'warning' | 'info' | 'primary' | 'default'

const ACTION_CONFIG: Record<string, { label: string; variant: Variant; icon: any }> = {
  CREATE:             { label: 'Yaratildi',      variant: 'success', icon: Edit2    },
  UPDATE:             { label: 'Yangilandi',     variant: 'primary', icon: Edit2    },
  DELETE:             { label: "O'chirildi",     variant: 'danger',  icon: Trash2   },
  LOGIN_SUCCESS:      { label: 'Kirdi',          variant: 'success', icon: LogIn    },
  LOGIN_FAILED:       { label: 'Kirib olmadi',   variant: 'danger',  icon: LogIn    },
  LOGOUT:             { label: 'Chiqdi',         variant: 'default', icon: LogIn    },
  EXPORT:             { label: 'Eksport',        variant: 'info',    icon: Download },
  PASSWORD_CHANGE:    { label: "Parol o'zgardi", variant: 'warning', icon: Shield   },
  STOCK_MOVEMENT:     { label: 'Ombor harakati', variant: 'info',    icon: Eye      },
  DEBT_PAYMENT:       { label: "Qarz to'lovi",   variant: 'success', icon: Edit2    },
  DEAL_STAGE_CHANGE:  { label: 'Deal bosqichi',  variant: 'primary', icon: Edit2    },
  SALARY_PAID:        { label: 'Ish haqi',       variant: 'success', icon: Edit2    },
  MODULE_ACTIVATE:    { label: 'Modul ulandi',   variant: 'success', icon: Edit2    },
  MODULE_DEACTIVATE:  { label: "Modul o'chirildi", variant: 'warning', icon: Trash2 },
  USER_CREATE:        { label: 'User yaratildi', variant: 'success', icon: User     },
  USER_BLOCK:         { label: 'User blok',       variant: 'danger',  icon: User    },
  SMS_SENT:           { label: 'SMS',             variant: 'info',    icon: Edit2   },
  TELEGRAM_SENT:      { label: 'Telegram',        variant: 'info',    icon: Edit2   },
}

// ============================================
// ASOSIY SAHIFA
// ============================================
export default function AuditPage() {
  const t = useT()
  const [search,      setSearch]      = useState('')
  const [actionFilter, setAction]     = useState('')
  const [dateFrom,    setDateFrom]    = useState('')
  const [dateTo,      setDateTo]      = useState('')
  const [page,        setPage]        = useState(1)
  const [expandedId,  setExpandedId]  = useState<string | null>(null)

  const debouncedSearch = useDebounce(search, 400)

  const { data, isLoading } = useQuery({
    queryKey: ['audit', 'logs', { search: debouncedSearch, actionFilter, dateFrom, dateTo, page }],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (debouncedSearch) params.append('entity', debouncedSearch)
      if (actionFilter)    params.append('action', actionFilter)
      if (dateFrom)        params.append('dateFrom', dateFrom)
      if (dateTo)          params.append('dateTo', dateTo)
      params.append('page',  String(page))
      params.append('limit', '30')
      const { data } = await api.get(`/audit?${params}`)
      return data as {
        data: any[]
        meta: { total: number; page: number; limit: number; totalPages: number }
      }
    },
    staleTime: 30_000,
  })

  const { data: suspicious } = useQuery({
    queryKey: ['audit', 'suspicious'],
    queryFn:  async () => {
      const { data } = await api.get('/audit/suspicious')
      return data as any[]
    },
    staleTime: 5 * 60_000,
  })

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-semibold text-[var(--color-text-primary)] text-lg">{t('settings.audit')}</h2>
        <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
          {t('settings.auditSubtitle')}
        </p>
      </div>

      {/* Shubhali harakatlar */}
      {suspicious && suspicious.length > 0 && (
        <div className="mb-5 p-4 rounded-lg bg-[var(--color-danger-bg)] border border-[var(--color-danger-border)]">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="text-[var(--color-danger)] mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-[var(--color-danger)] mb-2">
                {t('settings.suspiciousFound')}
              </p>
              {suspicious.map((s, i) => (
                <p key={i} className="text-xs text-[var(--color-text-secondary)] mb-1">
                  - {s.message}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filtrlar */}
      <Card padding="sm" className="mb-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="max-w-xs">
            <Input
              placeholder={t('settings.searchObject')}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <select
            value={actionFilter}
            onChange={e => setAction(e.target.value)}
            className="h-9 rounded-md text-sm bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] border border-[var(--color-border-primary)] px-3 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]/50"
          >
            <option value="">{t('settings.allActions')}</option>
            {Object.entries(ACTION_CONFIG).map(([key, val]) => (
              <option key={key} value={key}>{val.label}</option>
            ))}
          </select>

          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="h-9 rounded-md text-sm bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] border border-[var(--color-border-primary)] px-3 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]/50"
          />
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="h-9 rounded-md text-sm bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] border border-[var(--color-border-primary)] px-3 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]/50"
          />

          {(search || actionFilter || dateFrom || dateTo) && (
            <Button
              variant="ghost" size="sm"
              onClick={() => {
                setSearch(''); setAction(''); setDateFrom(''); setDateTo(''); setPage(1)
              }}
            >
              Tozalash
            </Button>
          )}
        </div>
      </Card>

      {/* Jadval */}
      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--color-border-primary)]">
                {["Sana/Vaqt", "Foydalanuvchi", "Amal", "Ob'ekt", "IP", ""].map(h => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 10 }).map((_, i) => <TableRowSkeleton key={i} cols={6} />)
              ) : !data?.data?.length ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      icon={<Shield size={28} />}
                      title={t('settings.noAuditLogs')}
                      description="Hali hech qanday harakat qayd etilmagan"
                    />
                  </td>
                </tr>
              ) : (
                data.data.map((log: any) => {
                  const cfg = ACTION_CONFIG[log.action] || {
                    label: log.action, variant: 'default' as Variant, icon: Eye,
                  }
                  const IconComp   = cfg.icon
                  const isExpanded = expandedId === log.id
                  const hasData    = !!(log.oldData || log.newData)

                  return (
                    <Fragment key={log.id}>
                      <tr
                        className={cn(
                          'border-b border-[var(--color-border-primary)] transition-colors',
                          hasData ? 'cursor-pointer hover:bg-[var(--color-bg-tertiary)]/50' : '',
                        )}
                        onClick={() => hasData && setExpandedId(isExpanded ? null : log.id)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
                            <Clock size={11} />
                            <span className="font-mono">{formatDateTime(log.createdAt)}</span>
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          {log.user ? (
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-[var(--color-accent-primary)]/20 flex items-center justify-center shrink-0">
                                <span className="text-[9px] font-bold text-[var(--color-accent-primary)]">
                                  {log.user.firstName?.[0]}{log.user.lastName?.[0]}
                                </span>
                              </div>
                              <span className="text-xs text-[var(--color-text-primary)]">
                                {log.user.firstName} {log.user.lastName}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-[var(--color-text-muted)] flex items-center gap-1">
                              <User size={11} />
                              Tizim
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <Badge variant={cfg.variant} size="sm">
                            <IconComp size={10} className="mr-1" />
                            {log.actionLabel || cfg.label}
                          </Badge>
                        </td>

                        <td className="px-4 py-3">
                          <div>
                            <span className="text-xs font-medium text-[var(--color-text-primary)]">
                              {log.entity}
                            </span>
                            {log.entityId && (
                              <p className="text-[10px] text-[var(--color-text-muted)] font-mono">
                                {String(log.entityId).slice(0, 8)}...
                              </p>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
                            <Globe size={11} />
                            <span className="font-mono">{log.ipAddress || '-'}</span>
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          {hasData && (
                            <span className="text-xs text-[var(--color-accent-primary)]">
                              {isExpanded ? '▲' : '▼'}
                            </span>
                          )}
                        </td>
                      </tr>

                      {isExpanded && hasData && (
                        <tr className="bg-[var(--color-bg-tertiary)]/30">
                          <td colSpan={6} className="px-4 py-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                              {log.oldData && (
                                <div>
                                  <p className="font-semibold text-[var(--color-danger)] mb-1">Avval:</p>
                                  <pre className="font-mono text-[var(--color-text-muted)] bg-[var(--color-bg-secondary)] p-2 rounded-md overflow-auto max-h-32 text-[10px]">
                                    {JSON.stringify(log.oldData, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {log.newData && (
                                <div>
                                  <p className="font-semibold text-[var(--color-success)] mb-1">Keyin:</p>
                                  <pre className="font-mono text-[var(--color-text-muted)] bg-[var(--color-bg-secondary)] p-2 rounded-md overflow-auto max-h-32 text-[10px]">
                                    {JSON.stringify(log.newData, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {data?.meta && data.meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--color-border-primary)]">
            <p className="text-xs text-[var(--color-text-muted)]">
              Jami: <span className="font-medium">{data.meta.total}</span> ta yozuv
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="secondary" size="xs"
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >
                Oldingi
              </Button>
              <span className="text-xs text-[var(--color-text-muted)] px-2">
                {page} / {data.meta.totalPages}
              </span>
              <Button
                variant="secondary" size="xs"
                disabled={page === data.meta.totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                Keyingi
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
