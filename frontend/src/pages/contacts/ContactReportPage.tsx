import { useState, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft, Printer, Download, Calendar, Filter,
  TrendingUp, TrendingDown, Package, AlertCircle,
} from 'lucide-react'
import { PageHeader } from '@components/layout/PageHeader/PageHeader'
import { Card }       from '@components/ui/Card/Card'
import { Badge }      from '@components/ui/Badge/Badge'
import { Button }     from '@components/ui/Button/Button'
import { Skeleton }   from '@components/ui/Skeleton/Skeleton'
import api            from '@config/api'
import { formatCurrency, formatDate } from '@utils/formatters'
import { printHTML }  from '@utils/printDocument'
import { cn }         from '@utils/cn'

interface MovementRow {
  id:          string
  date:        string
  type:        'IN' | 'OUT' | string
  product:     { id: string; name: string; unit: string; code?: string } | null
  warehouse:   { id: string; name: string } | null
  quantity:    number
  price:       number
  totalAmount: number
  notes?:      string
}

interface TransactionsResponse {
  contact: {
    id: string; name: string; type: string; phone?: string; legalName?: string
  }
  movements: MovementRow[]
  totals: {
    incoming: { count: number; quantity: number; amount: number }
    outgoing: { count: number; quantity: number; amount: number }
    netAmount: number
  }
  meta: { total: number; page: number; limit: number; totalPages: number }
}

