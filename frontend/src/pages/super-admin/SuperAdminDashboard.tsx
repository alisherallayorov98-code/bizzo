import { useQuery } from '@tanstack/react-query'
import { Building2, Users, TrendingUp, ShieldCheck, AlertCircle } from 'lucide-react'
import superAdminApi, { SAStats } from '@services/super-admin.service'

const PLAN_COLORS: Record<string, string> = {
  STARTER:    '#64748B',
  BUSINESS:   '#3B82F6',
  PRO:        '#8B5CF6',
  ENTERPRISE: '#F59E0B',
}

function StatCard({
  icon: Icon, label, value, color, sub,
}: {
  icon: any; label: string; value: number | string; color: string; sub?: string
}) {
  return (
    <div style={{
      backgroundColor: '#0D1526',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 12,
      padding: '20px 24px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ color: '#94A3B8', fontSize: 13 }}>{label}</span>
        <div style={{
          width: 36, height: 36, borderRadius: 8,
          backgroundColor: `${color}20`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={18} color={color} />
        </div>
      </div>
      <div style={{ color: '#E2E8F0', fontSize: 28, fontWeight: 700 }}>{value}</div>
      {sub && <div style={{ color: '#64748B', fontSize: 12, marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

export default function SuperAdminDashboard() {
  const { data: stats, isLoading, isError } = useQuery<SAStats>({
    queryKey: ['sa-stats'],
    queryFn:  superAdminApi.getStats,
  })

  if (isLoading) return (
    <div style={{ color: '#94A3B8', textAlign: 'center', paddingTop: 80 }}>
      Yuklanmoqda...
    </div>
  )

  if (isError || !stats) return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      color: '#EF4444', backgroundColor: '#1A1A2E',
      padding: '16px 20px', borderRadius: 10,
    }}>
      <AlertCircle size={18} />
      Ma'lumotlarni yuklashda xato
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ color: '#E2E8F0', fontSize: 24, fontWeight: 700, margin: 0 }}>
          Platform Dashboard
        </h1>
        <p style={{ color: '#64748B', fontSize: 14, marginTop: 4 }}>
          Barcha korxonalar va foydalanuvchilar umumiy ko'rinishi
        </p>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        <StatCard
          icon={Building2}
          label="Jami korxonalar"
          value={stats.totalCompanies}
          color="#3B82F6"
          sub={`${stats.activeCompanies} faol, ${stats.inactiveCompanies} blokda`}
        />
        <StatCard
          icon={Users}
          label="Jami foydalanuvchilar"
          value={stats.totalUsers}
          color="#10B981"
        />
        <StatCard
          icon={TrendingUp}
          label="Bu oy yangi korxona"
          value={stats.newCompaniesThisMonth}
          color="#8B5CF6"
        />
        <StatCard
          icon={ShieldCheck}
          label="Faol korxonalar"
          value={`${stats.totalCompanies > 0 ? Math.round((stats.activeCompanies / stats.totalCompanies) * 100) : 0}%`}
          color="#F59E0B"
          sub="faollik darajasi"
        />
      </div>

      {/* Plan breakdown */}
      <div style={{
        backgroundColor: '#0D1526',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 12,
        padding: '24px',
      }}>
        <h2 style={{ color: '#E2E8F0', fontSize: 16, fontWeight: 600, margin: '0 0 20px' }}>
          Tarif rejalari bo'yicha taqsimot
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {(['STARTER', 'BUSINESS', 'PRO', 'ENTERPRISE'] as const).map(plan => (
            <div key={plan} style={{
              backgroundColor: '#111827',
              borderRadius: 10,
              padding: '16px 20px',
              borderLeft: `3px solid ${PLAN_COLORS[plan]}`,
            }}>
              <div style={{ color: PLAN_COLORS[plan], fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
                {plan}
              </div>
              <div style={{ color: '#E2E8F0', fontSize: 28, fontWeight: 700 }}>
                {stats.plans[plan]}
              </div>
              <div style={{ color: '#64748B', fontSize: 12, marginTop: 2 }}>korxona</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
