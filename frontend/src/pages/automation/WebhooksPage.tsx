import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Copy, CheckCircle, Webhook, Link } from 'lucide-react'
import { toast } from 'react-hot-toast'
import api from '@/config/api'

const BASE_URL = import.meta.env.VITE_API_URL?.replace('/api', '') ?? 'https://api.bizznerp.uz'

const inputCls = [
  'w-full bg-[var(--color-bg-elevated)]',
  'border border-[var(--color-border-primary)]',
  'rounded-lg px-3 py-2 text-sm',
  'text-[var(--color-text-primary)]',
  'placeholder:text-[var(--color-text-muted)]',
  'focus:outline-none focus:border-[var(--color-accent-primary)]',
  'transition-colors',
].join(' ')

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button
      onClick={copy}
      className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors p-1 rounded focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]/30"
      title="Nusxa olish"
    >
      {copied
        ? <CheckCircle size={14} className="text-[var(--color-success)]" />
        : <Copy size={14} />
      }
    </button>
  )
}

function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName]   = useState('')
  const [desc, setDesc]   = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = 'Nom kiritilishi shart'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const mut = useMutation({
    mutationFn: (dto: any) => api.post('/automation/webhooks', dto).then(r => r.data),
    onSuccess: () => { toast.success('Webhook yaratildi!'); onCreated() },
    onError:   (e: any) => toast.error(e?.response?.data?.message ?? 'Xatolik'),
  })

  const handleSubmit = () => { if (validate()) mut.mutate({ name: name.trim(), description: desc.trim() || undefined }) }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] rounded-2xl w-full max-w-md flex flex-col max-h-[90vh] shadow-2xl">
        {/* Header */}
        <div className="p-5 border-b border-[var(--color-border-primary)] shrink-0">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">Yangi webhook yaratish</h2>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 min-h-0">
          <div>
            <label className="text-xs text-[var(--color-text-secondary)] mb-1 block">
              Nom <span className="text-[var(--color-danger)]">*</span>
            </label>
            <input
              value={name}
              onChange={e => { setName(e.target.value); if (errors.name) setErrors({}) }}
              placeholder="Shopify buyurtma webhook"
              className={`${inputCls} ${errors.name ? 'border-[var(--color-danger)]' : ''}`}
            />
            {errors.name && <p className="text-xs text-[var(--color-danger)] mt-1">{errors.name}</p>}
          </div>
          <div>
            <label className="text-xs text-[var(--color-text-secondary)] mb-1 block">Tavsif</label>
            <input
              value={desc}
              onChange={e => setDesc(e.target.value)}
              placeholder="Qisqacha tavsif..."
              className={inputCls}
            />
          </div>
          <div className="bg-[var(--color-accent-primary)]/10 border border-[var(--color-accent-primary)]/20 rounded-lg p-3 text-xs text-[var(--color-accent-primary)]">
            Yaratilgandan so'ng unikal URL va secret kalit beriladi. Bu URL ni tashqi tizimga webhook sifatida qo'shing.
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-[var(--color-border-primary)] flex justify-end gap-2 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-[var(--color-text-secondary)] border border-[var(--color-border-primary)] rounded-lg hover:border-[var(--color-border-secondary)] transition-colors"
          >
            Bekor
          </button>
          <button
            onClick={handleSubmit}
            disabled={mut.isPending}
            className="px-4 py-2 text-sm text-white bg-[var(--color-accent-primary)] rounded-lg hover:opacity-90 disabled:opacity-50 font-medium transition-opacity focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]/30"
          >
            {mut.isPending ? 'Yaratilmoqda...' : 'Yaratish'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function WebhooksPage() {
  const qc = useQueryClient()
  const [creating, setCreating] = useState(false)

  const { data: webhooks = [], isLoading } = useQuery({
    queryKey: ['automation-webhooks'],
    queryFn:  () => api.get('/automation/webhooks').then(r => r.data),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/automation/webhooks/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['automation-webhooks'] }); toast.success('O\'chirildi') },
    onError:   () => toast.error('Xatolik'),
  })

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">Kiruvchi Webhooks</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
            Tashqi tizimlardan avtomatik trigger uchun URL endpoint yarating
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--color-accent-primary)] text-white text-sm rounded-lg hover:opacity-90 font-medium transition-opacity focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]/30"
        >
          <Plus size={16} /> Yangi webhook
        </button>
      </div>

      {/* Info banner */}
      <div className="bg-[var(--color-accent-primary)]/10 border border-[var(--color-accent-primary)]/20 rounded-xl p-4 flex gap-3">
        <Link size={18} className="text-[var(--color-accent-primary)] shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-[var(--color-text-primary)] mb-1">Qanday ishlaydi?</p>
          <p className="text-[var(--color-text-muted)] text-xs leading-relaxed">
            Har bir webhook unikal URL oladi. Ushbu URL ni Shopify, Telegram Bot, yoki boshqa tizimga webhook sifatida qo'shing.
            Webhook kelganda avtomatlashtirish qoidasi <strong className="text-[var(--color-accent-primary)]">WEBHOOK_INBOUND</strong> triggeri bilan ishga tushadi.
          </p>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 bg-[var(--color-bg-secondary)] rounded-xl animate-pulse" />
          ))}
        </div>
      ) : webhooks.length === 0 ? (
        <div className="text-center py-16 border border-[var(--color-border-primary)] border-dashed rounded-2xl bg-[var(--color-bg-secondary)]">
          <Webhook size={40} className="mx-auto mb-3 text-[var(--color-text-muted)] opacity-30" />
          <p className="text-[var(--color-text-primary)] font-medium">Hali webhook yaratilmagan</p>
          <p className="text-sm text-[var(--color-text-muted)] mt-1 mb-4">
            Tashqi tizimlardan event qabul qilish uchun webhook endpoint yarating
          </p>
          <button
            onClick={() => setCreating(true)}
            className="px-4 py-2 bg-[var(--color-accent-primary)] hover:opacity-90 text-white text-sm rounded-lg font-medium transition-opacity"
          >
            Birinchi webhookni yarating
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {webhooks.map((wh: any) => {
            const url = `${BASE_URL}/webhook/${wh.slug}`
            return (
              <div
                key={wh.id}
                className="bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] hover:border-[var(--color-border-secondary)] rounded-xl p-5 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="font-medium text-[var(--color-text-primary)] text-sm">{wh.name}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                        wh.isActive
                          ? 'bg-[var(--color-success)]/10 text-[var(--color-success)] border-[var(--color-success)]/20'
                          : 'bg-[var(--color-danger)]/10 text-[var(--color-danger)] border-[var(--color-danger)]/20'
                      }`}>
                        {wh.isActive ? 'Faol' : 'Nofaol'}
                      </span>
                      <span className="text-[10px] text-[var(--color-text-muted)]">
                        {wh._count?.logs ?? 0} ta so'rov
                      </span>
                    </div>
                    {wh.description && (
                      <p className="text-xs text-[var(--color-text-muted)] mb-3">{wh.description}</p>
                    )}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 bg-[var(--color-bg-elevated)] rounded-lg px-3 py-2">
                        <span className="text-xs text-[var(--color-text-muted)] shrink-0 font-medium">URL:</span>
                        <span className="text-xs text-[var(--color-accent-primary)] font-mono truncate flex-1">{url}</span>
                        <CopyBtn text={url} />
                      </div>
                      {wh.secret && (
                        <div className="flex items-center gap-2 bg-[var(--color-bg-elevated)] rounded-lg px-3 py-2">
                          <span className="text-xs text-[var(--color-text-muted)] shrink-0 font-medium">Secret:</span>
                          <span className="text-xs text-[var(--color-text-secondary)] font-mono truncate flex-1">
                            {wh.secret.slice(0, 8)}••••••••{wh.secret.slice(-4)}
                          </span>
                          <CopyBtn text={wh.secret} />
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => { if (confirm('O\'chirishni tasdiqlaysizmi?')) deleteMut.mutate(wh.id) }}
                    className="text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-colors p-1.5 rounded-lg hover:bg-[var(--color-danger)]/10 shrink-0 focus:outline-none focus:ring-2 focus:ring-[var(--color-danger)]/30"
                    title="O'chirish"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {creating && (
        <CreateModal
          onClose={() => setCreating(false)}
          onCreated={() => { setCreating(false); qc.invalidateQueries({ queryKey: ['automation-webhooks'] }) }}
        />
      )}
    </div>
  )
}