export default function ContactReportPage() {
  const { id }   = useParams<{ id: string }>()
  const navigate = useNavigate()

  const today = new Date().toISOString().slice(0, 10)
  const monthAgo = (() => {
    const d = new Date()
    d.setMonth(d.getMonth() - 1)
    return d.toISOString().slice(0, 10)
  })()

  const [from, setFrom] = useState(monthAgo)
  const [to,   setTo]   = useState(today)
  const [type, setType] = useState<'' | 'IN' | 'OUT'>('')
  const [page, setPage] = useState(1)

  const { data, isLoading, isError } = useQuery<TransactionsResponse>({
    queryKey: ['contact-transactions', id, from, to, type, page],
    queryFn: async () => {
      const res = await api.get(`/contacts/${id}/transactions`, {
        params: { from, to, type: type || undefined, page, limit: 100 },
      })
      return res.data.data
    },
    enabled: !!id,
  })

  const handlePrint = () => {
    if (!data) return
    const rows = data.movements.map((m, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${formatDate(m.date)}</td>
        <td>${m.product?.code ?? ''}</td>
        <td>${m.product?.name ?? '—'}</td>
        <td>${m.type === 'IN' ? 'Kirim' : 'Chiqim'}</td>
        <td>${m.warehouse?.name ?? '—'}</td>
        <td style="text-align:right">${m.quantity.toLocaleString('uz-UZ')} ${m.product?.unit ?? ''}</td>
        <td style="text-align:right">${formatCurrency(m.price)}</td>
        <td style="text-align:right; font-weight:600">${formatCurrency(m.totalAmount)}</td>
      </tr>
    `).join('')

    const html = `
      <h1 style="margin:0 0 4px 0">Tranzaksiyalar hisoboti</h1>
      <p style="margin:0 0 16px 0; color:#555">
        <strong>${data.contact.name}</strong>
        ${data.contact.legalName ? ` (${data.contact.legalName})` : ''}
        ${data.contact.phone ? ` · ${data.contact.phone}` : ''}
        <br/>
        Davr: ${formatDate(from)} — ${formatDate(to)}
        ${type ? ` · Faqat ${type === 'IN' ? 'kirim' : 'chiqim'}` : ''}
      </p>

      <table border="1" cellspacing="0" cellpadding="6" style="width:100%; border-collapse:collapse; font-size:12px">
        <thead style="background:#f3f4f6">
          <tr>
            <th>#</th>
            <th>Sana</th>
            <th>Kod</th>
            <th>Mahsulot</th>
            <th>Turi</th>
            <th>Ombor</th>
            <th>Miqdor</th>
            <th>Narxi</th>
            <th>Summa</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr style="background:#f9fafb; font-weight:600">
            <td colspan="6" style="text-align:right">Kirim jami:</td>
            <td colspan="2" style="text-align:right">${data.totals.incoming.count} ta</td>
            <td style="text-align:right">${formatCurrency(data.totals.incoming.amount)}</td>
          </tr>
          <tr style="background:#f9fafb; font-weight:600">
            <td colspan="6" style="text-align:right">Chiqim jami:</td>
            <td colspan="2" style="text-align:right">${data.totals.outgoing.count} ta</td>
            <td style="text-align:right">${formatCurrency(data.totals.outgoing.amount)}</td>
          </tr>
          <tr style="background:#eef2ff; font-weight:700">
            <td colspan="8" style="text-align:right">Sof balans:</td>
            <td style="text-align:right">${formatCurrency(data.totals.netAmount)}</td>
          </tr>
        </tfoot>
      </table>

      <p style="margin-top:24px; font-size:11px; color:#666; text-align:right">
        Chop etilgan: ${new Date().toLocaleString('uz-UZ')}
      </p>
    `

    printHTML(html, `Hisobot — ${data.contact.name}`)
  }

  const handleExportCSV = () => {
    if (!data) return
    const header = ['Sana', 'Mahsulot kodi', 'Mahsulot', 'Turi', 'Ombor', 'Miqdor', 'Birlik', 'Narxi', 'Summa']
    const rows = data.movements.map(m => [
      formatDate(m.date),
      m.product?.code ?? '',
      m.product?.name ?? '',
      m.type === 'IN' ? 'Kirim' : 'Chiqim',
      m.warehouse?.name ?? '',
      m.quantity,
      m.product?.unit ?? '',
      m.price,
      m.totalAmount,
    ])
    const csv = [header, ...rows]
      .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `hisobot_${data.contact.name}_${from}_${to}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const productSummary = useMemo(() => {
    if (!data) return []
    const map = new Map<string, { name: string; unit: string; qty: number; amount: number; count: number }>()
    for (const m of data.movements) {
      const key = m.product?.id ?? '—'
      const cur = map.get(key) ?? {
        name:   m.product?.name ?? '—',
        unit:   m.product?.unit ?? '',
        qty:    0,
        amount: 0,
        count:  0,
      }
      cur.qty    += m.quantity
      cur.amount += m.totalAmount
      cur.count  += 1
      map.set(key, cur)
    }
    return Array.from(map.values()).sort((a, b) => b.amount - a.amount)
  }, [data])

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64 rounded-xl" />
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle size={40} className="text-danger mb-3" />
        <p className="text-text-primary font-medium mb-1">Hisobot yuklanmadi</p>
        <Button variant="secondary" size="sm" leftIcon={<ArrowLeft size={14} />} onClick={() => navigate(-1)}>
          Orqaga
        </Button>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title={`Hisobot — ${data.contact.name}`}
        description={data.contact.type === 'CUSTOMER' ? 'Mijoz' : 'Yetkazib beruvchi'}
        breadcrumbs={[
          { label: 'Dashboard', path: '/dashboard' },
          { label: 'Mijozlar',  path: '/contacts'  },
          { label: data.contact.name, path: `/contacts/${id}` },
          { label: 'Hisobot' },
        ]}
        actions={
          <>
            <Link to={`/contacts/${id}`}>
              <Button variant="secondary" size="sm" leftIcon={<ArrowLeft size={14} />}>
                Orqaga
              </Button>
            </Link>
            <Button variant="secondary" size="sm" leftIcon={<Download size={14} />} onClick={handleExportCSV}>
              CSV
            </Button>
            <Button variant="primary" size="sm" leftIcon={<Printer size={14} />} onClick={handlePrint}>
              Chop etish
            </Button>
          </>
        }
      />

      {/* ===== FILTERLAR ===== */}
      <Card className="mb-4">
        <div className="flex items-end gap-3 flex-wrap">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-text-muted block mb-1">
              <Calendar size={11} className="inline mr-1" />
              Boshlanishi
            </label>
            <input
              type="date"
              value={from}
              onChange={e => { setFrom(e.target.value); setPage(1) }}
              className="px-3 py-2 rounded-md bg-bg-tertiary border border-border-primary text-sm text-text-primary focus:outline-none focus:border-accent-primary"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-text-muted block mb-1">
              <Calendar size={11} className="inline mr-1" />
              Tugashi
            </label>
            <input
              type="date"
              value={to}
              onChange={e => { setTo(e.target.value); setPage(1) }}
              className="px-3 py-2 rounded-md bg-bg-tertiary border border-border-primary text-sm text-text-primary focus:outline-none focus:border-accent-primary"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-text-muted block mb-1">
              <Filter size={11} className="inline mr-1" />
              Turi
            </label>
            <div className="flex gap-1">
              {[
                { v: '',    label: 'Hammasi' },
                { v: 'IN',  label: 'Kirim'   },
                { v: 'OUT', label: 'Chiqim'  },
              ].map(opt => (
                <button
                  key={opt.v}
                  onClick={() => { setType(opt.v as any); setPage(1) }}
                  className={cn(
                    'px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    type === opt.v
                      ? 'bg-accent-primary text-white'
                      : 'bg-bg-tertiary text-text-secondary hover:bg-bg-elevated',
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="ml-auto text-xs text-text-muted">
            Jami {data.meta.total} ta yozuv
          </div>
        </div>
      </Card>

      {/* ===== JAMI KARTALAR ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <Card className="border-2 border-success/30 bg-success/5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={15} className="text-success" />
            <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Kirim</span>
          </div>
          <p className="text-2xl font-black tabular-nums text-success">
            {formatCurrency(data.totals.incoming.amount)}
          </p>
          <p className="text-xs text-text-muted mt-1">
            {data.totals.incoming.count} ta hujjat · {data.totals.incoming.quantity.toLocaleString('uz-UZ')} birlik
          </p>
        </Card>
        <Card className="border-2 border-warning/30 bg-warning/5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown size={15} className="text-warning" />
            <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Chiqim</span>
          </div>
          <p className="text-2xl font-black tabular-nums text-warning">
            {formatCurrency(data.totals.outgoing.amount)}
          </p>
          <p className="text-xs text-text-muted mt-1">
            {data.totals.outgoing.count} ta hujjat · {data.totals.outgoing.quantity.toLocaleString('uz-UZ')} birlik
          </p>
        </Card>
        <Card className={cn(
          'border-2',
          data.totals.netAmount > 0 ? 'border-accent-primary/30 bg-accent-primary/5'
            : data.totals.netAmount < 0 ? 'border-danger/30 bg-danger/5'
            : 'border-border-primary',
        )}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Sof balans</span>
          </div>
          <p className={cn(
            'text-2xl font-black tabular-nums',
            data.totals.netAmount > 0 ? 'text-accent-primary'
              : data.totals.netAmount < 0 ? 'text-danger'
              : 'text-text-muted',
          )}>
            {formatCurrency(data.totals.netAmount)}
          </p>
          <p className="text-xs text-text-muted mt-1">Kirim − Chiqim</p>
        </Card>
      </div>

      {/* ===== MAHSULOTLAR BO'YICHA UMUMIY ===== */}
      {productSummary.length > 0 && (
        <Card className="mb-4" padding="none">
          <div className="px-4 py-3 border-b border-border-primary">
            <h3 className="text-sm font-semibold text-text-primary">Mahsulotlar bo'yicha jami</h3>
            <p className="text-xs text-text-muted mt-0.5">Tanlangan davr uchun</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-primary bg-bg-tertiary/30">
                  {['Mahsulot', 'Hujjatlar', 'Jami miqdor', 'Jami summa'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {productSummary.map((p, i) => (
                  <tr key={i} className="border-b border-border-primary/40">
                    <td className="px-4 py-2.5 text-sm text-text-primary font-medium">{p.name}</td>
                    <td className="px-4 py-2.5 text-sm tabular-nums text-text-secondary">{p.count}</td>
                    <td className="px-4 py-2.5 text-sm tabular-nums text-text-secondary">
                      {p.qty.toLocaleString('uz-UZ')} {p.unit}
                    </td>
                    <td className="px-4 py-2.5 text-sm tabular-nums font-semibold text-text-primary">
                      {formatCurrency(p.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ===== TAFSILOTLI JADVAL ===== */}
      <Card padding="none">
        <div className="px-4 py-3 border-b border-border-primary">
          <h3 className="text-sm font-semibold text-text-primary">Tafsilotli ro'yxat</h3>
          <p className="text-xs text-text-muted mt-0.5">Sana, mahsulot, narx va miqdor</p>
        </div>
        <div className="overflow-x-auto">
          {data.movements.length === 0 ? (
            <div className="py-16 text-center">
              <Package size={32} className="text-text-muted mx-auto mb-2 opacity-30" />
              <p className="text-sm text-text-muted">Tanlangan davr uchun yozuv topilmadi</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-primary bg-bg-tertiary/30">
                  {['Sana', 'Mahsulot', 'Turi', 'Ombor', 'Miqdor', 'Birlik narxi', 'Summa'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-text-muted whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.movements.map(m => (
                  <tr key={m.id} className="border-b border-border-primary/40 hover:bg-bg-tertiary/40 transition-colors">
                    <td className="px-4 py-2.5 text-xs text-text-muted font-mono whitespace-nowrap">{formatDate(m.date)}</td>
                    <td className="px-4 py-2.5 text-sm text-text-primary">
                      {m.product?.name ?? '—'}
                      {m.product?.code && <span className="text-xs text-text-muted ml-2 font-mono">#{m.product.code}</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge variant={m.type === 'IN' ? 'success' : 'danger'} size="sm">
                        {m.type === 'IN' ? 'Kirim' : 'Chiqim'}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-sm text-text-secondary whitespace-nowrap">{m.warehouse?.name ?? '—'}</td>
                    <td className="px-4 py-2.5 text-sm tabular-nums text-text-primary whitespace-nowrap">
                      {m.quantity.toLocaleString('uz-UZ')} {m.product?.unit ?? ''}
                    </td>
                    <td className="px-4 py-2.5 text-sm tabular-nums text-text-secondary whitespace-nowrap">
                      {formatCurrency(m.price)}
                    </td>
                    <td className="px-4 py-2.5 text-sm tabular-nums font-semibold text-text-primary whitespace-nowrap">
                      {formatCurrency(m.totalAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {data.meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border-primary">
            <span className="text-xs text-text-muted">
              {data.meta.page} / {data.meta.totalPages} sahifa
            </span>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="secondary"
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                Oldingi
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={page >= data.meta.totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                Keyingi
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
