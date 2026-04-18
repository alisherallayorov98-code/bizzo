import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Building2, Users, CheckCircle, XCircle, Shield, Package, UserCheck,
} from 'lucide-react'
import toast from 'react-hot-toast'
import superAdminApi from '@services/super-admin.service'

const PLAN_COLORS: Record<string, string> = {
  STARTER: '#64748B', BUSINESS: '#3B82F6', PRO: '#8B5CF6', ENTERPRISE: '#F59E0B',
}
const PLANS = ['STARTER', 'BUSINESS', 'PRO', 'ENTERPRISE'] as const

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin', MANAGER: 'Menejer', ACCOUNTANT: 'Buxgalter',
  STOREKEEPER: 'Omborchi', SALESPERSON: 'Sotuvchi', EMPLOYEE: 'Xodim',
}

export default function SACompanyDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [newPlan, setNewPlan] = useState('')

  const { data: company, isLoading } = useQuery({
    queryKey: ['sa-company', id],
    queryFn:  () => superAdminApi.getCompany(id!),
    enabled:  !!id,
  })

  const toggleMut = useMutation({
    mutationFn: () => superAdminApi.toggleCompanyActive(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sa-company', id] })
      qc.invalidateQueries({ queryKey: ['sa-companies'] })
      toast.success('Holat o\'zgartirildi')
    },
  })

  const planMut = useMutation({
    mutationFn: (plan: string) => superAdminApi.changePlan(id!, plan),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sa-company', id] })
      qc.invalidateQueries({ queryKey: ['sa-companies'] })
      toast.success('Plan o\'zgartirildi')
      setNewPlan('')
    },
  })

  const userToggleMut = useMutation({
    mutationFn: superAdminApi.toggleUserActive,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sa-company', id] })
      toast.success('Foydalanuvchi holati o\'zgartirildi')
    },
  })

  if (isLoading) return (
    <div style={{ color: '#94A3B8', textAlign: 'center', paddingTop: 80 }}>Yuklanmoqda...</div>
  )
  if (!company) return (
    <div style={{ color: '#EF4444', padding: 20 }}>Korxona topilmadi</div>
  )

  const cardStyle: React.CSSProperties = {
    backgroundColor: '#0D1526',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 12, padding: 24, marginBottom: 20,
  }

  return (
    <div style={{ maxWidth: 900 }}>
      {/* Back */}
      <button
        onClick={() => navigate('/super-admin/companies')}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#64748B', fontSize: 14, marginBottom: 24, padding: 0,
        }}
      >
        <ArrowLeft size={16} /> Korxonalar ro'yxatiga qaytish
      </button>

      {/* Header */}
      <div style={{ ...cardStyle, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 12,
            background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Building2 size={24} color="white" />
          </div>
          <div>
            <h1 style={{ color: '#E2E8F0', margin: 0, fontSize: 20, fontWeight: 700 }}>{company.name}</h1>
            {company.legalName && <div style={{ color: '#64748B', fontSize: 13, marginTop: 2 }}>{company.legalName}</div>}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
              <span style={{
                padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                backgroundColor: `${PLAN_COLORS[company.plan]}20`, color: PLAN_COLORS[company.plan],
              }}>{company.plan}</span>
              <span style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '3px 10px', borderRadius: 6, fontSize: 12,
                backgroundColor: company.isActive ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                color: company.isActive ? '#10B981' : '#EF4444',
              }}>
                {company.isActive ? <><CheckCircle size={12} /> Faol</> : <><XCircle size={12} /> Bloklangan</>}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          {/* Plan change */}
          <select
            value={newPlan || company.plan}
            onChange={e => {
              const val = e.target.value
              if (val !== company.plan) {
                setNewPlan(val)
                planMut.mutate(val)
              }
            }}
            style={{
              padding: '8px 12px', borderRadius: 8, fontSize: 13,
              backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.1)',
              color: '#E2E8F0', cursor: 'pointer',
            }}
          >
            {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>

          <button
            onClick={() => toggleMut.mutate()}
            style={{
              padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13,
              backgroundColor: company.isActive ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
              color: company.isActive ? '#EF4444' : '#10B981',
            }}
          >
            {company.isActive ? 'Bloklash' : 'Ochish'}
          </button>
        </div>
      </div>

      {/* Info grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        {[
          { label: 'STIR', value: company.stir },
          { label: 'Telefon', value: company.phone },
          { label: 'Email', value: company.email },
          { label: 'Manzil', value: company.address },
        ].filter(r => r.value).map(row => (
          <div key={row.label} style={{
            backgroundColor: '#111827', borderRadius: 10, padding: '14px 18px',
          }}>
            <div style={{ color: '#64748B', fontSize: 11, marginBottom: 4 }}>{row.label}</div>
            <div style={{ color: '#E2E8F0', fontSize: 14 }}>{row.value}</div>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {Object.entries(company._count ?? {}).map(([key, val]) => (
          <div key={key} style={{
            backgroundColor: '#111827', borderRadius: 10, padding: '14px 18px', textAlign: 'center',
          }}>
            <div style={{ color: '#E2E8F0', fontSize: 22, fontWeight: 700 }}>{val as number}</div>
            <div style={{ color: '#64748B', fontSize: 12, marginTop: 2 }}>{key}</div>
          </div>
        ))}
      </div>

      {/* Modules */}
      {company.modules?.length > 0 && (
        <div style={cardStyle}>
          <h3 style={{ color: '#E2E8F0', margin: '0 0 16px', fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Package size={16} color="#8B5CF6" /> Modullar
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {company.modules.map((m: any) => (
              <span key={m.moduleType} style={{
                padding: '5px 14px', borderRadius: 8, fontSize: 13,
                backgroundColor: m.isActive ? 'rgba(139,92,246,0.15)' : 'rgba(100,116,139,0.1)',
                color: m.isActive ? '#A78BFA' : '#64748B',
                border: `1px solid ${m.isActive ? 'rgba(139,92,246,0.3)' : 'rgba(100,116,139,0.2)'}`,
              }}>
                {m.moduleType}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Users */}
      <div style={cardStyle}>
        <h3 style={{ color: '#E2E8F0', margin: '0 0 16px', fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Users size={16} color="#3B82F6" /> Foydalanuvchilar ({company.users?.length ?? 0})
        </h3>
        {company.users?.length === 0 ? (
          <div style={{ color: '#64748B', fontSize: 14 }}>Foydalanuvchilar yo'q</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['Ism', 'Email', 'Rol', 'Oxirgi kirish', 'Holat', ''].map(h => (
                  <th key={h} style={{ padding: '10px 12px', color: '#64748B', fontSize: 12, textAlign: 'left', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {company.users?.map((u: any) => (
                <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <td style={{ padding: '12px', color: '#E2E8F0', fontSize: 14 }}>
                    {u.firstName} {u.lastName}
                  </td>
                  <td style={{ padding: '12px', color: '#94A3B8', fontSize: 13 }}>{u.email}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: 5, fontSize: 12,
                      backgroundColor: u.role === 'ADMIN' ? 'rgba(59,130,246,0.15)' : 'rgba(100,116,139,0.1)',
                      color: u.role === 'ADMIN' ? '#60A5FA' : '#94A3B8',
                    }}>
                      {ROLE_LABELS[u.role] || u.role}
                    </span>
                  </td>
                  <td style={{ padding: '12px', color: '#64748B', fontSize: 13 }}>
                    {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString('uz-UZ') : '—'}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: 5, fontSize: 12,
                      backgroundColor: u.isActive ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                      color: u.isActive ? '#10B981' : '#EF4444',
                    }}>
                      {u.isActive ? 'Faol' : 'Bloklangan'}
                    </span>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <button
                      onClick={() => userToggleMut.mutate(u.id)}
                      style={{
                        padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12,
                        backgroundColor: u.isActive ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                        color: u.isActive ? '#EF4444' : '#10B981',
                      }}
                    >
                      {u.isActive ? 'Bloklash' : 'Ochish'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
