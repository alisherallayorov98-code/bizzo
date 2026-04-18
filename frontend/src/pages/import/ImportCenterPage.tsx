import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as XLSX from 'xlsx'
import {
  Upload, Download, CheckCircle2, AlertTriangle, XCircle,
  Users, Package, DollarSign, Warehouse, UserCheck, BarChart2,
  RefreshCw, History, ArrowRight, ChevronDown, ChevronUp,
  FileSpreadsheet, Trash2, Eye, RotateCcw,
} from 'lucide-react'
import { cn }            from '@utils/cn'
import { PageHeader }    from '@components/layout/PageHeader/PageHeader'
import { Card }          from '@components/ui/Card/Card'
import { Button }        from '@components/ui/Button/Button'
import { Badge }         from '@components/ui/Badge/Badge'
import { Modal }         from '@components/ui/Modal/Modal'
import { importService, ImportEntity, MigrationSession } from '@services/import.service'
import toast from 'react-hot-toast'

// ── Konstantlar ──────────────────────────────────────────────
const ENTITIES: {
  key: ImportEntity; label: string; icon: any; color: string; desc: string
}[] = [
  { key: 'contact',  label: 'Kontragentlar', icon: Users,      color: '#3B82F6', desc: 'Mijozlar va yetkazuvchilar + ochilish qarzlari' },
  { key: 'product',  label: 'Mahsulotlar',   icon: Package,    color: '#10B981', desc: 'Katalog + boshlang\'ich ombor qoldiqlari' },
  { key: 'debt',     label: 'Qarzlar',       icon: DollarSign, color: '#F59E0B', desc: 'Debitor/kreditor qarzlar tarixi' },
  { key: 'stock',    label: 'Ombor qoldig\'i', icon: Warehouse, color: '#8B5CF6', desc: 'Mahsulotlar bo\'yicha joriy qoldiqlar' },
  { key: 'employee', label: 'Xodimlar',      icon: UserCheck,  color: '#EC4899', desc: 'Xodimlar ro\'yxati va maosh ma\'lumotlari' },
  { key: 'deal',     label: 'Bitimlar',      icon: BarChart2,  color: '#F97316', desc: 'Savdo tarixi va eski bitimlar' },
]

const DUP_STRATEGIES = [
  { value: 'skip',   label: 'O\'tkazib yuborish', desc: 'Takrorlar qo\'shilmaydi' },
  { value: 'update', label: 'Yangilash',           desc: 'Mavjud yozuvlar yangilanadi' },
  { value: 'merge',  label: 'Birlashtirish',       desc: 'Eng to\'liq ma\'lumot saqlanadi' },
]

// ── Import Wizard ─────────────────────────────────────────────
type WizardStep = 'select' | 'upload' | 'map' | 'preview' | 'import' | 'done'

