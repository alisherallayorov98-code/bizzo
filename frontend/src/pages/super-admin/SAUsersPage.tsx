import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import superAdminApi, { SAUser } from '@services/super-admin.service'

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin', MANAGER: 'Menejer', ACCOUNTANT: 'Buxgalter',
  STOREKEEPER: 'Omborchi', SALESPERSON: 'Sotuvchi', EMPLOYEE: 'Xodim',
}
const ROLE_COLORS: Record<string, string> = {
  ADMIN: '#3B82F6', MANAGER: '#8B5CF6', ACCOUNTANT: '#10B981',
  STOREKEEPER: '#F59E0B', SALESPERSON: '#EC4899', EMPLOYEE: '#64748B',
}

export default function SAUsersPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['sa-users', search, roleFilter, page],
    queryFn:  () => superAdminApi.getUsers({
      search:   search || undefined,
      role:     roleFilter || undefined,
      page,
      limit: 20,
    }),
  })

  const toggleMut = useMutation({
    mutationFn: superAdminApi.toggleUserActive,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sa-users'] })
      toast.success('Holat o\'zgartirildi')
    },
  })

  const filterBtn = (active: boolean): React.CSSProperties => ({
    padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13,
    backgroundColor: active ? 'rgba(124,58,237,0.2)' : '#111827',
    color: active ? '#A78BFA' : '#64748B',
  })

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ color: '#E2E8F0', fontSize: 22, fontWeight: 700, margin: 0 }}>Foydalanuvchilar</h1>
        <p style={{ color: '#64748B', fontSize: 14, marginTop: 4 }}>{data?.meta.total ?? 0} ta foydalanuvchi</p>
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
            placeholder="Ism, email qidirish..."
            style={{ background: 'none', border: 'none', color: '#E2E8F0', outline: 'none', fontSize: 14, width: '100%' }}
          />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button style={filterBtn(roleFilter === '')} onClick={() => { setRoleFilter(''); setPage(1) }}>Hammasi</button>
          {Object.entries(ROLE_LABELS).map(([k, v]) => (
            <button key={k} style={filterBtn(roleFilter === k)} onClick={() => { setRoleFilter(k); setPage(1) }}>{v}</button>
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
        ) : data?.data.length === 0 ? (
          <div style={{ color: '#64748B', textAlign: 'center', padding: 60 }}>
            <Users size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
            <div>Foydalanuvchi topilmadi</div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['Foydalanuvchi', 'Korxona', 'Rol', 'Oxirgi kirish', 'Holat', ''].map(h => (
                  <th key={h} style={{ padding: '12px 16px', color: '#64748B', fontSize: 12, textAlign: 'left', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data?.data.map((u: SAUser) => (
                <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ color: '#E2E8F0', fontWeight: 600, fontSize: 14 }}>
                      {u.firstName} {u.lastName}
                    </div>
                    <div style={{ color: '#64748B', fontSize: 12 }}>{u.email}</div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ color: '#94A3B8', fontSize: 14 }}>{u.company?.name}</div>
                    <span style={{
                      fontSize: 11, padding: '2px 7px', borderRadius: 4,
                      backgroundColor: 'rgba(59,130,246,0.1)', color: '#60A5FA',
                    }}>
                      {u.company?.plan}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                      backgroundColor: `${ROLE_COLORS[u.role] ?? '#64748B'}20`,
                      color: ROLE_COLORS[u.role] ?? '#94A3B8',
                    }}>
                      {ROLE_LABELS[u.role] || u.role}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', color: '#64748B', fontSize: 13 }}>
                    {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString('uz-UZ') : '—'}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      padding: '3px 10px', borderRadius: 6, fontSize: 12,
                      backgroundColor: u.isActive ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                      color: u.isActive ? '#10B981' : '#EF4444',
                    }}>
                      {u.isActive ? 'Faol' : 'Bloklangan'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <button
                      onClick={() => toggleMut.mutate(u.id)}
                      style={{
                        padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12,
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
