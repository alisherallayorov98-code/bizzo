import { useHealthScore } from '@hooks/useSmartAnalytics'
import { TrendingUp, TrendingDown, Minus, Activity } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const GRADE_COLORS: Record<string, string> = {
  A: '#10B981', B: '#3B82F6', C: '#F59E0B', D: '#F97316', F: '#EF4444',
}

function TrendIcon({ trend }: { trend: 'up' | 'down' | 'stable' }) {
  if (trend === 'up')     return <TrendingUp  size={13} color="#10B981" />
  if (trend === 'down')   return <TrendingDown size={13} color="#EF4444" />
  return <Minus size={13} color="#64748B" />
}

export function HealthScoreWidget() {
  const { data, isLoading } = useHealthScore()
  const navigate = useNavigate()

  if (isLoading) return (
    <div style={{
      background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-primary)',
      borderRadius: 'var(--radius-xl)', padding: 20, height: 180,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>Tahlil qilinmoqda...</div>
    </div>
  )

  if (!data) return null

  const gradeColor = GRADE_COLORS[data.grade]
  const circumference = 2 * Math.PI * 36
  const offset = circumference - (data.total / 100) * circumference

  return (
    <div
      onClick={() => navigate('/smart')}
      style={{
        background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-primary)',
        borderRadius: 'var(--radius-xl)', padding: '20px 24px', cursor: 'pointer',
        transition: 'border-color 0.15s',
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = gradeColor + '60')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-border-primary)')}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Activity size={16} color={gradeColor} />
          <span style={{ color: 'var(--color-text-secondary)', fontSize: 13, fontWeight: 500 }}>
            Biznes sog'ligi
          </span>
        </div>
        <span style={{
          fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
          backgroundColor: gradeColor + '20', color: gradeColor,
        }}>
          {data.grade} daraja
        </span>
      </div>

      {/* Score circle + components */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        {/* Circle */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <svg width={88} height={88} viewBox="0 0 88 88">
            <circle cx={44} cy={44} r={36} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={7} />
            <circle
              cx={44} cy={44} r={36} fill="none"
              stroke={gradeColor} strokeWidth={7}
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              transform="rotate(-90 44 44)"
              style={{ transition: 'stroke-dashoffset 1s ease' }}
            />
          </svg>
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ color: gradeColor, fontSize: 22, fontWeight: 800, lineHeight: 1 }}>{data.total}</span>
            <span style={{ color: 'var(--color-text-muted)', fontSize: 10 }}>/100</span>
          </div>
        </div>

        {/* Components */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {Object.entries(data.components).map(([key, comp]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <TrendIcon trend={comp.trend} />
              <span style={{ color: 'var(--color-text-muted)', fontSize: 12, flex: 1 }}>{comp.label}</span>
              <div style={{
                width: 60, height: 4, borderRadius: 2,
                backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden',
              }}>
                <div style={{
                  width: `${(comp.score / comp.max) * 100}%`, height: '100%',
                  backgroundColor: comp.score / comp.max > 0.7 ? '#10B981' : comp.score / comp.max > 0.4 ? '#F59E0B' : '#EF4444',
                  borderRadius: 2, transition: 'width 0.8s ease',
                }} />
              </div>
              <span style={{ color: 'var(--color-text-muted)', fontSize: 11, width: 24, textAlign: 'right' }}>
                {comp.score}/{comp.max}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Insight */}
      <div style={{
        marginTop: 14, padding: '8px 12px', borderRadius: 8,
        backgroundColor: gradeColor + '10', borderLeft: `2px solid ${gradeColor}`,
        color: 'var(--color-text-secondary)', fontSize: 12,
      }}>
        {data.insight}
      </div>
    </div>
  )
}
