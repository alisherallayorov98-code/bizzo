import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Send, Trash2, Eye, MessageSquare, Mail, Users } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import api from '@/config/api'

const TYPE_CFG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  SMS:   { label: 'SMS',   color: 'bg-blue-500/20 text-blue-300',   icon: <MessageSquare className="w-3.5 h-3.5" /> },
  EMAIL: { label: 'Email', color: 'bg-purple-500/20 text-purple-300', icon: <Mail className="w-3.5 h-3.5" /> },
}
const STATUS_CFG: Record<string, { label: string; color: string }> = {
  DRAFT:     { label: 'Qoralama',   color: 'bg-gray-500/20 text-gray-300' },
  SENDING:   { label: 'Yuborilmoqda', color: 'bg-yellow-500/20 text-yellow-300' },
  COMPLETED: { label: 'Tugadi',     color: 'bg-green-500/20 text-green-300' },
  FAILED:    { label: 'Xatolik',    color: 'bg-red-500/20 text-red-300' },
}

// ─── Form Modal ───────────────────────────────────────────────────
interface FormData {
  name: string; type: string; subject: string; body: string
  targetFilter: { tags?: string; hasPhone?: boolean; hasEmail?: boolean }
  scheduledAt: string
}
const EMPTY: FormData = { name: '', type: 'SMS', subject: '', body: '', targetFilter: {}, scheduledAt: '' }

function CampaignFormModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState<FormData>(EMPTY)
  const [preview, setPreview] = useState<number | null>(null)

  const createMut = useMutation({
    mutationFn: (data: FormData) => api.post('/campaigns', data).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['campaigns'] }); toast.success('Kampaniya yaratildi'); onClose() },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Xatolik'),
  })

  const previewMut = useMutation({
    mutationFn: () => api.post('/campaigns/preview-count', { targetFilter: form.targetFilter }).then(r => r.data),
    onSuccess: (d: any) => setPreview(d.count),
  })

  const set = (k: keyof FormData, v: any) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-[#0D1628] border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-white/10">
          <h2 className="text-white font-semibold text-lg">Yangi kampaniya</h2>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Nomi *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Tur</label>
            <div className="flex gap-2">
              {['SMS', 'EMAIL'].map(t => (
                <button key={t} onClick={() => set('type', t)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    form.type === t ? 'border-blue-500 bg-blue-500/20 text-blue-300' : 'border-white/10 text-gray-400 hover:border-white/20'}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          {form.type === 'EMAIL' && (
            <div>
              <label className="text-xs text-gray-400 block mb-1">Mavzu *</label>
              <input value={form.subject} onChange={e => set('subject', e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
            </div>
          )}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs text-gray-400">Xabar *</label>
              {form.type === 'SMS' && (
                <span className={`text-xs ${form.body.length > 160 ? 'text-red-400' : 'text-gray-500'}`}>
                  {form.body.length}/160
                </span>
              )}
            </div>
            <textarea value={form.body} onChange={e => set('body', e.target.value)} rows={4}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 resize-none" />
          </div>

          <div className="bg-white/5 rounded-xl p-4 space-y-3">
            <h4 className="text-xs text-gray-400 uppercase tracking-wide flex items-center gap-2">
              <Users className="w-3.5 h-3.5" /> Maqsadli auditoriya
            </h4>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={!!form.targetFilter.hasPhone}
                onChange={e => set('targetFilter', { ...form.targetFilter, hasPhone: e.target.checked || undefined })}
                className="accent-blue-500" />
              <span className="text-sm text-gray-300">Telefon raqami borlar</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={!!form.targetFilter.hasEmail}
                onChange={e => set('targetFilter', { ...form.targetFilter, hasEmail: e.target.checked || undefined })}
                className="accent-blue-500" />
              <span className="text-sm text-gray-300">Email borlar</span>
            </label>
            <div className="flex items-center gap-2">
              <button onClick={() => previewMut.mutate()} disabled={previewMut.isPending}
                className="text-xs text-blue-400 hover:text-blue-300 underline">
                Oldindan ko'rish
              </button>
              {preview !== null && (
                <span className="text-xs text-gray-300">— <strong>{preview}</strong> ta kontakt</span>
              )}
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1">Rejalashtirilgan vaqt (ixtiyoriy)</label>
            <input type="datetime-local" value={form.scheduledAt} onChange={e => set('scheduledAt', e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
          </div>
        </div>
        <div className="p-5 border-t border-white/10 flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Bekor</button>
          <button onClick={() => createMut.mutate(form)} disabled={createMut.isPending || !form.name || !form.body}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm rounded-lg">
            Saqlash
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────
export default function CampaignsPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => api.get('/campaigns').then(r => r.data),
  })

  const sendMut = useMutation({
    mutationFn: (id: string) => api.post(`/campaigns/${id}/send`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['campaigns'] }); toast.success('Kampaniya yuborildi') },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Xatolik'),
  })
  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/campaigns/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['campaigns'] }); toast.success("O'chirildi") },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Xatolik'),
  })

  const campaigns = Array.isArray(data) ? data : (data?.campaigns ?? data?.data ?? [])

  return (
    <div className="p-6 space-y-5 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Kampaniyalar</h1>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg">
          <Plus className="w-4 h-4" /> Yangi kampaniya
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />)}
        </div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-16 text-gray-500">Kampaniyalar yo'q</div>
      ) : (
        <div className="space-y-2">
          {campaigns.map((c: any) => {
            const typeCfg  = TYPE_CFG[c.type]   ?? { label: c.type,   color: 'bg-gray-500/20 text-gray-300', icon: null }
            const statusCfg = STATUS_CFG[c.status] ?? { label: c.status, color: 'bg-gray-500/20 text-gray-300' }
            return (
              <div key={c.id} className="bg-[#0D1628] border border-white/10 rounded-xl p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="text-white font-medium">{c.name}</p>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${typeCfg.color}`}>
                      {typeCfg.icon} {typeCfg.label}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${statusCfg.color}`}>
                      {statusCfg.label}
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm truncate max-w-md">{c.body}</p>
                  {(c.totalSent > 0 || c.totalFailed > 0) && (
                    <p className="text-xs text-gray-500 mt-1">
                      Yuborildi: <span className="text-green-400">{c.totalSent}</span>
                      {c.totalFailed > 0 && <> · Xato: <span className="text-red-400">{c.totalFailed}</span></>}
                    </p>
                  )}
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button onClick={() => navigate(`/campaigns/${c.id}`)}
                    className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg">
                    <Eye className="w-4 h-4" />
                  </button>
                  {c.status === 'DRAFT' && (
                    <>
                      <button onClick={() => sendMut.mutate(c.id)} disabled={sendMut.isPending}
                        className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg">
                        <Send className="w-4 h-4" />
                      </button>
                      <button onClick={() => { if (confirm('O\'chirishni tasdiqlaysizmi?')) deleteMut.mutate(c.id) }}
                        className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showForm && <CampaignFormModal onClose={() => setShowForm(false)} />}
    </div>
  )
}
