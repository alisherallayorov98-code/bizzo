import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { authService } from '@services/auth.service'
import { useT } from '@i18n/index'

export default function VerifyEmailPage() {
  const t = useT()
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const [status, setStatus] = useState<'loading' | 'ok' | 'err'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) { setStatus('err'); setMessage(t('errors.notFound')); return }
    authService.verifyEmail(token)
      .then((r) => { setStatus('ok'); setMessage(r.message || t('auth.verifySuccess')) })
      .catch((e) => { setStatus('err'); setMessage(e?.response?.data?.message || t('auth.verifyFailed')) })
  }, [token, t])

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: 'var(--color-bg-primary)' }}>
      <div style={{ width: '100%', maxWidth: 420, background: 'var(--color-bg-secondary)', borderRadius: 16, padding: 32, boxShadow: 'var(--shadow-lg)', textAlign: 'center' }}>
        {status === 'loading' && (
          <>
            <Loader2 size={40} className="animate-spin" style={{ margin: '0 auto 16px', color: '#3B82F6' }} />
            <div style={{ color: 'var(--color-text-primary)' }}>{t('auth.verifyWaiting')}</div>
          </>
        )}
        {status === 'ok' && (
          <>
            <CheckCircle2 size={48} style={{ margin: '0 auto 16px', color: '#10B981' }} />
            <h2 style={{ color: 'var(--color-text-primary)', marginBottom: 8 }}>{t('auth.verifySuccess')}</h2>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: 20 }}>{message}</p>
          </>
        )}
        {status === 'err' && (
          <>
            <XCircle size={48} style={{ margin: '0 auto 16px', color: '#dc2626' }} />
            <h2 style={{ color: 'var(--color-text-primary)', marginBottom: 8 }}>{t('auth.verifyFailed')}</h2>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: 20 }}>{message}</p>
          </>
        )}
        <Link to="/login" style={{ color: '#3B82F6', fontSize: 14, textDecoration: 'none' }}>{t('auth.backToLogin')}</Link>
      </div>
    </div>
  )
}
