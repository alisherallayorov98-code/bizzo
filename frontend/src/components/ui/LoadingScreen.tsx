import { useEffect, useState } from 'react'

interface LoadingScreenProps {
  message?: string
}

export function LoadingScreen({ message = "Yuklanmoqda..." }: LoadingScreenProps) {
  const [dots, setDots] = useState('')

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((d) => (d.length >= 3 ? '' : d + '.'))
    }, 400)
    return () => clearInterval(interval)
  }, [])

  return (
    <div
      style={{
        position:        'fixed',
        inset:           0,
        display:         'flex',
        flexDirection:   'column',
        alignItems:      'center',
        justifyContent:  'center',
        backgroundColor: 'var(--color-bg-primary)',
        zIndex:          9999,
        gap:             'var(--space-6)',
      }}
    >
      {/* Logo */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-3)' }}>
        <div
          style={{
            width:           '64px',
            height:          '64px',
            borderRadius:    'var(--radius-xl)',
            background:      'linear-gradient(135deg, var(--color-accent-primary) 0%, #6366f1 100%)',
            display:         'flex',
            alignItems:      'center',
            justifyContent:  'center',
            boxShadow:       'var(--shadow-glow-blue)',
            animation:       'pulse 2s ease-in-out infinite',
          }}
        >
          <span
            style={{
              color:       '#fff',
              fontSize:    '28px',
              fontWeight:  '700',
              fontFamily:  'var(--font-display)',
              lineHeight:  1,
            }}
          >
            B
          </span>
        </div>

        <div style={{ textAlign: 'center' }}>
          <p
            style={{
              fontFamily:  'var(--font-display)',
              fontSize:    'var(--text-xl)',
              fontWeight:  '700',
              color:       'var(--color-text-primary)',
              letterSpacing: '-0.02em',
            }}
          >
            BiznesERP
          </p>
          <p
            style={{
              fontSize: 'var(--text-xs)',
              color:    'var(--color-text-muted)',
              marginTop: '2px',
            }}
          >
            Enterprise Platform
          </p>
        </div>
      </div>

      {/* Spinner */}
      <div
        style={{
          width:        '40px',
          height:       '40px',
          borderRadius: '50%',
          border:       '3px solid var(--color-border-primary)',
          borderTop:    '3px solid var(--color-accent-primary)',
          animation:    'spin 0.8s linear infinite',
        }}
      />

      {/* Message */}
      <p
        style={{
          fontSize:    'var(--text-sm)',
          color:       'var(--color-text-muted)',
          letterSpacing: '0.02em',
        }}
      >
        {message}{dots}
      </p>

      {/* Inline keyframes */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.8; transform: scale(0.97); }
        }
      `}</style>
    </div>
  )
}
