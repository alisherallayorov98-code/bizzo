import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Building2, Plus, Search, CheckCircle, XCircle, ChevronRight, X } from 'lucide-react'
import toast from 'react-hot-toast'
import superAdminApi, { SACompany, CreateCompanyPayload } from '@services/super-admin.service'

const PLAN_COLORS: Record<string, string> = {
  STARTER: '#64748B', BUSINESS: '#3B82F6', PRO: '#8B5CF6', ENTERPRISE: '#F59E0B',
}

const PLANS = ['STARTER', 'BUSINESS', 'PRO', 'ENTERPRISE'] as const

// ---- Create modal ----
function CreateCompanyModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState<CreateCompanyPayload>({
    name: '', plan: 'STARTER',
    adminFirstName: '', adminLastName: '', adminEmail: '', adminPassword: '',
  })

  const mutation = useMutation({
    mutationFn: superAdminApi.createCompany,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sa-companies'] })
      qc.invalidateQueries({ queryKey: ['sa-stats'] })
      toast.success('Korxona yaratildi')
      onClose()
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Xato'),
  })

  const set = (k: keyof CreateCompanyPayload) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', borderRadius: 8,
    backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.1)',
    color: '#E2E8F0', fontSize: 14, boxSizing: 'border-box',
    outline: 'none',
  }
  const labelStyle: React.CSSProperties = { color: '#94A3B8', fontSize: 12, marginBottom: 4, display: 'block' }

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div style={{
        backgroundColor: '#0D1526', borderRadius: 16, width: 540,
        border: '1px solid rgba(255,255,255,0.08)', padding: 28, maxHeight: '90vh', overflow: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ color: '#E2E8F0', margin: 0, fontSize: 18, fontWeight: 600 }}>Yangi korxona</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'grid', gap: 16 }}>
          <div>
            <label style={labelStyle}>Korxona nomi *</label>
            <input style={inputStyle} value={form.name} onChange={set('name')} placeholder="MChJ nomi" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Yuridik nomi</label>
              <input style={inputStyle} value={form.legalName || ''} onChange={set('legalName')} />
            </div>
            <div>
              <label style={labelStyle}>STIR</label>
              <input style={inputStyle} value={form.stir || ''} onChange={set('stir')} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Telefon</label>
              <input style={inputStyle} value={form.phone || ''} onChange={set('phone')} />
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              <input style={inputStyle} value={form.email || ''} onChange={set('email')} type="email" />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Tarif rejasi *</label>
            <select style={inputStyle} value={form.plan} onChange={set('plan')}>
              {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 16 }}>
            <div style={{ color: '#7C3AED', fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Admin foydalanuvchi</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={labelStyle}>Ism *</label>
                <input style={inputStyle} value={form.adminFirstName} onChange={set('adminFirstName')} />
              </div>
              <div>
                <label style={labelStyle}>Familiya *</label>
                <input style={inputStyle} value={form.adminLastName} onChange={set('adminLastName')} />
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Admin email *</label>
              <input style={inputStyle} value={form.adminEmail} onChange={set('adminEmail')} type="email" />
            </div>
            <div>
              <label style={labelStyle}>Parol *</label>
              <input style={inputStyle} value={form.adminPassword} onChange={set('adminPassword')} type="password" />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{
            padding: '9px 20px', borderRadius: 8, background: 'none',
            border: '1px solid rgba(255,255,255,0.1)', color: '#94A3B8', cursor: 'pointer', fontSize: 14,
          }}>
            Bekor qilish
          </button>
          <button
            onClick={() => mutation.mutate(form)}
            disabled={mutation.isPending || !form.name || !form.adminEmail || !form.adminPassword}
            style={{
              padding: '9px 20px', borderRadius: 8, border: 'none',
              background: 'linear-gradient(135deg, #7C3AED, #5B21B6)',
              color: 'white', cursor: 'pointer', fontSize: 14, fontWeight: 600,
              opacity: mutation.isPending ? 0.7 : 1,
            }}
          >
            {mutation.isPending ? 'Yaratilmoqda...' : 'Yaratish'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ---- Main page ----
export default function SACompaniesPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [planFilter, setPlanFilter] = useState('')
  const [activeFilter, setActiveFilter] = useState('')
  const [page, setPage] = useState(1)
  const [showCreate, setShowCreate] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['sa-companies', search, planFilter, activeFilter, page],
    queryFn:  () => superAdminApi.getCompanies({
      search:   search || undefined,
      plan:     planFilter || undefined,
      isActive: activeFilter || undefined,
      page,
      limit: 15,
    }),
  })

  const toggleMut = useMutation({
    mutationFn: superAdminApi.toggleCompanyActive,
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ['sa-companies'] })
      qc.invalidateQueries({ queryKey: ['sa-stats'] })
      toast.success(res.isActive ? 'Korxona ochildi' : 'Korxona bloklandi')
    },
  })

  const filterBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13,
    backgroundColor: active ? 'rgba(124,58,237,0.2)' : '#111827',
    color: active ? '#A78BFA' : '#64748B',
  })

  return (
    <div>
      {showCreate && <CreateCompanyModal onClose={() => setShowCreate(false)} />}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ color: '#E2E8F0', fontSize: 22, fontWeight: 700, margin: 0 }}>Korxonalar</h1>
          <p style={{ color: '#64748B', fontSize: 14, marginTop: 4 }}>
            {data?.meta.total ?? 0} ta korxona
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 18px', borderRadius: 10, border: 'none',
            background: 'linear-gradient(135deg, #7C3AED, #5B21B6)',
            color: 'white', cursor: 'pointer', fontSize: 14, fontWeight: 600,
          }}
        >
          <Plus size={16} /> Yangi korxona
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 10, padding: '8px 14px', flex: '0 0 260px',
        }}>
          <Search size={15} color="#64748B" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Qidirish..."
            style={{ background: 'none', border: 'none', color: '#E2E8F0', outline: 'none', fontSize: 14, width: '100%' }}
          />
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          <button style={filterBtnStyle(activeFilter === '')}  onClick={() => { setActiveFilter(''); setPage(1) }}>Hammasi</button>
          <button style={filterBtnStyle(activeFilter === 'true')} onClick={() => { setActiveFilter('true'); setPage(1) }}>Faol</button>
          <button style={filterBtnStyle(activeFilter === 'false')} onClick={() => { setActiveFilter('false'); setPage(1) }}>Bloklangan</button>
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          {['', ...PLANS].map(p => (
            <button key={p} style={filterBtnStyle(planFilter === p)} onClick={() => { setPlanFilter(p); setPage(1) }}>
              {p || 'Barcha plan'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{
        backgroundColor: '#0D1526',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 12, overflow: 'hidden',
      }}>
        {isLoading ? (
          <div style={{ color: '#64748B', textAlign: 'center', padding: 60 }}>Yuklanmoqda...</div>
        ) : (data?.data.length === 0) ? (
          <div style={{ color: '#64748B', textAlign: 'center', padding: 60 }}>
            <Building2 size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
            <div>Korxona topilmadi</div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['Korxona', 'Plan', 'Users', 'Contacts', 'Holat', 'Sana', ''].map(h => (
                  <th key={h} style={{ padding: '12px 16px', color: '#64748B', fontSize: 12, textAlign: 'left', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data?.data.map((c: SACompany) => (
                <tr
                  key={c.id}
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ color: '#E2E8F0', fontWeight: 600, fontSize: 14 }}>{c.name}</div>
                    {c.stir && <div style={{ color: '#64748B', fontSize: 12 }}>STIR: {c.stir}</div>}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                      backgroundColor: `${PLAN_COLORS[c.plan]}20`, color: PLAN_COLORS[c.plan],
                    }}>{c.plan}</span>
                  </td>
                  <td style={{ padding: '14px 16px', color: '#94A3B8', fontSize: 14 }}>{c._count?.users ?? 0}</td>
                  <td style={{ padding: '14px 16px', color: '#94A3B8', fontSize: 14 }}>{c._count?.contacts ?? 0}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <button
                      onClick={e => { e.stopPropagation(); toggleMut.mutate(c.id) }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
                        backgroundColor: c.isActive ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                        color: c.isActive ? '#10B981' : '#EF4444', fontSize: 12,
                      }}
                    >
                      {c.isActive ? <><CheckCircle size={13} /> Faol</> : <><XCircle size={13} /> Bloklangan</>}
                    </button>
                  </td>
                  <td style={{ padding: '14px 16px', color: '#64748B', fontSize: 13 }}>
                    {new Date(c.createdAt).toLocaleDateString('uz-UZ')}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <button
                      onClick={() => navigate(`/super-admin/companies/${c.id}`)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
                    >
                      <ChevronRight size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {data && data.meta.totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
          {Array.from({ length: data.meta.totalPages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPage(p)} style={{
              width: 36, height: 36, borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 14,
              backgroundColor: p === page ? 'rgba(124,58,237,0.2)' : '#111827',
              color: p === page ? '#A78BFA' : '#64748B',
            }}>{p}</button>
          ))}
        </div>
      )}
    </div>
  )
}
