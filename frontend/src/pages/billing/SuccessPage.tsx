import { Link } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import { useT } from '@i18n/index'

export default function SuccessPage() {
  const t = useT()
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      <div className="max-w-md w-full text-center p-8 rounded-xl"
        style={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-primary)' }}>
        <CheckCircle2 size={64} className="mx-auto mb-4" style={{ color: 'var(--color-success)' }} />
        <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>{t('billing.paymentSuccessTitle')}</h1>
        <p className="mb-6" style={{ color: 'var(--color-text-muted)' }}>
          {t('billing.paymentSuccessDesc')}
        </p>
        <div className="flex gap-3 justify-center">
          <Link to="/billing" className="px-5 py-2 rounded-lg font-medium"
            style={{ border: '1px solid var(--color-border-primary)', color: 'var(--color-text-primary)' }}>
            {t('billing.viewSubscription')}
          </Link>
          <Link to="/dashboard" className="px-5 py-2 rounded-lg font-medium"
            style={{ backgroundColor: 'var(--color-accent-primary)', color: '#fff' }}>
            {t('nav.dashboard')}
          </Link>
        </div>
      </div>
    </div>
  )
}
