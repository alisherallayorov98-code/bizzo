import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { authService } from '@services/auth.service'
import { useT } from '@i18n/index'

export default function ForgotPasswordPage() {
  const t = useT()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    setError(null)
    try {
      await authService.forgotPassword(email)
      setSent(true)
    } catch (err: any) {
      setError(err?.response?.data?.message || t('errors.serverError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: 'var(--color-bg-primary)' }}>
      <div style={{ width: '100%', maxWidth: 420, background: 'var(--color-bg-secondary)', borderRadius: 16, padding: 32, boxShadow: 'var(--shadow-lg)' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, marginBottom: 8, color: 'var(--color-text-primary)' }}>
          {t('auth.forgotTitle')}
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginBottom: 24 }}>
          {t('auth.forgotSubtitle')}
        </p>

        {sent ? (
          <div style={{ display: 'flex', gap: 12, padding: 16, background: 'rgba(16,185,129,0.1)', borderRadius: 10, marginBottom: 16 }}>
            <CheckCircle2 color="#10B981" size={24} />
            <div style={{ color: 'var(--color-text-primary)', fontSize: 14 }}>
              Agar email ro'yxatdan o'tgan bo'lsa, tiklash xati yuborildi. Pochtangizni tekshiring.
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: 14, top: 14, color: 'var(--color-text-muted)' }} />
              <input
                type="email"
                required
                placeholder="siz@kompaniya.uz"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%', padding: '12px 12px 12px 42px', borderRadius: 10,
                  border: '1px solid var(--color-border)', background: 'var(--color-bg-primary)',
                  color: 'var(--color-text-primary)', fontSize: 14,
                }}
              />
            </div>
            {error && <div style={{ color: '#dc2626', fontSize: 13 }}>{error}</div>}
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '12px 20px', borderRadius: 10, border: 'none', cursor: 'pointer',
                background: '#3B82F6', color: '#fff', fontWeight: 600, fontSize: 14,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {t('auth.sendResetLink')}
            </button>
          </form>
        )}

        <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 20, color: '#3B82F6', fontSize: 14, textDecoration: 'none' }}>
          <ArrowLeft size={14} /> {t('auth.backToLogin')}
        </Link>
      </div>
    </div>
  )
}