function ImportWizard({
  entity, sessionId, onClose, onDone,
}: {
  entity: ImportEntity; sessionId: string; onClose: () => void; onDone: (result: any) => void
}) {
  const [step,        setStep]        = useState<WizardStep>('upload')
  const [rawRows,     setRawRows]     = useState<any[]>([])
  const [headers,     setHeaders]     = useState<string[]>([])
  const [mapping,     setMapping]     = useState<Record<string, string>>({})
  const [preview,     setPreview]     = useState<any>(null)
  const [dupStrategy, setDupStrategy] = useState<'skip' | 'update' | 'merge'>('skip')
  const [result,      setResult]      = useState<any>(null)
  const [loading,     setLoading]     = useState(false)

  const entityInfo = ENTITIES.find(e => e.key === entity)!

  const { data: template } = useQuery({
    queryKey: ['import-template', entity],
    queryFn:  () => importService.getTemplate(entity),
  })

  // Excel/CSV fayl o'qish
  const handleFile = useCallback(async (file: File) => {
    setLoading(true)
    try {
      const buf  = await file.arrayBuffer()
      const wb   = XLSX.read(buf, { type: 'array' })
      const ws   = wb.Sheets[wb.SheetNames[0]]
      const json = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as any[][]

      if (json.length < 2) { toast.error('Fayl bo\'sh yoki faqat sarlavha bor'); return }

      const hdrs = json[0].map(String)
      const rows = json.slice(1).filter(r => r.some(c => c !== '')).map(r => {
        const obj: any = {}
        hdrs.forEach((h, i) => { obj[h] = r[i] ?? '' })
        return obj
      })

      setHeaders(hdrs)
      setRawRows(rows)

      // Aqlli ustun aniqlash
      const detected = await importService.detectColumns(hdrs)
      setMapping(detected.mapping)
      setStep('map')
    } catch (e: any) {
      toast.error('Faylni o\'qishda xatolik: ' + e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const handlePreview = async () => {
    setLoading(true)
    try {
      const mapped = rawRows.map(row => {
        const res: any = {}
        for (const [src, tgt] of Object.entries(mapping)) {
          if (tgt && src in row) res[tgt] = row[src]
        }
        return res
      })
      const prev = await importService.preview(entity, rawRows, mapping)
      setPreview(prev)
      setStep('preview')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleImport = async () => {
    setLoading(true)
    try {
      const mapped = rawRows.map(row => {
        const res: any = {}
        for (const [src, tgt] of Object.entries(mapping)) {
          if (tgt && src in row) res[tgt] = row[src]
        }
        return res
      })

      let res: any
      if      (entity === 'contact')  res = await importService.importContacts(sessionId, mapped, dupStrategy)
      else if (entity === 'product')  res = await importService.importProducts(sessionId, mapped, dupStrategy)
      else if (entity === 'debt')     res = await importService.importDebts(sessionId, mapped)
      else if (entity === 'stock')    res = await importService.importStock(sessionId, mapped)
      else if (entity === 'employee') res = await importService.importEmployees(sessionId, mapped)
      else if (entity === 'deal')     res = await importService.importDeals(sessionId, mapped)

      setResult(res)
      setStep('done')
      onDone(res)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  const downloadTemplate = () => {
    if (!template) return
    const wb = XLSX.utils.book_new()
    // Sarlavha + misol + hint qatorlari
    const data = [
      template.headers,
      ...template.example.map(ex => template.headers.map(h => ex[h] ?? '')),
    ]
    const ws = XLSX.utils.aoa_to_sheet(data)
    // Ustun kengligi
    ws['!cols'] = template.headers.map(h => ({ wch: Math.max(h.length + 4, 16) }))
    XLSX.utils.book_append_sheet(wb, ws, entity)

    // Hint varag'i
    if (Object.keys(template.hints).length > 0) {
      const hintData = [['Maydon', 'Izoh'], ...Object.entries(template.hints)]
      const hintWs = XLSX.utils.aoa_to_sheet(hintData)
      XLSX.utils.book_append_sheet(wb, hintWs, 'Izohlar')
    }

    XLSX.writeFile(wb, `bizzo-shablon-${entity}.xlsx`)
  }

  const allTargetFields = template?.headers.map(h => {
    const matched = Object.entries(mapping).find(([, v]) => v && template.headers.some((th, i) => i.toString() === v))
    return h
  }) ?? []

  const FIELD_LABELS: Record<string, string> = {
    name: 'Ism/Nomi', type: 'Turi', phone: 'Telefon', email: 'Email',
    stir: 'STIR', address: 'Manzil', region: 'Viloyat', notes: 'Izoh',
    openingDebtAmount: "Ochilish qarzi", openingDebtType: 'Qarz turi',
    code: 'Kodi', barcode: 'Barcode', category: 'Kategoriya', unit: 'Birlik',
    buyPrice: 'Xarid narxi', sellPrice: 'Sotish narxi', minStock: 'Min. qoldiq',
    openingStock: "Boshlang'ich qoldiq", openingAvgPrice: "O'rtacha narx",
    contactName: 'Kontragent', amount: 'Summa', paidAmount: "To'langan",
    currency: 'Valyuta', dueDate: 'Muddat', remainAmount: 'Qoldiq',
    productName: 'Mahsulot', quantity: 'Miqdor', avgPrice: "O'rtacha narx",
    firstName: 'Ism', lastName: 'Familiya', position: 'Lavozim',
    department: "Bo'lim", hireDate: 'Qabul sanasi', baseSalary: 'Maosh',
    title: 'Sarlavha', stage: 'Bosqich', closedAt: 'Yopilgan sana',
  }

  const possibleTargets = Object.keys(FIELD_LABELS)

  return (
    <div className="space-y-4">
      {/* Steps indicator */}
      <div className="flex items-center gap-2 text-xs text-text-muted mb-2">
        {(['upload','map','preview','import','done'] as WizardStep[]).map((s, i, arr) => (
          <div key={s} className="flex items-center gap-2">
            <div className={cn(
              'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold',
              step === s ? 'bg-accent-primary text-white'
              : (['upload','map','preview','import'].indexOf(step) > i ? 'bg-success text-white' : 'bg-bg-tertiary text-text-muted'),
            )}>
              {['upload','map','preview','import'].indexOf(step) > i ? <CheckCircle2 size={12} /> : i + 1}
            </div>
            <span className={step === s ? 'text-text-primary font-medium' : ''}>
              {['Fayl','Ustunlar','Ko\'rib chiqish','Import','Tayyor'][i]}
            </span>
            {i < arr.length - 1 && <ArrowRight size={10} className="text-text-muted" />}
          </div>
        ))}
      </div>

      {/* STEP: UPLOAD */}
      {step === 'upload' && (
        <div className="space-y-4">
          <div
            className="border-2 border-dashed border-border-primary rounded-xl p-8 text-center hover:border-accent-primary/50 transition-colors"
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
          >
            <Upload size={32} className="mx-auto mb-3 text-text-muted" />
            <p className="text-sm font-medium text-text-primary mb-1">Excel yoki CSV faylni shu yerga tashlang</p>
            <p className="text-xs text-text-muted mb-4">Ixtiyoriy format — tizim avtomatik moslashtiradi</p>
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
              />
              <Button variant="secondary" size="sm" loading={loading}>
                Fayl tanlash
              </Button>
            </label>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-bg-tertiary border border-border-primary">
            <FileSpreadsheet size={16} className="text-success shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-medium text-text-primary">Tayyor shablon kerakmi?</p>
              <p className="text-xs text-text-muted">To'g'ri formatdagi misol faylni yuklab oling</p>
            </div>
            <Button variant="secondary" size="xs" leftIcon={<Download size={12} />} onClick={downloadTemplate}>
              Shablon
            </Button>
          </div>
        </div>
      )}

      {/* STEP: COLUMN MAPPING */}
      {step === 'map' && (
        <div className="space-y-3">
          <p className="text-sm text-text-muted">
            Tizim <strong className="text-text-primary">{rawRows.length}</strong> ta qator topdi.
            Ustunlarni maqsadli maydonlarga moslashtiring:
          </p>
          <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
            {headers.map(header => (
              <div key={header} className="flex items-center gap-3">
                <div className="w-36 shrink-0 text-sm font-medium text-text-primary truncate" title={header}>
                  {header}
                </div>
                <ArrowRight size={14} className="text-text-muted shrink-0" />
                <select
                  value={mapping[header] || ''}
                  onChange={e => setMapping(m => ({ ...m, [header]: e.target.value }))}
                  className="flex-1 bg-bg-elevated border border-border-primary rounded-lg px-3 py-1.5 text-sm text-text-primary focus:border-accent-primary outline-none"
                >
                  <option value="">-- O'tkazib yuborish --</option>
                  {possibleTargets.map(t => (
                    <option key={t} value={t}>{FIELD_LABELS[t]}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {(entity === 'contact' || entity === 'product') && (
            <div>
              <p className="text-xs font-semibold text-text-secondary mb-2 uppercase tracking-wider">Takrorlar uchun strategiya</p>
              <div className="flex gap-2">
                {DUP_STRATEGIES.map(s => (
                  <button
                    key={s.value}
                    onClick={() => setDupStrategy(s.value as any)}
                    className={cn(
                      'flex-1 py-2 px-3 rounded-lg border text-xs font-medium transition-all',
                      dupStrategy === s.value
                        ? 'border-accent-primary bg-accent-primary/10 text-accent-primary'
                        : 'border-border-primary text-text-secondary hover:border-border-secondary',
                    )}
                  >
                    <div>{s.label}</div>
                    <div className="text-[10px] text-text-muted mt-0.5 font-normal">{s.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button variant="secondary" size="sm" onClick={() => setStep('upload')}>Orqaga</Button>
            <Button variant="primary" size="sm" onClick={handlePreview} loading={loading} fullWidth>
              Ko'rib chiqish ({rawRows.length} qator)
            </Button>
          </div>
        </div>
      )}

      {/* STEP: PREVIEW */}
      {step === 'preview' && preview && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-1.5 rounded-full bg-bg-tertiary overflow-hidden">
              <div className="h-full bg-success rounded-full" style={{ width: `${Math.round((preview.preview.filter((r: any) => r.issues.length === 0).length / preview.preview.length) * 100)}%` }} />
            </div>
            <span className="text-xs text-text-muted">
              {preview.preview.filter((r: any) => r.issues.length === 0).length}/{preview.preview.length} tayyor
            </span>
          </div>

          <div className="max-h-56 overflow-y-auto space-y-1.5">
            {preview.preview.slice(0, 20).map((row: any) => (
              <div key={row.index} className={cn(
                'flex items-start gap-3 p-2.5 rounded-lg text-xs border',
                row.issues.length > 0 ? 'border-warning/20 bg-warning/5'
                : row.duplicate ? 'border-info/20 bg-info/5'
                : 'border-border-primary bg-bg-tertiary',
              )}>
                <span className="w-6 text-center text-text-muted shrink-0">{row.index}</span>
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-text-primary">
                    {row.mapped?.name || row.mapped?.firstName || row.mapped?.contactName || row.mapped?.productName || '—'}
                  </span>
                  {row.issues.length > 0 && (
                    <div className="text-warning mt-0.5">{row.issues.join(', ')}</div>
                  )}
                  {row.duplicate && (
                    <div className="text-accent-primary mt-0.5">
                      Takror ({row.duplicate.matchedBy}, {row.duplicate.confidence}% aniqlik)
                    </div>
                  )}
                </div>
                {row.issues.length > 0 ? <AlertTriangle size={12} className="text-warning shrink-0 mt-0.5" />
                  : row.duplicate ? <RefreshCw size={12} className="text-accent-primary shrink-0 mt-0.5" />
                  : <CheckCircle2 size={12} className="text-success shrink-0 mt-0.5" />}
              </div>
            ))}
          </div>

          {preview.total > 20 && (
            <p className="text-xs text-text-muted text-center">
              ... va yana {preview.total - 20} ta qator
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <Button variant="secondary" size="sm" onClick={() => setStep('map')}>Orqaga</Button>
            <Button
              variant="primary" size="sm" fullWidth
              onClick={handleImport} loading={loading}
              leftIcon={<Upload size={14} />}
            >
              {preview.total} ta qatorni import qilish
            </Button>
          </div>
        </div>
      )}

      {/* STEP: DONE */}
      {step === 'done' && result && (
        <div className="space-y-4 py-2">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-success/10 border-2 border-success/30 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 size={32} className="text-success" />
            </div>
            <h3 className="font-display font-bold text-lg text-text-primary">Import tugadi!</h3>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Yangi qo'shildi", value: result.created, color: 'text-success' },
              { label: 'Yangilandi',       value: result.updated, color: 'text-accent-primary' },
              { label: "O'tkazildi",       value: result.skipped, color: 'text-text-muted' },
              { label: 'Xato',             value: result.errors,  color: 'text-danger' },
            ].map(s => (
              <div key={s.label} className="p-3 rounded-xl bg-bg-tertiary border border-border-primary text-center">
                <div className={cn('text-2xl font-bold', s.color)}>{s.value}</div>
                <div className="text-xs text-text-muted mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Reconciliation report */}
          <ReconciliationReport sessionId={sessionId} />

          <Button variant="primary" size="sm" fullWidth onClick={onClose}>
            Yopish
          </Button>
        </div>
      )}
    </div>
  )
}

// ── Reconciliation Report ─────────────────────────────────────
function ReconciliationReport({ sessionId }: { sessionId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['import-reconciliation', sessionId],
    queryFn:  () => importService.getReconciliation(sessionId),
    staleTime: 2 * 60 * 1000,
  })

  if (isLoading) return (
    <div className="flex items-center gap-2 py-4 text-xs text-text-muted">
      <RefreshCw size={12} className="animate-spin" /> Hisobot yuklanmoqda...
    </div>
  )
  if (!data) return null

  const ENTITY_LABELS: Record<string, string> = {
    contact: 'Kontragentlar', product: 'Mahsulotlar', debt: 'Qarzlar',
    stock: 'Ombor', employee: 'Xodimlar', deal: 'Bitimlar',
  }

  const score = data.summary.qualityScore as number
  const scoreColor = score >= 90 ? 'text-success' : score >= 70 ? 'text-warning' : 'text-danger'
  const scoreBg    = score >= 90 ? 'bg-success/10' : score >= 70 ? 'bg-warning/10' : 'bg-danger/10'

  return (
    <div className="space-y-4 pt-2">
      {/* Quality score */}
      <div className={cn('flex items-center gap-3 p-4 rounded-xl', scoreBg)}>
        <div className={cn('text-3xl font-black tabular-nums', scoreColor)}>{score}%</div>
        <div>
          <p className="text-sm font-semibold text-text-primary">Ma'lumot sifati</p>
          <p className="text-xs text-text-muted">
            {data.summary.totalImported} ta qo'shildi · {data.summary.totalSkipped} ta o'tkazildi · {data.summary.totalErrors} ta xato
          </p>
        </div>
      </div>

      {/* By entity breakdown */}
      {Object.keys(data.byEntity).length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Entity bo'yicha</p>
          {Object.entries(data.byEntity as Record<string, any>).map(([entity, stats]) => (
            <div key={entity} className="flex items-center gap-3 p-2.5 rounded-lg bg-bg-tertiary border border-border-primary">
              <div className="text-sm font-medium text-text-primary w-28 shrink-0">
                {ENTITY_LABELS[entity] ?? entity}
              </div>
              <div className="flex-1 flex items-center gap-3 text-xs">
                {stats.created > 0 && (
                  <span className="flex items-center gap-1 text-success">
                    <CheckCircle2 size={11} /> {stats.created} yangi
                  </span>
                )}
                {stats.updated > 0 && (
                  <span className="flex items-center gap-1 text-accent-primary">
                    <RefreshCw size={11} /> {stats.updated} yangilandi
                  </span>
                )}
                {stats.skipped > 0 && (
                  <span className="flex items-center gap-1 text-text-muted">
                    {stats.skipped} o'tkazildi
                  </span>
                )}
                {stats.errors > 0 && (
                  <span className="flex items-center gap-1 text-danger">
                    <XCircle size={11} /> {stats.errors} xato
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Issues */}
      {(data.issues as string[]).length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Muammolar</p>
          {(data.issues as string[]).map((issue, i) => (
            <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-warning/5 border border-warning/20">
              <AlertTriangle size={13} className="text-warning shrink-0 mt-0.5" />
              <p className="text-xs text-text-secondary">{issue}</p>
            </div>
          ))}
        </div>
      )}

      {(data.issues as string[]).length === 0 && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-success/5 border border-success/20">
          <CheckCircle2 size={14} className="text-success shrink-0" />
          <p className="text-xs text-text-secondary">Hech qanday muammo topilmadi. Import sifatli bajarildi!</p>
        </div>
      )}
    </div>
  )
}

// ── Session Card ──────────────────────────────────────────────
function SessionCard({ session, onRollback }: { session: MigrationSession; onRollback: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false)

  const statusColor = {
    DRAFT: 'default', IN_PROGRESS: 'primary', COMPLETED: 'success',
    FAILED: 'danger', ROLLED_BACK: 'warning',
  }[session.status] as any

  const pct = session.totalRows > 0
    ? Math.round((session.importedRows / session.totalRows) * 100)
    : 0

  return (
    <div className="border border-border-primary rounded-xl bg-bg-secondary overflow-hidden">
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-bg-tertiary transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <History size={16} className="text-text-muted shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary truncate">{session.name}</p>
          <p className="text-xs text-text-muted">
            {new Date(session.startedAt).toLocaleDateString('uz-UZ')} · {session.source}
          </p>
        </div>
        <Badge variant={statusColor} size="sm">{session.status}</Badge>
        {expanded ? <ChevronUp size={14} className="text-text-muted" /> : <ChevronDown size={14} className="text-text-muted" />}
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-border-primary pt-3 space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-bg-tertiary overflow-hidden">
              <div className="h-full bg-accent-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs text-text-muted">{pct}%</span>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center">
            {[
              { label: "Qo'shildi", value: session.importedRows, color: 'text-success' },
              { label: "O'tkazildi", value: session.skippedRows,  color: 'text-text-muted' },
              { label: 'Xato',      value: session.errorRows,     color: 'text-danger' },
              { label: 'Takror',    value: session.duplicatesFound, color: 'text-warning' },
            ].map(s => (
              <div key={s.label} className="p-2 rounded-lg bg-bg-tertiary">
                <div className={cn('text-lg font-bold', s.color)}>{s.value}</div>
                <div className="text-[10px] text-text-muted">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Sifat hisoboti */}
          <div className="border-t border-border-primary pt-3">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Sifat hisoboti</p>
            <ReconciliationReport sessionId={session.id} />
          </div>

          {session.status !== 'ROLLED_BACK' && (
            <button
              onClick={() => onRollback(session.id)}
              className="flex items-center gap-2 text-xs text-danger hover:text-danger/80 transition-colors"
            >
              <RotateCcw size={12} />
              Bu importni bekor qilish (rollback)
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── ASOSIY SAHIFA ─────────────────────────────────────────────
export default function ImportCenterPage() {
  const qc = useQueryClient()
  const [wizardEntity,    setWizardEntity]    = useState<ImportEntity | null>(null)
  const [wizardSessionId, setWizardSessionId] = useState<string | null>(null)
  const [sessionName,     setSessionName]     = useState('')
  const [newSessionModal, setNewSessionModal] = useState(false)
  const [creating,        setCreating]        = useState(false)

  const { data: sessions = [], refetch: refetchSessions } = useQuery({
    queryKey: ['import-sessions'],
    queryFn:  importService.getSessions,
  })

  const { data: progress } = useQuery({
    queryKey: ['import-progress'],
    queryFn:  importService.getProgress,
  })

  const handleNewSession = async () => {
    if (!sessionName.trim()) return
    setCreating(true)
    try {
      const session = await importService.createSession(sessionName)
      setWizardSessionId(session.id)
      setNewSessionModal(false)
      setSessionName('')
      refetchSessions()
      toast.success('Yangi import sessiyasi yaratildi')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setCreating(false)
    }
  }

  const handleRollback = async (sessionId: string) => {
    if (!confirm('Bu importni bekor qilasizmi? Import qilingan ma\'lumotlar o\'chiriladi.')) return
    try {
      const res = await importService.rollback(sessionId)
      toast.success(`${res.deleted} ta yozuv o'chirildi`)
      refetchSessions()
      qc.invalidateQueries({ queryKey: ['contacts'] })
      qc.invalidateQueries({ queryKey: ['products'] })
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  return (
    <div>
      <PageHeader
        title="Import Markazi"
        description="Boshqa tizimlardan ma'lumotlarni ko'chirish va tarix saqlash"
        breadcrumbs={[
          { label: 'Dashboard', path: '/dashboard' },
          { label: 'Import Markazi' },
        ]}
        actions={
          <Button
            variant="primary"
            leftIcon={<Upload size={16} />}
            onClick={() => setNewSessionModal(true)}
          >
            Yangi import
          </Button>
        }
      />

      {/* Progress overview */}
      {progress && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Kontragentlar', value: progress.entities.contacts,  color: '#3B82F6' },
            { label: 'Mahsulotlar',   value: progress.entities.products,  color: '#10B981' },
            { label: 'Qarzlar',       value: progress.entities.debts,     color: '#F59E0B' },
            { label: 'Xodimlar',      value: progress.entities.employees, color: '#EC4899' },
          ].map(item => (
            <Card key={item.label} padding="sm">
              <div className="text-2xl font-bold text-text-primary">{item.value}</div>
              <div className="text-xs text-text-muted mt-0.5">{item.label}</div>
              <div className="mt-2 h-0.5 rounded-full" style={{ backgroundColor: item.color + '40' }}>
                <div className="h-full rounded-full" style={{ backgroundColor: item.color, width: item.value > 0 ? '100%' : '0%' }} />
              </div>
            </Card>
          ))}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Entity cards */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider px-1">
            Nima import qilasiz?
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {ENTITIES.map(entity => (
              <button
                key={entity.key}
                onClick={() => {
                  if (!wizardSessionId) { setNewSessionModal(true); return }
                  setWizardEntity(entity.key)
                }}
                className={cn(
                  'p-4 rounded-xl border text-left transition-all hover:border-accent-primary/40 hover:shadow-md',
                  wizardEntity === entity.key
                    ? 'border-accent-primary bg-accent-primary/5'
                    : 'border-border-primary bg-bg-secondary',
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: entity.color + '20' }}
                  >
                    <entity.icon size={18} style={{ color: entity.color }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{entity.label}</p>
                    <p className="text-xs text-text-muted mt-0.5 leading-relaxed">{entity.desc}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {!wizardSessionId && (
            <div className="p-4 rounded-xl border border-dashed border-border-primary bg-bg-tertiary/50 text-center">
              <p className="text-sm text-text-muted">
                Import boshlash uchun avval <strong className="text-text-primary">"Yangi import"</strong> tugmasini bosing
              </p>
            </div>
          )}

          {wizardSessionId && (
            <div className="p-3 rounded-xl border border-success/20 bg-success/5 flex items-center gap-2">
              <CheckCircle2 size={14} className="text-success shrink-0" />
              <p className="text-xs text-text-secondary">
                Aktiv sessiya: <strong className="text-text-primary">
                  {sessions.find(s => s.id === wizardSessionId)?.name || wizardSessionId.slice(0, 8)}
                </strong>
              </p>
            </div>
          )}
        </div>

        {/* Sessions history */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider px-1">
            Import tarixi
          </h2>
          {sessions.length === 0 ? (
            <div className="p-6 rounded-xl border border-border-primary bg-bg-secondary text-center">
              <History size={24} className="mx-auto mb-2 text-text-muted opacity-40" />
              <p className="text-sm text-text-muted">Import qilinmagan</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sessions.map(s => (
                <SessionCard key={s.id} session={s} onRollback={handleRollback} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* New session modal */}
      <Modal
        open={newSessionModal}
        onClose={() => setNewSessionModal(false)}
        title="Yangi import sessiyasi"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-muted">
            Har bir import sessiyasi alohida tarix sifatida saqlanadi va kerak bo'lsa bekor qilinishi mumkin.
          </p>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Sessiya nomi</label>
            <input
              autoFocus
              value={sessionName}
              onChange={e => setSessionName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleNewSession() }}
              placeholder="masalan: 1C dan import Aprel 2025"
              className="w-full bg-bg-elevated border border-border-primary rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary outline-none transition-colors"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" fullWidth onClick={() => setNewSessionModal(false)}>Bekor</Button>
            <Button variant="primary" size="sm" fullWidth loading={creating} onClick={handleNewSession}>
              Yaratish
            </Button>
          </div>
        </div>
      </Modal>

      {/* Wizard modal */}
      {wizardEntity && wizardSessionId && (
        <Modal
          open={!!wizardEntity}
          onClose={() => setWizardEntity(null)}
          title={`${ENTITIES.find(e => e.key === wizardEntity)?.label} import`}
          size="md"
        >
          <ImportWizard
            entity={wizardEntity}
            sessionId={wizardSessionId}
            onClose={() => { setWizardEntity(null); refetchSessions() }}
            onDone={() => { refetchSessions(); qc.invalidateQueries() }}
          />
        </Modal>
      )}
    </div>
  )
}
