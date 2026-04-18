import { Link } from 'react-router-dom'
import { useT } from '@i18n/index'

export default function NotFoundPage() {
  const t = useT()
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '100vh',
      backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)',
    }}>
      <h1 style={{ fontSize: '6rem', fontFamily: 'var(--font-display)', color: 'var(--color-accent-primary)' }}>404</h1>
      <p style={{ fontSize: '1.25rem', marginBottom: '24px', color: 'var(--color-text-secondary)' }}>
        {t('errors.notFound')}
      </p>
      <Link to="/dashboard" style={{
        padding: '10px 24px', borderRadius: 'var(--radius-md)',
        backgroundColor: 'var(--color-accent-primary)', color: '#fff',
        textDecoration: 'none', fontFamily: 'var(--font-body)',
      }}>
        {t('nav.dashboard')}
      </Link>
    </div>
  )
}
