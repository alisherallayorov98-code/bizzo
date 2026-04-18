import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft, Edit2, Phone, Mail, MapPin,
  Building2, CreditCard, Clock, FileText,
  TrendingUp, TrendingDown, AlertCircle,
  Hash,
} from 'lucide-react'
import { PageHeader }       from '@components/layout/PageHeader/PageHeader'
import { Card }             from '@components/ui/Card/Card'
import { Badge }            from '@components/ui/Badge/Badge'
import { Button }           from '@components/ui/Button/Button'
import { Skeleton }         from '@components/ui/Skeleton/Skeleton'
import { ContactFormModal } from '@features/contacts/components/ContactFormModal'
import { useContact }       from '@features/contacts/hooks/useContacts'
import { useT }             from '@i18n/index'
import { formatCurrency, formatPhone, getInitials } from '@utils/formatters'
import { cn }               from '@utils/cn'
import type { ContactType } from '@services/contact.service'

// ============================================
// HELPER: KONTAKT TURI BADGE
// ============================================
function TypeBadge({ type }: { type: ContactType }) {
  const t = useT()
  const map: Record<ContactType, { label: string; variant: 'success' | 'warning' | 'info' | 'primary' }> = {
    CUSTOMER: { label: t('contacts.customer'),  variant: 'success'  },
    SUPPLIER: { label: t('contacts.supplier'),  variant: 'warning'  },
    BOTH:     { label: `${t('contacts.customer')}/${t('contacts.supplier')}`, variant: 'info' },
    PARTNER:  { label: t('contacts.partner'),   variant: 'primary'  },
  }
  const c = map[type]
  return <Badge variant={c.variant}>{c.label}</Badge>
}

// ============================================
// HELPER: INFO QATOR
// ============================================
function InfoRow({
  icon,
  label,
  value,
  mono,
  href,
}: {
  icon:   React.ReactNode
  label:  string
  value:  string | number | null | undefined
  mono?:  boolean
  href?:  string
}) {
  if (!value && value !== 0) return null
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border-primary/50 last:border-0">
      <span className="mt-0.5 text-text-muted shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-text-muted uppercase tracking-wider mb-0.5">{label}</p>
        {href ? (
          <a
            href={href}
            className={cn(
              'text-sm text-accent-primary hover:underline truncate block',
              mono && 'font-mono',
            )}
          >
            {value}
          </a>
        ) : (
          <p className={cn('text-sm text-text-primary truncate', mono && 'font-mono')}>
            {value}
          </p>
        )}
      </div>
    </div>
  )
}

