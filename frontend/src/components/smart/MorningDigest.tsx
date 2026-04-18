import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMorningDigest } from '@hooks/useSmartAnalytics'
import { X, Sun, TrendingUp, AlertTriangle, ArrowUpRight, ArrowDownRight } from 'lucide-react'

const GRADE_COLORS: Record<string, string> = {
  A: '#10B981', B: '#3B82F6', C: '#F59E0B', D: '#F97316', F: '#EF4444',
}
const fmt = (n: number) => new Intl.NumberFormat('uz-UZ').format(Math.round(n))

const DIGEST_SHOWN_KEY = 'digest_shown_date'

export function MorningDigest() {
  const [open, setOpen]   = useState(false)
  const { data, isLoading } = useMorningDigest()
  const navigate = useNavigate()

  // Har kuni bir marta ko'rsat
  useEffect(() => {
    const today = new Date().toDateString()
    const shown = localStorage.getItem(DIGEST_SHOWN_KEY)
    if (shown !== today) {
      const t = setTimeout(() => setOpen(true), 1500)
      return () => clearTimeout(t)
    }
  }, [])

  const handleClose = () => {
    localStorage.setItem(DIGEST_SHOWN_KEY, new Date().toDateString())
    setOpen(false)
  }

  if (!open || isLoading || !data) return null

  const gradeColor = GRADE_COLORS[data.healthGrade] || '#64748B'

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9998,
      backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        width: 520, backgroundColor: '#0D1526',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 20, overflow: 'hidden',
        boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(139,92,246,0.1))',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Sun size={20} color="#F59E0B" />
              <span style={{ color: '#E2E8F0', fontSize: 18, fontWeight: 700 }}>Kunlik xulosa</span>
            </div>
            <div style={{ color: '#64748B', fontSize: 13 }}>{data.date}</div>
          </div>
          <button onClick={handleClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Health + Forecast */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{
              padding: '14px 16px', borderRadius: 12,
              backgroundColor: gradeColor + '10',
              border: `1px solid ${gradeColor}25`,
            }}>
              <div style={{ color: '#94A3B8', fontSize: 12, marginBottom: 6 }}>Biznes sog'ligi</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ color: gradeColor, fontSize: 32, fontWeight: 800 }}>{data.healthScore}</span>
                <span style={{ color: '#64748B', fontSize: 13 }}>/100</span>
                <span style={{
                  marginLeft: 4, padding: '2px 8px', borderRadius: 6, fontSize: 13, fontWeight: 700,
                  backgroundColor: gradeColor + '25', color: gradeColor,
                }}>{data.healthGrade}</span>
              </div>
              <div style={{ color: '#94A3B8', fontSize: 12, marginTop: 4 }}>{data.healthInsight}</div>
            </div>

            <div style={{
              padding: '14px 16px', borderRadius: 12,
              backgroundColor: 'rgba(139,92,246,0.1)',
              border: '1px solid rgba(139,92,246,0.25)',
            }}>
              <div style={{ color: '#94A3B8', fontSize: 12, marginBottom: 6 }}>{data.forecast.nextMonth} bashorat</div>
              <div style={{ color: '#E2E8F0', fontSize: 22, fontWeight: 700 }}>{fmt(data.forecast.predicted)}</div>
              <div style={{ color: '#94A3B8', fontSize: 12, marginBottom: 2 }}>so'm</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {data.forecast.trend === 'up'
                  ? <ArrowUpRight size={14} color="#10B981" />
                  : <ArrowDownRight size={14} color="#EF4444" />}
                <span style={{ fontSize: 13, color: data.forecast.trend === 'up' ? '#10B981' : '#EF4444', fontWeight: 600 }}>
                  {data.forecast.growthRate > 0 ? '+' : ''}{data.forecast.growthRate}%
                </span>
              </div>
            </div>
          </div>

          {/* Critical items */}
          {data.criticalItems.length > 0 && (
            <div style={{
              padding: '14px 16px', borderRadius: 12,
              backgroundColor: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.2)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, color: '#EF4444', fontSize: 13, fontWeight: 600 }}>
                <AlertTriangle size={15} /> Kritik holat ({data.criticalCount} ta)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {data.criticalItems.slice(0, 3).map((item, i) => (
                  <div key={i} style={{ color: '#94A3B8', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: '#EF4444' }}>•</span> {item}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Summary stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {[
              { label: 'Anomaliyalar', value: data.anomalyCount,   color: data.anomalyCount > 0   ? '#F59E0B' : '#10B981' },
              { label: 'Kritik',       value: data.criticalCount,  color: data.criticalCount > 0  ? '#EF4444' : '#10B981' },
              { label: 'Stock xavf',   value: data.depletionCount, color: data.depletionCount > 0 ? '#F97316' : '#10B981' },
            ].map(s => (
              <div key={s.label} style={{
                padding: '10px 14px', borderRadius: 10, textAlign: 'center',
                backgroundColor: s.color + '10', border: `1px solid ${s.color}20`,
              }}>
                <div style={{ color: s.color, fontSize: 22, fontWeight: 700 }}>{s.value}</div>
                <div style={{ color: '#64748B', fontSize: 12 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 24px', borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', gap: 10, justifyContent: 'flex-end',
        }}>
          <button
            onClick={() => { navigate('/smart'); handleClose() }}
            style={{
              padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 14,
              background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
              color: 'white', fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <TrendingUp size={15} /> Batafsil tahlil
          </button>
          <button onClick={handleClose} style={{
            padding: '8px 20px', borderRadius: 8, cursor: 'pointer', fontSize: 14,
            background: 'none', border: '1px solid rgba(255,255,255,0.1)', color: '#94A3B8',
          }}>
            Yopish
          </button>
        </div>
      </div>
    </div>
  )
}
