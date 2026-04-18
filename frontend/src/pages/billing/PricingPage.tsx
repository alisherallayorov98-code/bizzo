import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Crown, Sparkles, Zap, Building2 } from 'lucide-react'
import { billingService, BillingPlan, BillingCycle } from '@services/billing.service'
import { useT } from '@i18n/index'

const ICONS: Record<string, any> = {
  FREE: Sparkles, STARTER: Zap, BUSINESS: Crown, ENTERPRISE: Building2,
}

const fmt = (n: number) => new Intl.NumberFormat('uz-UZ').format(n)

export default function PricingPage() {
  const t = useT()
  const navigate = useNavigate()
  const [plans, setPlans] = useState<BillingPlan[]>([])
  const [cycle, setCycle] = useState<BillingCycle>('MONTHLY')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    billingService.getPlans().then(p => { setPlans(p); setLoading(false) })
  }, [])

  const handleSelect = (plan: BillingPlan) => {
    if (plan.name === 'FREE') { navigate('/dashboard'); return }
    if (plan.name === 'ENTERPRISE') { window.location.href = 'mailto:sales@bizzo.uz'; return }
    navigate(`/billing/checkout?plan=${plan.id}&cycle=${cycle}`)
  }

  return (
    <div className="min-h-screen px-4 py-16" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold mb-3" style={{ color: 'var(--color-text-primary)' }}>{t('billing.pricingTitle')}</h1>
          <p style={{ color: 'var(--color-text-muted)' }}>{t('billing.pricingSubtitle')}</p>

          <div className="inline-flex items-center gap-1 mt-8 p-1 rounded-full"
            style={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-primary)' }}>
            {(['MONTHLY', 'YEARLY'] as BillingCycle[]).map(c => (
              <button key={c} onClick={() => setCycle(c)}
                className="px-5 py-2 rounded-full text-sm font-medium transition"
                style={{
                  backgroundColor: cycle === c ? 'var(--color-accent-primary)' : 'transparent',
                  color: cycle === c ? '#fff' : 'var(--color-text-muted)',
                }}>
                {c === 'MONTHLY' ? t('billing.monthly') : t('billing.yearly')}
                {c === 'YEARLY' && <span className="ml-2 text-xs px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: 'var(--color-success)', color: '#fff' }}>-20%</span>}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center" style={{ color: 'var(--color-text-muted)' }}>{t('common.loading')}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map(plan => {
              const Icon = ICONS[plan.name] || Sparkles
              const price = cycle === 'YEARLY' ? plan.priceYearly : plan.priceMonthly
              const priceLabel = plan.name === 'ENTERPRISE' ? t('billing.contact') : (price === 0 ? t('settings.free') : `${fmt(price)} soʻm`)
              return (
                <div key={plan.id} className="relative p-6 rounded-xl transition"
                  style={{
                    backgroundColor: 'var(--color-bg-elevated)',
                    border: plan.isPopular ? '2px solid var(--color-accent-primary)' : '1px solid var(--color-border-primary)',
                  }}>
                  {plan.isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 text-xs font-semibold rounded-full"
                      style={{ backgroundColor: 'var(--color-accent-primary)', color: '#fff' }}>{t('billing.popular')}</div>
                  )}
                  <Icon size={32} style={{ color: 'var(--color-accent-primary)' }} />
                  <h3 className="mt-4 text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>{plan.displayName}</h3>
                  <div className="mt-4">
                    <span className="text-3xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{priceLabel}</span>
                    {price > 0 && <span className="text-sm ml-1" style={{ color: 'var(--color-text-muted)' }}>{cycle === 'YEARLY' ? '/' + t('billing.yearly').toLowerCase() : t('settings.perMonth')}</span>}
                  </div>
                  <ul className="mt-6 space-y-3 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    <li className="flex items-center gap-2"><Check size={16} style={{ color: 'var(--color-success)' }} />
                      {plan.maxUsers >= 9999 ? t('billing.unlimitedUsers') : `${plan.maxUsers} ${t('settings.users').toLowerCase()}`}</li>
                    <li className="flex items-center gap-2"><Check size={16} style={{ color: 'var(--color-success)' }} />
                      {plan.maxContacts >= 999999 ? t('billing.unlimitedContacts') : `${fmt(plan.maxContacts)} ${t('nav.contacts').toLowerCase()}`}</li>
                    <li className="flex items-center gap-2"><Check size={16} style={{ color: 'var(--color-success)' }} />
                      {plan.maxProducts >= 999999 ? t('billing.unlimitedProducts') : `${fmt(plan.maxProducts)} ${t('nav.products').toLowerCase()}`}</li>
                    <li className="flex items-center gap-2"><Check size={16} style={{ color: 'var(--color-success)' }} />
                      {plan.maxStorage >= 999999 ? t('billing.unlimitedStorage') : `${(plan.maxStorage / 1024).toFixed(0)} GB`}</li>
                    <li className="flex items-center gap-2"><Check size={16} style={{ color: 'var(--color-success)' }} />
                      {plan.modules.includes('*') ? t('billing.allModules') : `${plan.modules.length} ${t('settings.modules').toLowerCase()}`}</li>
                  </ul>
                  <button onClick={() => handleSelect(plan)}
                    className="w-full mt-6 py-3 rounded-lg font-medium transition"
                    style={{
                      backgroundColor: plan.isPopular ? 'var(--color-accent-primary)' : 'transparent',
                      color: plan.isPopular ? '#fff' : 'var(--color-text-primary)',
                      border: plan.isPopular ? 'none' : '1px solid var(--color-border-primary)',
                    }}>
                    {plan.name === 'ENTERPRISE' ? t('billing.contact') : plan.name === 'FREE' ? t('billing.start') : t('billing.choose')}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
