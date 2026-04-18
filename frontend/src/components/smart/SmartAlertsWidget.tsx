import { useSmartAlerts } from '@hooks/useSmartAnalytics'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, AlertCircle, Info, Bell } from 'lucide-react'

const SEVERITY_STYLES = {
  high:   { color: '#EF4444', bg: 'rgba(239,68,68,0.08)',   icon: AlertCircle  },
  medium: { color: '#F59E0B', bg: 'rgba(245,158,11,0.08)',  icon: AlertTriangle },
  low:    { color: '#3B82F6', bg: 'rgba(59,130,246,0.08)',  icon: Info         },
}

export function SmartAlertsWidget() {
  const { data: alerts, isLoading } = useSmartAlerts()
  const navigate = useNavigate()

  if (isLoading) return (
    <div style={{
      background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-primary)',
      borderRadius: 'var(--radius-xl)', padding: 20,
    }}>
      <div style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>Yuklanmoqda...</div>
    </div>
  )

  return (
    <div style={{
      background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-primary)',
      borderRadius: 'var(--radius-xl)', padding: '20px 24px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <Bell size={16} color="var(--color-accent-primary)" />
        <span style={{ color: 'var(--color-text-secondary)', fontSize: 13, fontWeight: 500 }}>
          Smart ogohlantirishlar
        </span>
        {alerts && alerts.length > 0 && (
          <span style={{
            marginLeft: 'auto', fontSize: 11, fontWeight: 700,
            padding: '2px 8px', borderRadius: 10,
            backgroundColor: 'rgba(239,68,68,0.15)', color: '#EF4444',
          }}>
            {alerts.length}
          </span>
        )}
      </div>

      {!alerts || alerts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--color-text-muted)', fontSize: 13 }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>✅</div>
          Hozircha muhim ogohlantirish yo'q
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {alerts.slice(0, 4).map((alert, i) => {
            const style = SEVERITY_STYLES[alert.severity]
            const Icon  = style.icon
            return (
              <div
                key={i}
                onClick={() => navigate(alert.link)}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                  backgroundColor: style.bg, border: `1px solid ${style.color}20`,
                  transition: 'opacity 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              >
                <Icon size={15} color={style.color} style={{ flexShrink: 0, marginTop: 1 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: 'var(--color-text-primary)', fontSize: 13, fontWeight: 600 }}>
                    {alert.title}
                  </div>
                  <div style={{
                    color: 'var(--color-text-muted)', fontSize: 12, marginTop: 1,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {alert.description}
                  </div>
                </div>
              </div>
            )
          })}
          {alerts.length > 4 && (
            <div
              onClick={() => navigate('/smart')}
              style={{ textAlign: 'center', color: 'var(--color-accent-primary)', fontSize: 12, cursor: 'pointer', paddingTop: 4 }}
            >
              Yana {alerts.length - 4} ta → Barchasini ko'rish
            </div>
          )}
        </div>
      )}
    </div>
  )
}
