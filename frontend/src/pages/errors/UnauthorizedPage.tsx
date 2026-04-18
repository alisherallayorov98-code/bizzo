import { Link } from 'react-router-dom'
import { useT } from '@i18n/index'

export default function UnauthorizedPage() {
  const t = useT()
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '100vh',
      backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)',
    }}>
      <h1 style={{ fontSize: '4rem', fontFamily: 'var(--font-display)', color: 'var(--color-warning)' }}>403</h1>
      <p style={{ fontSize: '1.25rem', marginBottom: '24px', color: 'var(--color-text-secondary)' }}>
        {t('errors.unauthorized')}
      </p>
      <Link to="/dashboard" style={{
        padding: '10px 24px', borderRadius: 'var(--radius-md)',
        backgroundColor: 'var(--color-accent-primary)', color: '#fff',
        textDecoration: 'none',
      }}>
        {t('nav.dashboard')}
      </Link>
    </div>
  )
}
