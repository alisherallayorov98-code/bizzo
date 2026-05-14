import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Copy, CheckCircle, Webhook, Link } from 'lucide-react'
import { toast } from 'react-hot-toast'
import api from '@/config/api'

const BASE_URL = import.meta.env.VITE_API_URL?.replace('/api', '') ?? 'https://api.bizznerp.uz'

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button onClick={copy} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors">
      {copied ? <CheckCircle size={14} className="text-green-400" /> : <Copy size={14} />}
    </button>
  )
}

interface CreateModalProps {
  onClose: () => void
  onCreated: () => void
}

function CreateModal({ onClose, onCreated }: CreateModalProps) {
  const [name, setName]   = useState('')
  const [desc, setDesc]   = useState('')

  const mut = useMutation({
    mutationFn: (dto: any) => api.post('/automation/webhooks', dto).then(r => r.data),
    onSuccess: () => { toast.success('Webhook yaratildi!'); onCreated() },
    onError:   (e: any) => toast.error(e?.response?.data?.message ?? 'Xatolik'),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] rounded-xl w-full max-w-md p-6">
        <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-4">Yangi webhook yaratish</h2>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-[var(--color-text-secondary)] mb-1 block">Nom *</label>
            <input
              value={name} onChange={e => setName(e.target.value)}
              placeholder="Shopify buyurtma webhook"
              className="w-full bg-[var(--color-bg-elevated)] border border-[var(--color-border-primary)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent-primary)]"
            />
          </div>
          <div>
            <label className="text-xs text-[var(--color-text-secondary)] mb-1 block">Tavsif</label>
            <input
              value={desc} onChange={e => setDesc(e.target.value)}
              placeholder="Qisqacha tavsif..."
              className="w-full bg-[var(--color-bg-elevated)] border border-[var(--color-border-primary)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent-primary)]"
            />
          </div>
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-xs text-blue-400">
            Yaratilgandan so'ng unikal URL va secret kalit beriladi. Bu URL ni tashqi tizimga webhook sifatida qo'shing.
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose}
            className="px-4 py-2 text-sm text-[var(--color-text-secondary)] border border-[var(--color-border-primary)] rounded-lg hover:border-[var(--color-border-secondary)]">
            Bekor
          </button>
          <button
            onClick={() => mut.mutate({ name: name.trim(), description: desc.trim() || undefined })}
            disabled={!name.trim() || mut.isPending}
            className="px-4 py-2 text-sm text-white bg-[var(--color-accent-primary)] rounded-lg hover:opacity-90 disabled:opacity-50">
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">Kiruvchi Webhooks</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            Tashqi tizimlardan avtomatik trigger uchun URL endpoint yarating
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--color-accent-primary)] text-white text-sm rounded-lg hover:opacity-90">
          <Plus size={16} /> Yangi webhook
        </button>
      </div>

      {/* Info */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex gap-3">
        <Link size={18} className="text-blue-400 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-300">
          <p className="font-medium mb-1">Qanday ishlaydi?</p>
          <p className="text-blue-400/80">
            Har bir webhook unikal URL oladi. Ushbu URL ni Shopify, Telegram Bot, yoki boshqa tizimga webhook sifatida qo'shing.
            Webhook kelganda avtomatlashtirish qoidasi <strong>WEBHOOK_INBOUND</strong> triggeri bilan ishga tushadi.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 bg-[var(--color-bg-secondary)] rounded-xl animate-pulse" />
          ))}
        </div>
      ) : webhooks.length === 0 ? (
        <div className="text-center py-16 text-[var(--color-text-muted)]">
          <Webhook size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Hali webhook yaratilmagan</p>
          <button onClick={() => setCreating(true)}
            className="mt-3 text-[var(--color-accent-primary)] text-sm hover:underline">
            Birinchi webhookni yarating →
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {webhooks.map((wh: any) => {
            const url = `${BASE_URL}/webhook/${wh.slug}`
            return (
              <div key={wh.id}
                className="bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] rounded-xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-[var(--color-text-primary)] text-sm">{wh.name}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                        wh.isActive
                          ? 'bg-green-500/10 text-green-400 border-green-500/20'
                          : 'bg-red-500/10 text-red-400 border-red-500/20'
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
                        <span className="text-xs text-[var(--color-text-muted)] shrink-0">URL:</span>
                        <span className="text-xs text-[var(--color-accent-primary)] font-mono truncate flex-1">{url}</span>
                        <CopyBtn text={url} />
                      </div>
                      {wh.secret && (
                        <div className="flex items-center gap-2 bg-[var(--color-bg-elevated)] rounded-lg px-3 py-2">
                          <span className="text-xs text-[var(--color-text-muted)] shrink-0">Secret:</span>
                          <span className="text-xs text-[var(--color-text-secondary)] font-mono truncate flex-1">
                            {wh.secret.slice(0, 8)}••••••••{wh.secret.slice(-4)}
                          </span>
                          <CopyBtn text={wh.secret} />
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteMut.mutate(wh.id)}
                    className="text-[var(--color-text-muted)] hover:text-red-400 transition-colors p-1 shrink-0">
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
