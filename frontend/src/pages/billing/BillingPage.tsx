import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Calendar, CreditCard, FileText, XCircle } from 'lucide-react'
import { billingService, Subscription, BillingPayment } from '@services/billing.service'
import { useT } from '@i18n/index'

const fmt = (n: number) => new Intl.NumberFormat('uz-UZ').format(n) + ' soʻm'
const dmy = (d?: string | null) => d ? new Date(d).toLocaleDateString('uz-UZ') : '-'

export default function BillingPage() {
  const t = useT()
  const STATUS_LABEL: Record<string, string> = {
    TRIALING: t('billing.statusTrialing'), ACTIVE: t('billing.statusActive'), PAST_DUE: t('billing.statusPastDue'), CANCELED: t('billing.statusCanceled'), EXPIRED: t('billing.statusExpired'),
  }
  const [sub, setSub] = useState<Subscription | null>(null)
  const [payments, setPayments] = useState<BillingPayment[]>([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    Promise.all([billingService.getSubscription(), billingService.getPayments()])
      .then(([s, p]) => { setSub(s); setPayments(p); setLoading(false) })
  }

  useEffect(() => { load() }, [])

  const cancel = async () => {
    if (!confirm(t('billing.confirmCancel'))) return
    try { await billingService.cancel(); toast.success(t('billing.subscriptionCanceled')); load() }
    catch (e: any) { toast.error(e?.response?.data?.message || t('errors.serverError')) }
  }

  if (loading) return <div className="p-8" style={{ color: 'var(--color-text-muted)' }}>{t('common.loading')}</div>

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--color-text-primary)' }}>{t('billing.subscriptionTitle')}</h1>

      {!sub ? (
        <div className="p-8 rounded-xl text-center"
          style={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-primary)' }}>
          <p className="mb-4" style={{ color: 'var(--color-text-muted)' }}>{t('billing.noSubscription')}</p>
          <Link to="/pricing" className="inline-block px-6 py-2 rounded-lg font-medium"
            style={{ backgroundColor: 'var(--color-accent-primary)', color: '#fff' }}>{t('billing.viewPlans')}</Link>
        </div>
      ) : (
        <div className="p-6 rounded-xl mb-6"
          style={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-primary)' }}>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>{sub.plan?.displayName || sub.planId}</h2>
                <span className="px-3 py-1 rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: sub.status === 'ACTIVE' ? 'var(--color-success)' : sub.status === 'TRIALING' ? 'var(--color-accent-primary)' : 'var(--color-danger)',
                    color: '#fff',
                  }}>{STATUS_LABEL[sub.status] || sub.status}</span>
              </div>
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                {sub.billingCycle === 'YEARLY' ? t('billing.yearly') : t('billing.monthly')} {t('billing.cycleLabel')}
              </p>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                <div className="flex items-center gap-2"><Calendar size={16} /> {t('billing.nextPayment')}: <strong>{dmy(sub.nextBillingDate)}</strong></div>
                <div className="flex items-center gap-2"><CreditCard size={16} /> {t('billing.lastPayment')}: <strong>{sub.lastPaymentAmount ? fmt(sub.lastPaymentAmount) : '-'}</strong></div>
                {sub.trialEndsAt && <div className="flex items-center gap-2"><Calendar size={16} /> {t('billing.trialEndsAt')}: <strong>{dmy(sub.trialEndsAt)}</strong></div>}
              </div>
            </div>
            <div className="flex gap-2">
              <Link to="/pricing" className="px-4 py-2 rounded-lg font-medium"
                style={{ border: '1px solid var(--color-border-primary)', color: 'var(--color-text-primary)' }}>{t('billing.changePlan')}</Link>
              {sub.status !== 'CANCELED' && (
                <button onClick={cancel} className="px-4 py-2 rounded-lg font-medium flex items-center gap-2"
                  style={{ border: '1px solid var(--color-danger)', color: 'var(--color-danger)' }}>
                  <XCircle size={16} /> {t('billing.cancelSubscription')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>{t('billing.paymentHistory')}</h2>
      <div className="rounded-xl overflow-hidden"
        style={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-primary)' }}>
        {payments.length === 0 ? (
          <div className="p-8 text-center" style={{ color: 'var(--color-text-muted)' }}>{t('billing.noPayments')}</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border-primary)' }}>
                <th className="text-left p-3">{t('billing.colDate')}</th>
                <th className="text-left p-3">{t('billing.colInvoice')}</th>
                <th className="text-left p-3">{t('billing.colProvider')}</th>
                <th className="text-right p-3">{t('billing.colAmount')}</th>
                <th className="text-left p-3">{t('billing.colStatus')}</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody style={{ color: 'var(--color-text-secondary)' }}>
              {payments.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--color-border-primary)' }}>
                  <td className="p-3">{dmy(p.createdAt)}</td>
                  <td className="p-3">{p.invoice?.invoiceNumber || '-'}</td>
                  <td className="p-3">{p.provider}</td>
                  <td className="p-3 text-right">{fmt(p.amount)}</td>
                  <td className="p-3">{p.status}</td>
                  <td className="p-3">
                    {p.invoice && <a href={billingService.invoicePdfUrl(p.invoice.id)} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1"
                      style={{ color: 'var(--color-accent-primary)' }}>
                      <FileText size={14} /> {t('billing.colInvoice')}
                    </a>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