// ============================================
// ASOSIY SAHIFA
// ============================================
export default function ContactDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate  = useNavigate()
  const t         = useT()
  const [editOpen, setEditOpen] = useState(false)

  const { data: contact, isLoading, isError } = useContact(id!)

  if (isLoading) {
    return (
      <div>
        <div className="mb-6">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-64 rounded-xl" />
          </div>
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </div>
    )
  }

  if (isError || !contact) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle size={40} className="text-danger mb-3" />
        <p className="text-text-primary font-medium">Kontakt topilmadi</p>
        <Button
          variant="secondary"
          size="sm"
          className="mt-4"
          onClick={() => navigate('/contacts')}
          leftIcon={<ArrowLeft size={14} />}
        >
          {t('contacts.backToList')}
        </Button>
      </div>
    )
  }

  const receivable = contact.totalReceivable ?? 0
  const payable    = contact.totalPayable    ?? 0
  const net        = receivable - payable

  return (
    <div>
      <PageHeader
        title={contact.name}
        description={contact.legalName ?? contact.region ?? ''}
        breadcrumbs={[
          { label: t('nav.dashboard'), path: '/dashboard' },
          { label: t('nav.contacts'),  path: '/contacts'  },
          { label: contact.name },
        ]}
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<ArrowLeft size={14} />}
              onClick={() => navigate('/contacts')}
            >
              {t('contacts.backToList')}
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Edit2 size={14} />}
              onClick={() => setEditOpen(true)}
            >
              {t('contacts.editContact')}
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* ---- CHAP: Asosiy ma'lumotlar ---- */}
        <div className="lg:col-span-2 space-y-4">

          {/* Avatar + tur */}
          <Card padding="md">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-14 h-14 rounded-xl bg-bg-elevated border border-border-primary flex items-center justify-center shrink-0">
                <span className="text-lg font-bold text-accent-primary">
                  {getInitials(contact.name)}
                </span>
              </div>
              <div>
                <h2 className="text-base font-semibold text-text-primary leading-tight">
                  {contact.name}
                </h2>
                {contact.legalName && (
                  <p className="text-sm text-text-muted mt-0.5">{contact.legalName}</p>
                )}
                <div className="mt-1.5">
                  <TypeBadge type={contact.type} />
                </div>
              </div>
            </div>

            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
              {t('contacts.infoSection')}
            </h3>

            <div>
              <InfoRow
                icon={<Phone size={14} />}
                label={t('common.phone')}
                value={contact.phone ? formatPhone(contact.phone) : null}
                href={contact.phone ? `tel:${contact.phone}` : undefined}
              />
              <InfoRow
                icon={<Phone size={14} />}
                label={t('contacts.phone2Label')}
                value={contact.phone2 ? formatPhone(contact.phone2) : null}
                href={contact.phone2 ? `tel:${contact.phone2}` : undefined}
              />
              <InfoRow
                icon={<Mail size={14} />}
                label={t('common.email')}
                value={contact.email}
                href={contact.email ? `mailto:${contact.email}` : undefined}
              />
              <InfoRow
                icon={<MapPin size={14} />}
                label={t('contacts.address')}
                value={contact.address}
              />
              <InfoRow
                icon={<MapPin size={14} />}
                label={t('contacts.region')}
                value={contact.region}
              />
              <InfoRow
                icon={<Hash size={14} />}
                label={t('contacts.stir')}
                value={contact.stir}
                mono
              />
              {contact.notes && (
                <InfoRow
                  icon={<FileText size={14} />}
                  label={t('contacts.note')}
                  value={contact.notes}
                />
              )}
            </div>
          </Card>

          {/* Moliyaviy shartlar */}
          <Card padding="md">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">
              {t('contacts.financialSection')}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-bg-tertiary border border-border-primary">
                <div className="flex items-center gap-2 mb-1">
                  <CreditCard size={14} className="text-text-muted" />
                  <span className="text-xs text-text-muted">{t('contacts.creditLimit')}</span>
                </div>
                <p className="text-base font-semibold text-text-primary tabular-nums">
                  {contact.creditLimit > 0 ? formatCurrency(contact.creditLimit) : '—'}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-bg-tertiary border border-border-primary">
                <div className="flex items-center gap-2 mb-1">
                  <Clock size={14} className="text-text-muted" />
                  <span className="text-xs text-text-muted">{t('contacts.paymentTerm')}</span>
                </div>
                <p className="text-base font-semibold text-text-primary">
                  {contact.paymentDays > 0 ? `${contact.paymentDays} kun` : '—'}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* ---- O'NG: Qarz holati ---- */}
        <div className="space-y-4">
          <Card padding="md">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">
              {t('contacts.debtSection')}
            </h3>

            {receivable === 0 && payable === 0 ? (
              <div className="text-center py-6">
                <Building2 size={28} className="text-text-muted mx-auto mb-2" />
                <p className="text-sm text-text-muted">{t('contacts.noDebt')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Debitor */}
                <div className={cn(
                  'p-3 rounded-lg border',
                  receivable > 0
                    ? contact.hasOverdue
                      ? 'bg-danger/5 border-danger/30'
                      : 'bg-success/5 border-success/30'
                    : 'bg-bg-tertiary border-border-primary',
                )}>
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp size={14} className={receivable > 0 ? contact.hasOverdue ? 'text-danger' : 'text-success' : 'text-text-muted'} />
                    <span className="text-xs text-text-muted">{t('contacts.receivableLabel')}</span>
                    {contact.hasOverdue && receivable > 0 && (
                      <Badge variant="danger" size="sm">{t('contacts.overdueLabel')}</Badge>
                    )}
                  </div>
                  <p className={cn(
                    'text-lg font-bold tabular-nums',
                    receivable > 0
                      ? contact.hasOverdue ? 'text-danger' : 'text-success'
                      : 'text-text-muted',
                  )}>
                    {receivable > 0 ? formatCurrency(receivable) : '—'}
                  </p>
                </div>

                {/* Kreditor */}
                <div className={cn(
                  'p-3 rounded-lg border',
                  payable > 0
                    ? 'bg-warning/5 border-warning/30'
                    : 'bg-bg-tertiary border-border-primary',
                )}>
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingDown size={14} className={payable > 0 ? 'text-warning' : 'text-text-muted'} />
                    <span className="text-xs text-text-muted">{t('contacts.payableLabel')}</span>
                  </div>
                  <p className={cn(
                    'text-lg font-bold tabular-nums',
                    payable > 0 ? 'text-warning' : 'text-text-muted',
                  )}>
                    {payable > 0 ? formatCurrency(payable) : '—'}
                  </p>
                </div>

                {/* Sof balans */}
                {(receivable > 0 || payable > 0) && (
                  <div className="pt-2 border-t border-border-primary">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-text-muted">Sof balans</span>
                      <span className={cn(
                        'text-sm font-bold tabular-nums',
                        net >= 0 ? 'text-success' : 'text-danger',
                      )}>
                        {net >= 0 ? '+' : ''}{formatCurrency(net)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Qarzlar sahifasiga link */}
          <Link to={`/debts?contactId=${contact.id}`}>
            <Button variant="secondary" size="sm" className="w-full">
              {t('nav.debts')} →
            </Button>
          </Link>
        </div>
      </div>

      {/* Edit modal */}
      <ContactFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        contact={contact}
      />
    </div>
  )
}
