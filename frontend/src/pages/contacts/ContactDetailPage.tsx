import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Phone, Mail, MapPin, Hash, Edit2, ArrowLeft,
  TrendingUp, TrendingDown, Package, ShoppingCart,
  Plus, Clock, CheckCircle, AlertCircle, CreditCard,
  FileText, Building2,
} from 'lucide-react'
import { PageHeader }       from '@components/layout/PageHeader/PageHeader'
import { Card }             from '@components/ui/Card/Card'
import { Badge }            from '@components/ui/Badge/Badge'
import { Button }           from '@components/ui/Button/Button'
import { Skeleton }         from '@components/ui/Skeleton/Skeleton'
import { ContactFormModal } from '@features/contacts/components/ContactFormModal'
import api                  from '@config/api'
import { formatCurrency, formatDate, formatPhone, getInitials } from '@utils/formatters'
import { cn }               from '@utils/cn'

// ============================================
// TYPES
// ============================================
interface DebtSummary {
  receivable:      number
  receivableCount: number
  payable:         number
  payableCount:    number
  overdueCount:    number
  net:             number
}

interface ContactFull {
  id:          string
  name:        string
  legalName?:  string
  type:        string
  phone?:      string
  phone2?:     string
  email?:      string
  address?:    string
  region?:     string
  stir?:       string
  notes?:      string
  creditLimit: number
  paymentDays: number
  createdAt:   string
  debtSummary: DebtSummary
  movements:   any[]
  deals:       any[]
  recentDebts: any[]
  stats: {
    totalDeals: number
    wonDeals:   number
  }
}

const TYPE_CONFIG: Record<string, { label: string; variant: 'success' | 'warning' | 'info' | 'primary' }> = {
  CUSTOMER: { label: 'Mijoz',          variant: 'success' },
  SUPPLIER: { label: 'Yetkazuvchi',    variant: 'warning' },
  BOTH:     { label: 'Mijoz/Yetk.',   variant: 'info'    },
  PARTNER:  { label: 'Sherik',         variant: 'primary' },
}

// ============================================
// INFO QATOR
// ============================================
function InfoRow({
  icon, label, value, mono, href,
}: {
  icon:   React.ReactNode
  label:  string
  value:  string | number | null | undefined
  mono?:  boolean
  href?:  string
}) {
  if (!value && value !== 0) return null
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border-primary/40 last:border-0">
      <span className="mt-0.5 text-text-muted shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-text-muted uppercase tracking-wider mb-0.5">{label}</p>
        {href ? (
          <a href={href} className={cn('text-sm text-accent-primary hover:underline truncate block', mono && 'font-mono')}>
            {value}
          </a>
        ) : (
          <p className={cn('text-sm text-text-primary truncate', mono && 'font-mono')}>{value}</p>
        )}
      </div>
    </div>
  )
}

