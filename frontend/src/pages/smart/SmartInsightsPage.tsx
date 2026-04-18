import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  useHealthScore, useABCAnalysis, useRFMAnalysis,
  useSalesForecast, useStockDepletion, useAnomalies, useSmartAlerts,
} from '@hooks/useSmartAnalytics'
import {
  Activity, Package, Users, TrendingUp, AlertTriangle, Bell,
  BarChart2, ChevronRight, ArrowUpRight, ArrowDownRight,
} from 'lucide-react'

// ─── helpers ─────────────────────────────────────────────────────────────────
const fmt = (n: number) => new Intl.NumberFormat('uz-UZ').format(Math.round(n))

const ABC_COLORS = { A: '#10B981', B: '#3B82F6', C: '#94A3B8' }
const SEGMENT_COLORS: Record<string, string> = {
  Champions: '#10B981', Loyal: '#3B82F6', Potential: '#8B5CF6',
  AtRisk: '#F59E0B', Lost: '#EF4444', New: '#06B6D4',
}
const SEVERITY = { high: '#EF4444', medium: '#F59E0B', low: '#3B82F6' }

type Tab = 'overview' | 'abc' | 'rfm' | 'forecast' | 'depletion' | 'anomalies'

// ─── small reusable ───────────────────────────────────────────────────────────
function TabBtn({ id, active, onClick, children }: any) {
  return (
    <button onClick={() => onClick(id)} style={{
      padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13,
      backgroundColor: active ? 'rgba(59,130,246,0.15)' : 'transparent',
      color: active ? '#60A5FA' : 'var(--color-text-muted)',
      fontWeight: active ? 600 : 400, transition: 'all 0.15s',
    }}>{children}</button>
  )
}

function Card({ children, style = {} }: any) {
  return (
    <div style={{
      background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-primary)',
      borderRadius: 'var(--radius-xl)', padding: 24, ...style,
    }}>{children}</div>
  )
}

function SectionTitle({ icon: Icon, color, children }: any) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
      <Icon size={18} color={color} />
      <h2 style={{ color: 'var(--color-text-primary)', fontSize: 16, fontWeight: 700, margin: 0 }}>{children}</h2>
    </div>
  )
}

