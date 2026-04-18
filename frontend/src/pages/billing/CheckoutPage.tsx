import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { CreditCard, Tag, Loader2 } from 'lucide-react'
import { billingService, BillingPlan, BillingCycle, PaymentProvider } from '@services/billing.service'
import { useT } from '@i18n/index'

const fmt = (n: number) => new Intl.NumberFormat('uz-UZ').format(n) + ' soʻm'

export default function CheckoutPage() {
  const t = useT()
  const [search] = useSearchParams()
  const navigate = useNavigate()
  const planId = search.get('plan') || ''
  const cycle = (search.get('cycle') as BillingCycle) || 'MONTHLY'

  const [plan, setPlan] = useState<BillingPlan | null>(null)
  const [provider, setProvider] = useState<PaymentProvider>('PAYME')
  const [promoCode, setPromoCode] = useState('')
  const [promoDiscount, setPromoDiscount] = useState(0)
  const [billingName, setBillingName] = useState('')
  const [billingStir, setBillingStir] = useState('')
  const [billingAddress, setBillingAddress] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    billingService.getPlans().then(plans => {
      const p = plans.find(x => x.id === planId)
      if (!p) { navigate('/pricing'); return }
      setPlan(p)
    })
  }, [planId, navigate])

  if (!plan) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <Loader2 className="animate-spin" style={{ color: 'var(--color-accent-primary)' }} />
      </div>
    )
  }

  const subtotal = cycle === 'YEARLY' ? plan.priceYearly : plan.priceMonthly
  const afterDiscount = subtotal - promoDiscount
  const tax = Math.round(afterDiscount * 0.12)
  const total = afterDiscount + tax

  const applyPromo = async () => {
    if (!promoCode.trim()) return
    try {
      const res = await billingService.validatePromo(promoCode.trim(), plan.id, subtotal)
      setPromoDiscount(res.discount)
      toast.success(`${t('billing.promoApplied')}: ${fmt(res.discount)}`)
    } catch (e: any) {
      setPromoDiscount(0)
      toast.error(e?.response?.data?.message || t('billing.invalidPromo'))
    }
  }

  const submit = async () => {
    setSubmitting(true)
    try {
      const res = await billingService.initiatePayment({
        planId: plan.id,
        billingCycle: cycle,
        provider,
        promoCode: promoCode.trim() || undefined,
        returnUrl: `${window.location.origin}/billing/success`,
        billingName, billingStir, billingAddress,
      })
      window.location.href = res.checkoutUrl
    } catch (e: any) {
      toast.error(e?.response?.data?.message || t('billing.paymentFailed2'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen px-4 py-12" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-8" style={{ color: 'var(--color-text-primary)' }}>{t('billing.payment')}</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="p-6 rounded-xl" style={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-primary)' }}>
              <h3 className="font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>{t('billing.paymentMethod')}</h3>
              <div className="grid grid-cols-2 gap-3">
                {(['PAYME', 'CLICK'] as PaymentProvider[]).map(p => (
                  <label key={p} className="flex items-center gap-3 p-4 rounded-lg cursor-pointer transition"
                    style={{
                      border: provider === p ? '2px solid var(--color-accent-primary)' : '1px solid var(--color-border-primary)',
                      backgroundColor: provider === p ? 'rgba(59,130,246,0.08)' : 'transparent',
                    }}>
                    <input type="radio" checked={provider === p} onChange={() => setProvider(p)} className="accent-blue-500" />
                    <CreditCard size={20} style={{ color: 'var(--color-accent-primary)' }} />
                    <span style={{ color: 'var(--color-text-primary)' }}>{p === 'PAYME' ? 'Payme' : 'Click'}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="p-6 rounded-xl" style={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-primary)' }}>
              <h3 className="font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>{t('billing.invoiceInfo')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input placeholder={t('billing.companyName')} value={billingName} onChange={e => setBillingName(e.target.value)}
                  className="px-3 py-2 rounded-lg w-full"
                  style={{ backgroundColor: 'var(--color-bg-primary)', border: '1px solid var(--color-border-primary)', color: 'var(--color-text-primary)' }} />
                <input placeholder={t('settings.stir')} value={billingStir} onChange={e => setBillingStir(e.target.value)}
                  className="px-3 py-2 rounded-lg w-full"
                  style={{ backgroundColor: 'var(--color-bg-primary)', border: '1px solid var(--color-border-primary)', color: 'var(--color-text-primary)' }} />
                <input placeholder={t('settings.address')} value={billingAddress} onChange={e => setBillingAddress(e.target.value)}
                  className="md:col-span-2 px-3 py-2 rounded-lg w-full"
                  style={{ backgroundColor: 'var(--color-bg-primary)', border: '1px solid var(--color-border-primary)', color: 'var(--color-text-primary)' }} />
              </div>
            </div>

            <div className="p-6 rounded-xl" style={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-primary)' }}>
              <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                <Tag size={18} /> {t('billing.promoCode')}
              </h3>
              <div className="flex gap-2">
                <input placeholder={t('billing.enterPromo')} value={promoCode} onChange={e => setPromoCode(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg"
                  style={{ backgroundColor: 'var(--color-bg-primary)', border: '1px solid var(--color-border-primary)', color: 'var(--color-text-primary)' }} />
                <button onClick={applyPromo} className="px-4 py-2 rounded-lg font-medium"
                  style={{ border: '1px solid var(--color-border-primary)', color: 'var(--color-text-primary)' }}>{t('billing.apply')}</button>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-xl h-fit" style={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-primary)' }}>
            <h3 className="font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>{t('billing.order')}</h3>
            <div className="space-y-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              <div className="flex justify-between"><span>{plan.displayName} ({cycle === 'YEARLY' ? t('billing.yearly') : t('billing.monthly')})</span><span>{fmt(subtotal)}</span></div>
              {promoDiscount > 0 && <div className="flex justify-between" style={{ color: 'var(--color-success)' }}><span>{t('billing.discount')}</span><span>-{fmt(promoDiscount)}</span></div>}
              <div className="flex justify-between"><span>{t('billing.vat')} (12%)</span><span>{fmt(tax)}</span></div>
              <div className="pt-3 mt-3 flex justify-between text-lg font-bold"
                style={{ borderTop: '1px solid var(--color-border-primary)', color: 'var(--color-text-primary)' }}>
                <span>{t('billing.total')}</span><span>{fmt(total)}</span>
              </div>
            </div>
            <button onClick={submit} disabled={submitting}
              className="w-full mt-6 py-3 rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ backgroundColor: 'var(--color-accent-primary)', color: '#fff' }}>
              {submitting && <Loader2 size={18} className="animate-spin" />}
              {t('billing.proceedPayment')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