// ============================================
// ASOSIY SAHIFA
// ============================================
export default function ContactDetailPage() {
  const { id }   = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [editOpen, setEditOpen] = useState(false)
  const [tab, setTab]           = useState('movements')

  const { data: contact, isLoading, isError } = useQuery<ContactFull>({
    queryKey: ['contact-full', id],
    queryFn:  async () => {
      const res = await api.get(`/contacts/${id}/full`)
      return res.data.data
    },
    enabled: !!id,
  })

  // ---- Loading ----
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64 rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <Skeleton className="h-64 rounded-xl" />
          <div className="lg:col-span-3 grid grid-cols-3 gap-3">
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
          </div>
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  // ---- Xato ----
  if (isError || !contact) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle size={40} className="text-danger mb-3" />
        <p className="text-text-primary font-medium mb-1">Kontakt topilmadi</p>
        <Button variant="secondary" size="sm" leftIcon={<ArrowLeft size={14} />} onClick={() => navigate('/contacts')}>
          Orqaga
        </Button>
      </div>
    )
  }

  const debt = contact.debtSummary
  const typeConf = TYPE_CONFIG[contact.type] ?? { label: contact.type, variant: 'primary' as const }

  const TABS = [
    { id: 'movements', label: 'Ombor harakatlari', count: contact.movements.length },
    { id: 'deals',     label: 'Bitimlar',          count: contact.stats.totalDeals  },
    { id: 'debts',     label: 'Qarzlar',           count: debt.receivableCount + debt.payableCount },
    { id: 'info',      label: "Ma'lumotlar",        count: null },
  ]

  return (
    <div>
      <PageHeader
        title={contact.name}
        description={contact.legalName ?? contact.region ?? ''}
        breadcrumbs={[
          { label: 'Dashboard', path: '/dashboard' },
          { label: 'Mijozlar',  path: '/contacts'  },
          { label: contact.name },
        ]}
        actions={
          <>
            <Button variant="secondary" size="sm" leftIcon={<ArrowLeft size={14} />} onClick={() => navigate('/contacts')}>
              Orqaga
            </Button>
            <Button variant="primary" size="sm" leftIcon={<Edit2 size={14} />} onClick={() => setEditOpen(true)}>
              Tahrirlash
            </Button>
          </>
        }
      />

      {/* ===== 1. SATIR: PROFIL + QARZ KARTALAR ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4">

        {/* Profil */}
        <Card className="lg:col-span-1">
          <div className="flex flex-col items-center text-center mb-4">
            <div className="w-16 h-16 rounded-2xl bg-accent-primary/15 border-2 border-accent-primary/25 flex items-center justify-center mb-3">
              <span className="text-2xl font-black text-accent-primary">{getInitials(contact.name)}</span>
            </div>
            <h2 className="font-semibold text-text-primary text-base leading-tight">{contact.name}</h2>
            {contact.legalName && <p className="text-xs text-text-muted mt-0.5">{contact.legalName}</p>}
            <Badge variant={typeConf.variant} size="sm" className="mt-2">{typeConf.label}</Badge>
          </div>

          <div className="space-y-0.5">
            {contact.phone && (
              <InfoRow icon={<Phone size={13} />} label="Telefon" value={formatPhone(contact.phone)} href={`tel:${contact.phone}`} />
            )}
            {contact.email && (
              <InfoRow icon={<Mail size={13} />} label="Email" value={contact.email} href={`mailto:${contact.email}`} />
            )}
            {contact.address && (
              <InfoRow icon={<MapPin size={13} />} label="Manzil" value={contact.address} />
            )}
            {contact.stir && (
              <InfoRow icon={<Hash size={13} />} label="STIR" value={contact.stir} mono />
            )}
            {(contact.creditLimit > 0 || contact.paymentDays > 0) && (
              <div className="pt-2 border-t border-border-primary/40 mt-2 space-y-1">
                {contact.creditLimit > 0 && (
                  <InfoRow icon={<CreditCard size={13} />} label="Kredit limiti" value={formatCurrency(contact.creditLimit)} />
                )}
                {contact.paymentDays > 0 && (
                  <InfoRow icon={<Clock size={13} />} label="To'lov muddati" value={`${contact.paymentDays} kun`} />
                )}
              </div>
            )}
          </div>
        </Card>

        {/* Qarz kartalar */}
        <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Debitor */}
          <Card className={cn(
            'border-2 transition-colors',
            debt.receivable > 0
              ? debt.overdueCount > 0
                ? 'border-danger/30 bg-danger/5'
                : 'border-success/30 bg-success/5'
              : 'border-border-primary',
          )}>
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={15} className={debt.receivable > 0 ? (debt.overdueCount > 0 ? 'text-danger' : 'text-success') : 'text-text-muted'} />
              <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Debitor</span>
              {debt.overdueCount > 0 && (
                <Badge variant="danger" size="sm">{debt.overdueCount} muddati o'tgan</Badge>
              )}
            </div>
            <p className={cn(
              'text-2xl font-black tabular-nums',
              debt.receivable > 0 ? (debt.overdueCount > 0 ? 'text-danger' : 'text-success') : 'text-text-muted',
            )}>
              {debt.receivable > 0 ? formatCurrency(debt.receivable) : '—'}
            </p>
            <p className="text-xs text-text-muted mt-1">{debt.receivableCount} ta qarz</p>
          </Card>

          {/* Kreditor */}
          <Card className={cn(
            'border-2',
            debt.payable > 0 ? 'border-warning/30 bg-warning/5' : 'border-border-primary',
          )}>
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown size={15} className={debt.payable > 0 ? 'text-warning' : 'text-text-muted'} />
              <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Kreditor</span>
            </div>
            <p className={cn(
              'text-2xl font-black tabular-nums',
              debt.payable > 0 ? 'text-warning' : 'text-text-muted',
            )}>
              {debt.payable > 0 ? formatCurrency(debt.payable) : '—'}
            </p>
            <p className="text-xs text-text-muted mt-1">{debt.payableCount} ta qarz</p>
          </Card>

          {/* Sof balans */}
          <Card className={cn(
            'border-2',
            debt.net > 0
              ? 'border-accent-primary/30 bg-accent-primary/5'
              : debt.net < 0
                ? 'border-danger/30 bg-danger/5'
                : 'border-border-primary',
          )}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Sof balans</span>
            </div>
            <p className={cn(
              'text-2xl font-black tabular-nums',
              debt.net > 0 ? 'text-accent-primary' : debt.net < 0 ? 'text-danger' : 'text-text-muted',
            )}>
              {debt.net !== 0 ? (debt.net > 0 ? '+' : '') + formatCurrency(debt.net) : '—'}
            </p>
            <div className="mt-2">
              <Link to={`/debts?contactId=${id}`}>
                <Button variant="secondary" size="xs">Qarzlar →</Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>

      {/* ===== 2. SATIR: TABLAR ===== */}
      <Card padding="none">
        {/* Tab sarlavhalari */}
        <div className="flex border-b border-border-primary overflow-x-auto scrollbar-none">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'flex items-center gap-1.5 px-5 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px shrink-0',
                tab === t.id
                  ? 'border-accent-primary text-accent-primary'
                  : 'border-transparent text-text-muted hover:text-text-primary',
              )}
            >
              {t.label}
              {t.count !== null && t.count > 0 && (
                <span className={cn(
                  'text-[10px] px-1.5 py-0.5 rounded-full font-semibold',
                  tab === t.id ? 'bg-accent-primary/15 text-accent-primary' : 'bg-bg-tertiary text-text-muted',
                )}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ---- TAB: Ombor harakatlari ---- */}
        {tab === 'movements' && (
          <div className="overflow-x-auto">
            {contact.movements.length === 0 ? (
              <div className="py-16 text-center">
                <Package size={32} className="text-text-muted mx-auto mb-2 opacity-30" />
                <p className="text-sm text-text-muted">Hali hech qanday harakat yo'q</p>
                <p className="text-xs text-text-muted mt-1">Kirim/Chiqim hujjatlarida kontakt belgilanganda ko'rinadi</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border-primary">
                    {['Sana', 'Mahsulot', 'Turi', 'Ombor', 'Miqdor', 'Summa'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {contact.movements.map((m: any) => (
                    <tr key={m.id} className="border-b border-border-primary hover:bg-bg-tertiary/50 transition-colors">
                      <td className="px-4 py-3 text-xs text-text-muted font-mono">{formatDate(m.createdAt)}</td>
                      <td className="px-4 py-3 text-sm text-text-primary">{m.product?.name ?? '—'}</td>
                      <td className="px-4 py-3">
                        <Badge variant={m.type === 'IN' ? 'success' : 'danger'} size="sm">
                          {m.type === 'IN' ? 'Kirim' : 'Chiqim'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">{m.warehouse?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-sm tabular-nums text-text-primary">
                        {m.quantity} {m.product?.unit ?? ''}
                      </td>
                      <td className="px-4 py-3 text-sm tabular-nums font-medium text-text-primary">
                        {formatCurrency(m.totalAmount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ---- TAB: Bitimlar ---- */}
        {tab === 'deals' && (
          <div>
            {contact.deals.length === 0 ? (
              <div className="py-16 text-center">
                <ShoppingCart size={32} className="text-text-muted mx-auto mb-2 opacity-30" />
                <p className="text-sm text-text-muted">Hali bitim yo'q</p>
              </div>
            ) : (
              <div className="divide-y divide-border-primary">
                {contact.deals.map((d: any) => {
                  const stageColor: Record<string, string> = {
                    WON:      'success',
                    LOST:     'danger',
                    LEAD:     'default',
                    PROPOSAL: 'info',
                    NEGOTIATION: 'warning',
                  }
                  return (
                    <Link
                      key={d.id}
                      to={`/sales/deals/${d.id}`}
                      className="flex items-center gap-4 px-4 py-3 hover:bg-bg-tertiary/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">{d.title}</p>
                        <p className="text-xs text-text-muted font-mono">{d.dealNumber} · {formatDate(d.createdAt)}</p>
                      </div>
                      <Badge variant={(stageColor[d.stage] as any) ?? 'default'} size="sm">{d.stage}</Badge>
                      <span className="text-sm tabular-nums font-semibold text-text-primary shrink-0">
                        {formatCurrency(d.finalAmount)}
                      </span>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ---- TAB: Qarzlar ---- */}
        {tab === 'debts' && (
          <div>
            <div className="p-3 border-b border-border-primary flex justify-end">
              <Link to={`/debts?contactId=${id}`}>
                <Button variant="primary" size="sm" leftIcon={<Plus size={13} />}>
                  Yangi qarz
                </Button>
              </Link>
            </div>
            {contact.recentDebts.length === 0 ? (
              <div className="py-16 text-center">
                <CheckCircle size={32} className="text-success mx-auto mb-2 opacity-40" />
                <p className="text-sm text-text-muted">Faol qarzlar yo'q</p>
              </div>
            ) : (
              <div className="divide-y divide-border-primary">
                {contact.recentDebts.map((d: any) => (
                  <div key={d.id} className="flex items-center gap-4 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={d.type === 'RECEIVABLE' ? 'success' : 'warning'} size="sm">
                          {d.type === 'RECEIVABLE' ? 'Debitor' : 'Kreditor'}
                        </Badge>
                        {d.isOverdue && (
                          <Badge variant="danger" size="sm">Muddati o'tgan</Badge>
                        )}
                      </div>
                      {d.notes && (
                        <p className="text-xs text-text-muted mt-0.5 truncate">{d.notes}</p>
                      )}
                      {d.dueDate && (
                        <p className="text-xs text-text-muted flex items-center gap-1 mt-0.5">
                          <Clock size={10} />
                          {formatDate(d.dueDate)}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold tabular-nums text-text-primary">
                        {formatCurrency(d.remainAmount)}
                      </p>
                      <p className="text-xs text-text-muted">/ {formatCurrency(d.amount)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ---- TAB: Ma'lumotlar ---- */}
        {tab === 'info' && (
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-2">Bog'lanish</p>
                <div className="space-y-0.5">
                  <InfoRow icon={<Phone size={13} />} label="Telefon" value={contact.phone ? formatPhone(contact.phone) : null} href={contact.phone ? `tel:${contact.phone}` : undefined} />
                  <InfoRow icon={<Phone size={13} />} label="Telefon 2" value={contact.phone2 ? formatPhone(contact.phone2) : null} />
                  <InfoRow icon={<Mail size={13} />}  label="Email"    value={contact.email}   href={contact.email ? `mailto:${contact.email}` : undefined} />
                  <InfoRow icon={<MapPin size={13} />} label="Manzil"  value={contact.address} />
                  <InfoRow icon={<MapPin size={13} />} label="Viloyat" value={contact.region}  />
                </div>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-2">Moliyaviy shartlar</p>
                <div className="space-y-0.5">
                  <InfoRow icon={<Hash size={13} />}      label="STIR"          value={contact.stir} mono />
                  <InfoRow icon={<CreditCard size={13} />} label="Kredit limiti" value={contact.creditLimit > 0 ? formatCurrency(contact.creditLimit) : null} />
                  <InfoRow icon={<Clock size={13} />}     label="To'lov muddati" value={contact.paymentDays > 0 ? `${contact.paymentDays} kun` : null} />
                </div>
                {contact.notes && (
                  <div className="mt-3 pt-3 border-t border-border-primary/40">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">Izoh</p>
                    <p className="text-sm text-text-secondary leading-relaxed">{contact.notes}</p>
                  </div>
                )}
              </div>
            </div>
            <div className="pt-2 border-t border-border-primary/40">
              <p className="text-xs text-text-muted">
                Ro'yxatga olingan: {formatDate(contact.createdAt)}
              </p>
            </div>
          </div>
        )}
      </Card>

      <ContactFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        contact={contact as any}
      />
    </div>
  )
}