// ─── OVERVIEW ────────────────────────────────────────────────────────────────
function OverviewTab() {
  const { data: health }  = useHealthScore()
  const { data: alerts }  = useSmartAlerts()
  const { data: anomalies } = useAnomalies()
  const { data: forecast }  = useSalesForecast()
  const navigate = useNavigate()

  const GRADE_COLORS: Record<string, string> = { A: '#10B981', B: '#3B82F6', C: '#F59E0B', D: '#F97316', F: '#EF4444' }
  const gradeColor = health ? GRADE_COLORS[health.grade] : '#64748B'

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
      {/* Health */}
      {health && (
        <Card>
          <SectionTitle icon={Activity} color={gradeColor}>Biznes sog'ligi</SectionTitle>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 56, fontWeight: 900, color: gradeColor, lineHeight: 1 }}>{health.total}</div>
              <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>/ 100 ball</div>
              <div style={{
                fontSize: 14, fontWeight: 700, marginTop: 6, padding: '3px 12px', borderRadius: 8,
                backgroundColor: gradeColor + '20', color: gradeColor,
              }}>{health.grade} daraja</div>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {Object.entries(health.components).map(([key, c]) => (
                <div key={key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>{c.label}</span>
                    <span style={{ color: 'var(--color-text-secondary)', fontSize: 12 }}>{c.score}/{c.max}</span>
                  </div>
                  <div style={{ height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.06)' }}>
                    <div style={{
                      width: `${(c.score / c.max) * 100}%`, height: '100%', borderRadius: 3,
                      backgroundColor: c.score / c.max > 0.7 ? '#10B981' : c.score / c.max > 0.4 ? '#F59E0B' : '#EF4444',
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={{
            marginTop: 16, padding: '10px 14px', borderRadius: 8,
            backgroundColor: gradeColor + '10', color: 'var(--color-text-secondary)', fontSize: 13,
            borderLeft: `3px solid ${gradeColor}`,
          }}>
            {health.insight}
          </div>
        </Card>
      )}

      {/* Forecast */}
      {forecast && (
        <Card>
          <SectionTitle icon={TrendingUp} color="#8B5CF6">Savdo bashorati</SectionTitle>
          <div style={{ marginBottom: 16 }}>
            <div style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>{forecast.month} uchun bashorat</div>
            <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--color-text-primary)', margin: '4px 0' }}>
              {fmt(forecast.predicted)} <span style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>so'm</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {forecast.trend === 'up'
                ? <ArrowUpRight size={16} color="#10B981" />
                : <ArrowDownRight size={16} color="#EF4444" />}
              <span style={{ fontSize: 14, color: forecast.trend === 'up' ? '#10B981' : '#EF4444', fontWeight: 600 }}>
                {forecast.growthRate > 0 ? '+' : ''}{forecast.growthRate}%
              </span>
              <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>o'tgan oyga nisbatan</span>
              <span style={{ marginLeft: 'auto', fontSize: 12, color: '#8B5CF6' }}>
                {forecast.confidence}% ishonch
              </span>
            </div>
          </div>
          {/* Mini bar chart */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 60 }}>
            {forecast.history.map((h, i) => {
              const max = Math.max(...forecast.history.map(x => x.actual), 1)
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                  <div style={{
                    width: '100%', borderRadius: '3px 3px 0 0',
                    height: `${Math.max(4, (h.actual / max) * 50)}px`,
                    backgroundColor: i === 5 ? '#8B5CF6' : 'rgba(139,92,246,0.3)',
                  }} />
                  <div style={{ color: 'var(--color-text-muted)', fontSize: 9 }}>{h.month.split(' ')[0]}</div>
                </div>
              )
            })}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <div style={{
                width: '100%', borderRadius: '3px 3px 0 0',
                height: `${Math.max(4, (forecast.predicted / Math.max(...forecast.history.map(x => x.actual), forecast.predicted, 1)) * 50)}px`,
                backgroundColor: '#10B981', border: '1px dashed #10B98160',
              }} />
              <div style={{ color: '#10B981', fontSize: 9 }}>Bashorat</div>
            </div>
          </div>
        </Card>
      )}

      {/* Alerts */}
      {alerts && (
        <Card style={{ gridColumn: 'span 2' }}>
          <SectionTitle icon={Bell} color="#F59E0B">Aktiv ogohlantirishlar</SectionTitle>
          {alerts.length === 0 ? (
            <div style={{ color: 'var(--color-text-muted)', fontSize: 14, textAlign: 'center', padding: '16px 0' }}>
              ✅ Muhim ogohlantirish yo'q
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {alerts.map((a, i) => (
                <div key={i} onClick={() => navigate(a.link)} style={{
                  padding: '12px 16px', borderRadius: 10, cursor: 'pointer',
                  backgroundColor: SEVERITY[a.severity] + '10',
                  border: `1px solid ${SEVERITY[a.severity]}25`,
                }}>
                  <div style={{ color: SEVERITY[a.severity], fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                    {a.title}
                  </div>
                  <div style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>{a.description}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  )
}

// ─── ABC ─────────────────────────────────────────────────────────────────────
function ABCTab() {
  const { data, isLoading, isError } = useABCAnalysis()
  if (isLoading) return <div style={{ color: 'var(--color-text-muted)', padding: 40, textAlign: 'center' }}>Tahlil qilinmoqda...</div>
  if (isError)   return <div style={{ color: 'var(--color-danger)', padding: 40, textAlign: 'center', fontSize: 14 }}>Ma'lumot yuklanmadi. Qayta urinib ko'ring.</div>
  if (!data?.length) return <div style={{ color: 'var(--color-text-muted)', padding: 40, textAlign: 'center' }}>Ma'lumot yo'q</div>

  const counts = { A: data.filter(p => p.category === 'A').length, B: data.filter(p => p.category === 'B').length, C: data.filter(p => p.category === 'C').length }

  return (
    <div>
      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
        {(['A', 'B', 'C'] as const).map(cat => (
          <Card key={cat} style={{ borderLeft: `4px solid ${ABC_COLORS[cat]}` }}>
            <div style={{ color: ABC_COLORS[cat], fontSize: 24, fontWeight: 800 }}>{cat}</div>
            <div style={{ color: 'var(--color-text-primary)', fontSize: 22, fontWeight: 700 }}>{counts[cat]}</div>
            <div style={{ color: 'var(--color-text-muted)', fontSize: 12, marginTop: 2 }}>
              {cat === 'A' ? '80% daromad' : cat === 'B' ? '15% daromad' : '5% daromad'}
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border-primary)' }}>
              {['#', 'Mahsulot', 'Kategoriya', 'Daromad', 'Ulush', 'Kumulativ', 'Narx'].map(h => (
                <th key={h} style={{ padding: '10px 12px', color: 'var(--color-text-muted)', fontSize: 12, textAlign: 'left', fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.slice(0, 30).map((p, i) => (
              <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <td style={{ padding: '10px 12px', color: 'var(--color-text-muted)', fontSize: 13 }}>{i + 1}</td>
                <td style={{ padding: '10px 12px', color: 'var(--color-text-primary)', fontSize: 13, fontWeight: 500 }}>{p.name}</td>
                <td style={{ padding: '10px 12px' }}>
                  <span style={{
                    padding: '2px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700,
                    backgroundColor: ABC_COLORS[p.category] + '20', color: ABC_COLORS[p.category],
                  }}>{p.category}</span>
                </td>
                <td style={{ padding: '10px 12px', color: 'var(--color-text-secondary)', fontSize: 13 }}>{fmt(p.revenue)} so'm</td>
                <td style={{ padding: '10px 12px', color: 'var(--color-text-muted)', fontSize: 13 }}>{p.revenueShare.toFixed(1)}%</td>
                <td style={{ padding: '10px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 60, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.06)' }}>
                      <div style={{ width: `${Math.min(100, p.cumulativeShare)}%`, height: '100%', borderRadius: 3, backgroundColor: ABC_COLORS[p.category] }} />
                    </div>
                    <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>{p.cumulativeShare.toFixed(0)}%</span>
                  </div>
                </td>
                <td style={{ padding: '10px 12px', color: 'var(--color-text-muted)', fontSize: 13 }}>{fmt(p.sellPrice)} so'm</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

// ─── RFM ─────────────────────────────────────────────────────────────────────
function RFMTab() {
  const { data, isLoading, isError } = useRFMAnalysis()
  if (isLoading) return <div style={{ color: 'var(--color-text-muted)', padding: 40, textAlign: 'center' }}>Tahlil qilinmoqda...</div>
  if (isError)   return <div style={{ color: 'var(--color-danger)', padding: 40, textAlign: 'center', fontSize: 14 }}>Ma'lumot yuklanmadi. Qayta urinib ko'ring.</div>
  if (!data?.length) return <div style={{ color: 'var(--color-text-muted)', padding: 40, textAlign: 'center' }}>Mijozlar ma'lumoti yo'q</div>

  const segments = Array.from(new Set(data.map(c => c.segment)))
  const segmentCounts = Object.fromEntries(segments.map(s => [s, data.filter(c => c.segment === s).length]))

  return (
    <div>
      {/* Segment summary */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        {segments.map(seg => (
          <div key={seg} style={{
            padding: '10px 18px', borderRadius: 10, flex: '1 1 160px',
            backgroundColor: (SEGMENT_COLORS[seg] || '#64748B') + '15',
            border: `1px solid ${(SEGMENT_COLORS[seg] || '#64748B')}30`,
          }}>
            <div style={{ color: SEGMENT_COLORS[seg] || '#64748B', fontSize: 13, fontWeight: 600 }}>{data.find(c => c.segment === seg)?.segmentUz}</div>
            <div style={{ color: 'var(--color-text-primary)', fontSize: 24, fontWeight: 700 }}>{segmentCounts[seg]}</div>
            <div style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>mijoz</div>
          </div>
        ))}
      </div>

      <Card>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border-primary)' }}>
              {['Mijoz', 'Segment', 'R (kun)', 'F (marta)', 'M (so\'m)', 'R', 'F', 'M', 'Ball'].map(h => (
                <th key={h} style={{ padding: '10px 12px', color: 'var(--color-text-muted)', fontSize: 12, textAlign: 'left', fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.slice(0, 25).map(c => (
              <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <td style={{ padding: '10px 12px', color: 'var(--color-text-primary)', fontSize: 13, fontWeight: 500 }}>{c.name}</td>
                <td style={{ padding: '10px 12px' }}>
                  <span style={{
                    padding: '2px 8px', borderRadius: 5, fontSize: 11, fontWeight: 600,
                    backgroundColor: (SEGMENT_COLORS[c.segment] || '#64748B') + '20',
                    color: SEGMENT_COLORS[c.segment] || '#94A3B8',
                  }}>{c.segmentUz}</span>
                </td>
                <td style={{ padding: '10px 12px', color: 'var(--color-text-muted)', fontSize: 13 }}>{c.recencyDays}</td>
                <td style={{ padding: '10px 12px', color: 'var(--color-text-muted)', fontSize: 13 }}>{c.frequency}</td>
                <td style={{ padding: '10px 12px', color: 'var(--color-text-muted)', fontSize: 13 }}>{fmt(c.monetary)}</td>
                {[c.rScore, c.fScore, c.mScore].map((s, i) => (
                  <td key={i} style={{ padding: '10px 12px' }}>
                    <span style={{
                      width: 24, height: 24, borderRadius: '50%', display: 'inline-flex',
                      alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700,
                      backgroundColor: s >= 4 ? '#10B98120' : s >= 3 ? '#3B82F620' : '#EF444420',
                      color: s >= 4 ? '#10B981' : s >= 3 ? '#60A5FA' : '#EF4444',
                    }}>{s}</span>
                  </td>
                ))}
                <td style={{ padding: '10px 12px', color: 'var(--color-text-secondary)', fontSize: 13, fontWeight: 600 }}>{c.rfmScore}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

// ─── FORECAST ────────────────────────────────────────────────────────────────
function ForecastTab() {
  const { data: f, isLoading, isError } = useSalesForecast()
  const { data: dep }                   = useStockDepletion()
  if (isLoading) return <div style={{ color: 'var(--color-text-muted)', padding: 40, textAlign: 'center' }}>Hisoblanmoqda...</div>
  if (isError)   return <div style={{ color: 'var(--color-danger)', padding: 40, textAlign: 'center', fontSize: 14 }}>Ma'lumot yuklanmadi. Qayta urinib ko'ring.</div>

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
      {f && (
        <Card style={{ gridColumn: 'span 2' }}>
          <SectionTitle icon={TrendingUp} color="#8B5CF6">Savdo bashorati</SectionTitle>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120, marginBottom: 12 }}>
            {[...f.history, { month: f.month, actual: f.predicted }].map((h, i) => {
              const isLast = i === f.history.length
              const max    = Math.max(...f.history.map(x => x.actual), f.predicted, 1)
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>
                    {fmt(isLast ? f.predicted : h.actual)}
                  </div>
                  <div style={{
                    width: '100%', borderRadius: '4px 4px 0 0',
                    height: `${Math.max(8, ((isLast ? f.predicted : h.actual) / max) * 80)}px`,
                    backgroundColor: isLast ? '#8B5CF6' : '#3B82F640',
                    border: isLast ? '2px dashed #8B5CF6' : 'none',
                    transition: 'height 0.6s ease',
                  }} />
                  <div style={{ color: isLast ? '#8B5CF6' : 'var(--color-text-muted)', fontSize: 10, fontWeight: isLast ? 600 : 400 }}>
                    {h.month}
                  </div>
                </div>
              )
            })}
          </div>
          <div style={{ display: 'flex', gap: 20, padding: '14px 16px', backgroundColor: 'rgba(139,92,246,0.08)', borderRadius: 10 }}>
            <div><div style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>Bashorat</div>
              <div style={{ color: '#8B5CF6', fontSize: 20, fontWeight: 700 }}>{fmt(f.predicted)} so'm</div></div>
            <div><div style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>O'sish</div>
              <div style={{ color: f.growthRate >= 0 ? '#10B981' : '#EF4444', fontSize: 20, fontWeight: 700 }}>
                {f.growthRate > 0 ? '+' : ''}{f.growthRate}%</div></div>
            <div><div style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>Ishonch darajasi</div>
              <div style={{ color: 'var(--color-text-primary)', fontSize: 20, fontWeight: 700 }}>{f.confidence}%</div></div>
          </div>
        </Card>
      )}

      {/* Stock depletion */}
      {dep && dep.length > 0 && (
        <Card style={{ gridColumn: 'span 2' }}>
          <SectionTitle icon={Package} color="#F59E0B">Mahsulot tugash bashorati</SectionTitle>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border-primary)' }}>
                {['Mahsulot', 'Hozirgi qoldiq', 'Kunlik sarflash', 'Tugash sanasi', 'Qolgan kun', 'Holat'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', color: 'var(--color-text-muted)', fontSize: 12, textAlign: 'left', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dep.slice(0, 15).map(p => {
                const c = p.urgency === 'critical' ? '#EF4444' : p.urgency === 'warning' ? '#F59E0B' : '#10B981'
                return (
                  <tr key={p.productId} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td style={{ padding: '10px 12px', color: 'var(--color-text-primary)', fontSize: 13 }}>{p.name}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--color-text-secondary)', fontSize: 13 }}>{p.currentStock} {p.unit}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--color-text-muted)', fontSize: 13 }}>{p.avgDailyConsumption} {p.unit}/kun</td>
                    <td style={{ padding: '10px 12px', color: 'var(--color-text-muted)', fontSize: 13 }}>{p.depletionDate || '—'}</td>
                    <td style={{ padding: '10px 12px', color: c, fontSize: 13, fontWeight: 600 }}>{p.daysUntilEmpty ?? '—'} kun</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ padding: '2px 10px', borderRadius: 6, fontSize: 12, backgroundColor: c + '20', color: c }}>
                        {p.urgency === 'critical' ? 'Kritik' : p.urgency === 'warning' ? 'Diqqat' : 'Yaxshi'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}

// ─── ANOMALIES ────────────────────────────────────────────────────────────────
function AnomaliesTab() {
  const { data, isLoading, isError } = useAnomalies()
  if (isLoading) return <div style={{ color: 'var(--color-text-muted)', padding: 40, textAlign: 'center' }}>Tekshirilmoqda...</div>
  if (isError)   return <div style={{ color: 'var(--color-danger)', padding: 40, textAlign: 'center', fontSize: 14 }}>Ma'lumot yuklanmadi. Qayta urinib ko'ring.</div>

  return (
    <div>
      {!data?.length ? (
        <Card style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
          <div style={{ color: 'var(--color-text-secondary)', fontSize: 16, fontWeight: 600 }}>Anomaliya aniqlanmadi</div>
          <div style={{ color: 'var(--color-text-muted)', fontSize: 13, marginTop: 6 }}>Barcha ko'rsatkichlar normal chegarada</div>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {data.map((a, i) => {
            const c = SEVERITY[a.severity]
            return (
              <Card key={i} style={{ borderLeft: `4px solid ${c}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <AlertTriangle size={16} color={c} />
                      <span style={{ color: 'var(--color-text-primary)', fontSize: 15, fontWeight: 700 }}>{a.title}</span>
                      <span style={{ padding: '2px 8px', borderRadius: 5, fontSize: 11, backgroundColor: c + '20', color: c }}>
                        {a.severity === 'high' ? 'Yuqori' : a.severity === 'medium' ? "O'rta" : 'Past'}
                      </span>
                    </div>
                    <div style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>{a.description}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ color: c, fontSize: 18, fontWeight: 700 }}>-{a.deviationPct}%</div>
                    <div style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>og'ish</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 24, marginTop: 14, padding: '12px 0', borderTop: '1px solid var(--color-border-primary)' }}>
                  <div>
                    <div style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>Hozirgi</div>
                    <div style={{ color: c, fontSize: 15, fontWeight: 600 }}>{fmt(a.value)}</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>Kutilgan</div>
                    <div style={{ color: 'var(--color-text-secondary)', fontSize: 15, fontWeight: 600 }}>{fmt(a.expectedValue)}</div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: 'overview',   label: 'Umumiy',      icon: BarChart2   },
  { id: 'abc',        label: 'ABC tahlil',  icon: Package     },
  { id: 'rfm',        label: 'RFM tahlil',  icon: Users       },
  { id: 'forecast',   label: 'Bashorat',    icon: TrendingUp  },
  { id: 'anomalies',  label: 'Anomaliyalar', icon: AlertTriangle },
]

export default function SmartInsightsPage() {
  const [tab, setTab] = useState<Tab>('overview')

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ color: 'var(--color-text-primary)', fontSize: 24, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Activity size={24} color="#3B82F6" /> Smart Tahlil
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginTop: 4 }}>
          Aqlli algoritmlar va bashorat tizimi
        </p>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 4, marginBottom: 24,
        backgroundColor: 'var(--color-bg-elevated)',
        border: '1px solid var(--color-border-primary)',
        borderRadius: 10, padding: 4, width: 'fit-content',
      }}>
        {TABS.map(({ id, label, icon: Icon }) => (
          <TabBtn key={id} id={id} active={tab === id} onClick={setTab}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon size={14} /> {label}
            </span>
          </TabBtn>
        ))}
      </div>

      {/* Content */}
      {tab === 'overview'  && <OverviewTab />}
      {tab === 'abc'       && <ABCTab />}
      {tab === 'rfm'       && <RFMTab />}
      {tab === 'forecast'  && <ForecastTab />}
      {tab === 'anomalies' && <AnomaliesTab />}
    </div>
  )
}
