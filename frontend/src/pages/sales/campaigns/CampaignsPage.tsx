import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Send, Trash2, Eye, MessageSquare, Mail, Users, Megaphone } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import api from '@/config/api'

const TYPE_CFG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  SMS:   { label: 'SMS',   color: 'bg-[var(--color-accent-primary)]/10 text-[var(--color-accent-primary)] border-[var(--color-accent-primary)]/20',   icon: <MessageSquare className="w-3.5 h-3.5" /> },
  EMAIL: { label: 'Email', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20', icon: <Mail className="w-3.5 h-3.5" /> },
}
const STATUS_CFG: Record<string, { label: string; color: string }> = {
  DRAFT:     { label: 'Qoralama',     color: 'bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)] border-[var(--color-border-primary)]' },
  SENDING:   { label: 'Yuborilmoqda', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
  COMPLETED: { label: 'Tugadi',       color: 'bg-[var(--color-success)]/10 text-[var(--color-success)] border-[var(--color-success)]/20' },
  FAILED:    { label: 'Xatolik',      color: 'bg-[var(--color-danger)]/10 text-[var(--color-danger)] border-[var(--color-danger)]/20' },
}

interface FormData {
  name: string; type: string; subject: string; body: string
  targetFilter: { hasPhone?: boolean; hasEmail?: boolean }
  scheduledAt: string
}
const EMPTY: FormData = { name: '', type: 'SMS', subject: '', body: '', targetFilter: {}, scheduledAt: '' }

const inputCls = [
  'w-full bg-[var(--color-bg-elevated)]',
  'border border-[var(--color-border-primary)]',
  'rounded-lg px-3 py-2 text-sm',
  'text-[var(--color-text-primary)]',
  'placeholder:text-[var(--color-text-muted)]',
  'focus:outline-none focus:border-[var(--color-accent-primary)]',
  'transition-colors',
].join(' ')

function CampaignFormModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm]       = useState<FormData>(EMPTY)
  const [preview, setPreview] = useState<number | null>(null)
  const [errors, setErrors]   = useState<Record<string, string>>({})

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.name.trim())  e.name = 'Nom kiritilishi shart'
    if (!form.body.trim())  e.body = 'Xabar matni kiritilishi shart'
    if (form.type === 'EMAIL' && !form.subject.trim()) e.subject = 'Mavzu kiritilishi shart'
    if (form.type === 'SMS' && form.body.length > 160) e.body = 'SMS 160 belgidan oshmasligi kerak'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const createMut = useMutation({
    mutationFn: (data: FormData) => api.post('/campaigns', data).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['campaigns'] }); toast.success('Kampaniya yaratildi'); onClose() },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Xatolik'),
  })

  const previewMut = useMutation({
    mutationFn: () => api.post('/campaigns/preview-count', { targetFilter: form.targetFilter }).then(r => r.data),
    onSuccess: (d: any) => setPreview(d.count),
  })

  const set = (k: keyof FormData, v: any) => {
    setForm(p => ({ ...p, [k]: v }))
    if (errors[k]) setErrors(p => { const n = { ...p }; delete n[k]; return n })
  }

  const handleSubmit = () => { if (validate()) createMut.mutate(form) }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] rounded-2xl w-full max-w-lg flex flex-col max-h-[90vh] shadow-2xl">
        {/* Header */}
        <div className="p-5 border-b border-[var(--color-border-primary)] shrink-0">
          <h2 className="text-[var(--color-text-primary)] font-semibold text-lg">Yangi kampaniya</h2>
        </div>

        {/* Body — scrollable */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 min-h-0">
          {/* Nom */}
          <div>
            <label className="text-xs text-[var(--color-text-secondary)] block mb-1">
              Nomi <span className="text-[var(--color-danger)]">*</span>
            </label>
            <input
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="Yozgi chegirma kampaniyasi"
              className={`${inputCls} ${errors.name ? 'border-[var(--color-danger)]' : ''}`}
            />
            {errors.name && <p className="text-xs text-[var(--color-danger)] mt-1">{errors.name}</p>}
          </div>

          {/* Tur */}
          <div>
            <label className="text-xs text-[var(--color-text-secondary)] block mb-1">Tur</label>
            <div className="flex gap-2">
              {['SMS', 'EMAIL'].map(t => (
                <button
                  key={t}
                  onClick={() => set('type', t)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]/30 ${
                    form.type === t
                      ? 'border-[var(--color-accent-primary)] bg-[var(--color-accent-primary)]/10 text-[var(--color-accent-primary)]'
                      : 'border-[var(--color-border-primary)] text-[var(--color-text-muted)] hover:border-[var(--color-border-secondary)]'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Email mavzu */}
          {form.type === 'EMAIL' && (
            <div>
              <label className="text-xs text-[var(--color-text-secondary)] block mb-1">
                Mavzu <span className="text-[var(--color-danger)]">*</span>
              </label>
              <input
                value={form.subject}
                onChange={e => set('subject', e.target.value)}
                placeholder="Sizga maxsus taklif!"
                className={`${inputCls} ${errors.subject ? 'border-[var(--color-danger)]' : ''}`}
              />
              {errors.subject && <p className="text-xs text-[var(--color-danger)] mt-1">{errors.subject}</p>}
            </div>
          )}

          {/* Xabar matni */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs text-[var(--color-text-secondary)]">
                Xabar <span className="text-[var(--color-danger)]">*</span>
              </label>
              {form.type === 'SMS' && (
                <span className={`text-xs font-medium ${form.body.length > 160 ? 'text-[var(--color-danger)]' : 'text-[var(--color-text-muted)]'}`}>
                  {form.body.length}/160
                </span>
              )}
            </div>
            <textarea
              value={form.body}
              onChange={e => set('body', e.target.value)}
              rows={4}
              placeholder="Xabar matnini kiriting..."
              className={`${inputCls} resize-none ${errors.body ? 'border-[var(--color-danger)]' : ''}`}
            />
            {errors.body && <p className="text-xs text-[var(--color-danger)] mt-1">{errors.body}</p>}
          </div>

          {/* Auditoriya */}
          <div className="bg-[var(--color-bg-elevated)] rounded-xl p-4 space-y-3">
            <h4 className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide flex items-center gap-2">
              <Users className="w-3.5 h-3.5" /> Maqsadli auditoriya
            </h4>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={!!form.targetFilter.hasPhone}
                onChange={e => set('targetFilter', { ...form.targetFilter, hasPhone: e.target.checked || undefined })}
                className="accent-[var(--color-accent-primary)] w-4 h-4"
              />
              <span className="text-sm text-[var(--color-text-secondary)]">Telefon raqami borlar</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={!!form.targetFilter.hasEmail}
                onChange={e => set('targetFilter', { ...form.targetFilter, hasEmail: e.target.checked || undefined })}
                className="accent-[var(--color-accent-primary)] w-4 h-4"
              />
              <span className="text-sm text-[var(--color-text-secondary)]">Email borlar</span>
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => previewMut.mutate()}
                disabled={previewMut.isPending}
                className="text-xs text-[var(--color-accent-primary)] hover:underline disabled:opacity-50"
              >
                {previewMut.isPending ? 'Hisoblanmoqda...' : 'Oldindan ko\'rish'}
              </button>
              {preview !== null && (
                <span className="text-xs text-[var(--color-text-secondary)]">
                  — <strong>{preview}</strong> ta kontakt
                </span>
              )}
            </div>
          </div>

          {/* Vaqt */}
          <div>
            <label className="text-xs text-[var(--color-text-secondary)] block mb-1">Rejalashtirilgan vaqt (ixtiyoriy)</label>
            <input
              type="datetime-local"
              value={form.scheduledAt}
              onChange={e => set('scheduledAt', e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        {/* Footer — always visible */}
        <div className="p-5 border-t border-[var(--color-border-primary)] flex gap-2 justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-[var(--color-text-secondary)] border border-[var(--color-border-primary)] rounded-lg hover:border-[var(--color-border-secondary)] transition-colors"
          >
            Bekor
          </button>
          <button
            onClick={handleSubmit}
            disabled={createMut.isPending}
            className="px-4 py-2 bg-[var(--color-accent-primary)] hover:opacity-90 disabled:opacity-50 text-white text-sm rounded-lg font-medium transition-opacity"
          >
            {createMut.isPending ? 'Saqlanmoqda...' : 'Saqlash'}
          </button>
        </div>
      </div>
    </div>
  )
}

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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Kampaniyalar</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-0.5">SMS va Email marketing kampaniyalari</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-[var(--color-accent-primary)] hover:opacity-90 text-white text-sm rounded-lg font-medium transition-opacity focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]/30"
        >
          <Plus className="w-4 h-4" /> Yangi kampaniya
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-[var(--color-bg-secondary)] rounded-xl animate-pulse" />
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-16 border border-[var(--color-border-primary)] border-dashed rounded-2xl bg-[var(--color-bg-secondary)]">
          <Megaphone className="w-10 h-10 mx-auto mb-3 text-[var(--color-text-muted)] opacity-40" />
          <p className="text-[var(--color-text-primary)] font-medium">Kampaniyalar yo'q</p>
          <p className="text-sm text-[var(--color-text-muted)] mt-1 mb-4">SMS yoki Email orqali mijozlaringizga xabar yuboring</p>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-[var(--color-accent-primary)] hover:opacity-90 text-white text-sm rounded-lg font-medium transition-opacity"
          >
            Birinchi kampaniyani yarating
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {campaigns.map((c: any) => {
            const typeCfg   = TYPE_CFG[c.type]    ?? { label: c.type,   color: 'bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)] border-[var(--color-border-primary)]', icon: null }
            const statusCfg = STATUS_CFG[c.status] ?? { label: c.status, color: 'bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)] border-[var(--color-border-primary)]' }
            return (
              <div
                key={c.id}
                className="bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] hover:border-[var(--color-border-secondary)] rounded-xl p-4 flex items-center gap-4 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="text-[var(--color-text-primary)] font-medium">{c.name}</p>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${typeCfg.color}`}>
                      {typeCfg.icon} {typeCfg.label}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs border ${statusCfg.color}`}>
                      {statusCfg.label}
                    </span>
                  </div>
                  <p className="text-[var(--color-text-muted)] text-sm truncate max-w-md">{c.body}</p>
                  {(c.totalSent > 0 || c.totalFailed > 0) && (
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">
                      Yuborildi: <span className="text-[var(--color-success)]">{c.totalSent}</span>
                      {c.totalFailed > 0 && <> · Xato: <span className="text-[var(--color-danger)]">{c.totalFailed}</span></>}
                    </p>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => navigate(`/campaigns/${c.id}`)}
                    className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-elevated)] rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]/30"
                    title="Ko'rish"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  {c.status === 'DRAFT' && (
                    <>
                      <button
                        onClick={() => sendMut.mutate(c.id)}
                        disabled={sendMut.isPending}
                        className="p-2 text-[var(--color-accent-primary)] hover:bg-[var(--color-accent-primary)]/10 rounded-lg transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]/30"
                        title="Yuborish"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => { if (confirm('O\'chirishni tasdiqlaysizmi?')) deleteMut.mutate(c.id) }}
                        className="p-2 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-danger)]/30"
                        title="O'chirish"
                      >
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
