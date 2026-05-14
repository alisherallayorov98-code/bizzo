import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Truck, AlertCircle, ChevronDown, ChevronUp, Package } from 'lucide-react'
import api from '@/config/api'

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  DRAFT:     { label: 'Qoralama',      color: 'bg-gray-500/20 text-gray-300' },
  SENT:      { label: 'Yuborildi',     color: 'bg-blue-500/20 text-blue-300' },
  CONFIRMED: { label: 'Tasdiqlandi',   color: 'bg-purple-500/20 text-purple-300' },
  PARTIAL:   { label: 'Qisman',        color: 'bg-yellow-500/20 text-yellow-300' },
  RECEIVED:  { label: 'Qabul qilindi', color: 'bg-green-500/20 text-green-300' },
  CANCELLED: { label: 'Bekor',         color: 'bg-red-500/20 text-red-300' },
}

function useSupplierPortal(token: string) {
  return useQuery({
    queryKey: ['supplier-portal', token],
    queryFn:  () => api.get('/portal/supplier', { params: { token } }).then(r => r.data),
    enabled:  !!token,
    retry:    false,
  })
}

function OrderRow({ order }: { order: any }) {
  const [expanded, setExpanded] = useState(false)
  const st = STATUS_LABELS[order.status] ?? { label: order.status, color: 'bg-gray-500/20 text-gray-300' }

  return (
    <>
      <tr className="border-b border-white/5 hover:bg-white/5 cursor-pointer" onClick={() => setExpanded(e => !e)}>
        <td className="px-4 py-3 text-white text-sm font-mono">{order.orderNumber}</td>
        <td className="px-4 py-3 text-gray-300 text-sm">{order.warehouse?.name}</td>
        <td className="px-4 py-3 text-gray-400 text-sm">{new Date(order.createdAt).toLocaleDateString('uz')}</td>
        <td className="px-4 py-3 text-white text-sm">{Number(order.totalAmount).toLocaleString()} UZS</td>
        <td className="px-4 py-3">
          <span className={`px-2 py-0.5 rounded-full text-xs ${st.color}`}>{st.label}</span>
        </td>
        <td className="px-4 py-3 text-gray-400">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </td>
      </tr>
      {expanded && (
        <tr className="bg-white/2">
          <td colSpan={6} className="px-6 py-3">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500">
                  <th className="text-left pb-1">Mahsulot</th>
                  <th className="text-right pb-1">Miqdor</th>
                  <th className="text-right pb-1">Qabul qilindi</th>
                  <th className="text-right pb-1">Narx</th>
                </tr>
              </thead>
              <tbody>
                {order.items?.map((item: any) => (
                  <tr key={item.id} className="text-gray-300">
                    <td className="py-0.5">{item.product?.name}</td>
                    <td className="text-right">{Number(item.quantity)} {item.product?.unit}</td>
                    <td className="text-right">{Number(item.receivedQty)}</td>
                    <td className="text-right">{Number(item.unitPrice).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </td>
        </tr>
      )}
    </>
  )
}

export default function SupplierPortalPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [activeTab, setActiveTab] = useState<'orders' | 'debts'>('orders')

  const { data, isLoading, isError } = useSupplierPortal(token)

  if (!token) return (
    <div className="min-h-screen bg-[#0A0F1E] flex items-center justify-center">
      <p className="text-red-400">Token topilmadi</p>
    </div>
  )

  if (isLoading) return (
    <div className="min-h-screen bg-[#0A0F1E] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (isError) return (
    <div className="min-h-screen bg-[#0A0F1E] flex items-center justify-center flex-col gap-3">
      <AlertCircle className="w-12 h-12 text-red-400" />
      <p className="text-red-400 text-lg">Token yaroqsiz yoki muddati o'tgan</p>
    </div>
  )

  const { supplier, purchaseOrders = [], payables = [] } = data
  const overduePayables = payables.filter((d: any) => d.dueDate && new Date(d.dueDate) < new Date())

  return (
    <div className="min-h-screen bg-[#0A0F1E] text-white">
      {/* Header */}
      <div className="bg-[#0D1628] border-b border-white/10 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Supplier Portal</h1>
            <p className="text-sm text-gray-400">BiznesERP</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6 space-y-5">
        {/* Supplier info card */}
        <div className="bg-[#0D1628] border border-white/10 rounded-xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-600/20 rounded-xl flex items-center justify-center text-purple-300 text-xl font-bold">
            {supplier.name?.[0]?.toUpperCase()}
          </div>
          <div>
            <h2 className="text-white font-semibold text-lg">{supplier.name}</h2>
            <div className="flex gap-4 mt-1 text-sm text-gray-400">
              {supplier.email && <span>{supplier.email}</span>}
              {supplier.phone && <span>{supplier.phone}</span>}
            </div>
          </div>
          <div className="ml-auto text-right">
            <div className="text-2xl font-bold text-white">{purchaseOrders.length}</div>
            <div className="text-xs text-gray-400">Buyurtmalar</div>
          </div>
        </div>

        {/* Overdue alert */}
        {overduePayables.length > 0 && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-red-300 font-medium">Muddati o'tgan to'lovlar</p>
              <p className="text-red-400/80 text-sm mt-1">
                {overduePayables.length} ta to'lov muddati o'tgan — jami{' '}
                {overduePayables.reduce((s: number, d: any) => s + Number(d.remaining), 0).toLocaleString()} UZS
              </p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-white/5 rounded-xl p-1">
          {[
            { id: 'orders', label: `Buyurtmalar (${purchaseOrders.length})` },
            { id: 'debts',  label: `Qarzlar (${payables.length})` },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Orders tab */}
        {activeTab === 'orders' && (
          <div className="bg-[#0D1628] border border-white/10 rounded-xl overflow-hidden">
            {purchaseOrders.length === 0 ? (
              <div className="py-12 text-center text-gray-500">
                <Package className="w-10 h-10 mx-auto mb-3 opacity-40" />
                Buyurtmalar yo'q
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    {['Buyurtma #', 'Ombor', 'Sana', 'Jami', 'Holat', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs text-gray-400 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {purchaseOrders.map((o: any) => <OrderRow key={o.id} order={o} />)}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Debts tab */}
        {activeTab === 'debts' && (
          <div className="bg-[#0D1628] border border-white/10 rounded-xl overflow-hidden">
            {payables.length === 0 ? (
              <div className="py-12 text-center text-gray-500">To'lanmagan qarzlar yo'q</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    {['Tavsif', 'Summa', 'Qoldi', 'Muddat', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs text-gray-400 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {payables.map((d: any) => {
                    const overdue = d.dueDate && new Date(d.dueDate) < new Date()
                    return (
                      <tr key={d.id} className="border-b border-white/5 hover:bg-white/5">
                        <td className="px-4 py-3 text-gray-200 text-sm">{d.description || '—'}</td>
                        <td className="px-4 py-3 text-white text-sm">{Number(d.amount).toLocaleString()}</td>
                        <td className="px-4 py-3 text-yellow-300 text-sm font-semibold">{Number(d.remaining).toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm">
                          {d.dueDate ? (
                            <span className={overdue ? 'text-red-400 font-semibold' : 'text-gray-400'}>
                              {new Date(d.dueDate).toLocaleDateString('uz')}
                              {overdue && ' ⚠️'}
                            </span>
                          ) : '—'}
                        </td>
                        <td />
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
