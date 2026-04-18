import { useState } from 'react'
import { ClipboardList, Search } from 'lucide-react'
import { PageHeader } from '@components/layout/PageHeader/PageHeader'
import { Button } from '@components/ui/Button/Button'
import { Input } from '@components/ui/Input/Input'
import { Card } from '@components/ui/Card/Card'
import { EmptyState } from '@components/ui/EmptyState/EmptyState'
import { Skeleton } from '@components/ui/Skeleton/Skeleton'
import { useStockOverview, useAdjustStock, useWarehouses } from '@features/warehouse/hooks/useWarehouse'
import { formatCurrency } from '@utils/formatters'
import { cn } from '@utils/cn'
import { useT } from '@i18n/index'

// ============================================
// INVENTARIZATSIYA QATORI
// ============================================
interface StockRowItem {
  id:            string
  productId:     string
  productName:   string
  productCode?:  string
  unit:          string
  warehouseId:   string
  warehouseName: string
  quantity:      number
  avgPrice:      number
  totalValue:    number
  minStock:      number
  isLow:         boolean
}

function InventoryRow({
  item,
  onAdjust,
}: {
  item:     StockRowItem
  onAdjust: (productId: string, warehouseId: string, current: number, unit: string, name: string) => void
}) {
  return (
    <tr className="border-b border-border-primary hover:bg-bg-tertiary/50 transition-colors group">
      <td className="px-4 py-3">
        <div>
          <p className="text-sm font-medium text-text-primary">{item.productName}</p>
          {item.productCode && (
            <p className="text-xs text-text-muted font-mono">{item.productCode}</p>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="text-sm text-text-secondary">{item.warehouseName}</span>
      </td>
      <td className="px-4 py-3 text-right">
        <span className={cn(
          'text-sm font-medium tabular-nums',
          item.isLow ? 'text-danger' : 'text-text-primary',
        )}>
          {item.quantity} {item.unit}
        </span>
        {item.isLow && (
          <p className="text-[10px] text-danger text-right">min: {item.minStock}</p>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        <span className="text-sm text-text-secondary tabular-nums">
          {formatCurrency(item.avgPrice)}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <span className="text-sm font-medium tabular-nums">
          {formatCurrency(item.totalValue)}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="secondary"
            size="xs"
            onClick={() => onAdjust(item.productId, item.warehouseId, item.quantity, item.unit, item.productName)}
          >
            Sozlash
          </Button>
        </div>
      </td>
    </tr>
  )
}

// ============================================
// SOZLASH MODALI
// ============================================
function AdjustModal({
  open,
  item,
  onClose,
  onSave,
  loading,
}: {
  open:    boolean
  item:    { productId: string; warehouseId: string; current: number; unit: string; name: string } | null
  onClose: () => void
  onSave:  (qty: number, reason: string) => void
  loading: boolean
}) {
  const [qty, setQty]       = useState('')
  const [reason, setReason] = useState('')

  if (!open || !item) return null

  const handleSave = () => {
    const q = parseFloat(qty)
    if (isNaN(q) || q < 0) return
    onSave(q, reason)
    setQty('')
    setReason('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-bg-primary border border-border-primary rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <div>
          <h3 className="text-base font-semibold text-text-primary">Qoldiqni sozlash</h3>
          <p className="text-sm text-text-muted mt-0.5">{item.name}</p>
        </div>

        <div className="p-3 rounded-lg bg-bg-tertiary text-sm">
          <span className="text-text-muted">Hozirgi qoldiq: </span>
          <span className="font-semibold text-text-primary">{item.current} {item.unit}</span>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-text-secondary">
            Yangi qoldiq ({item.unit})
          </label>
          <input
            type="number"
            min="0"
            step="0.001"
            value={qty}
            onChange={e => setQty(e.target.value)}
            placeholder={String(item.current)}
            className="w-full px-3 py-2 rounded-lg border border-border-primary bg-bg-secondary text-sm text-text-primary placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-accent-primary transition-colors"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-text-secondary">Sabab</label>
          <input
            type="text"
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Inventarizatsiya, qayta hisob..."
            className="w-full px-3 py-2 rounded-lg border border-border-primary bg-bg-secondary text-sm text-text-primary placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-accent-primary transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 pt-2">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={loading} className="flex-1">
            Bekor qilish
          </Button>
          <Button variant="primary" size="sm" onClick={handleSave} loading={loading} className="flex-1">
            Saqlash
          </Button>
        </div>
      </div>
    </div>
  )
}

// ============================================
// ASOSIY SAHIFA
// ============================================
export default function InventoryPage() {
  const t = useT()
  const [selectedWarehouse, setSelectedWarehouse] = useState<string | undefined>(undefined)
  const [search, setSearch]     = useState('')
  const [adjustItem, setAdjustItem] = useState<{
    productId: string; warehouseId: string; current: number; unit: string; name: string
  } | null>(null)

  const { data: warehouses = [] }            = useWarehouses()
  const { data: stockItems = [], isLoading } = useStockOverview(selectedWarehouse)
  const adjustMutation                       = useAdjustStock()

  const filtered = stockItems.filter(item => {
    if (!search) return true
    return (
      item.productName.toLowerCase().includes(search.toLowerCase()) ||
      (item.productCode?.toLowerCase().includes(search.toLowerCase()) ?? false)
    )
  })

  const lowCount   = stockItems.filter(i => i.isLow).length
  const totalValue = stockItems.reduce((sum, i) => sum + i.totalValue, 0)

  const handleAdjust = (
    productId: string,
    warehouseId: string,
    current: number,
    unit: string,
    name: string,
  ) => {
    setAdjustItem({ productId, warehouseId, current, unit, name })
  }

  const handleSaveAdjust = async (qty: number, reason: string) => {
    if (!adjustItem) return
    await adjustMutation.mutateAsync({
      warehouseId: adjustItem.warehouseId,
      productId:   adjustItem.productId,
      quantity:    qty,
      reason:      reason || 'Inventarizatsiya',
    })
    setAdjustItem(null)
  }

  return (
    <div>
      <PageHeader
        title={t('warehouse.inventory')}
        description={t('warehouse.movementsDescription')}
        breadcrumbs={[
          { label: t('nav.dashboard'), path: '/dashboard' },
          { label: t('warehouse.title'), path: '/warehouse' },
          { label: t('warehouse.inventory') },
        ]}
      />

      {/* Statistika */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="p-4 rounded-xl border border-border-primary bg-bg-secondary">
          <p className="text-xs text-text-muted mb-1">{t('warehouse.totalPositions')}</p>
          <p className="text-2xl font-bold text-text-primary">{stockItems.length}</p>
        </div>
        <div className="p-4 rounded-xl border border-border-primary bg-bg-secondary">
          <p className="text-xs text-text-muted mb-1">{t('warehouse.value')}</p>
          <p className="text-xl font-bold text-success">{formatCurrency(totalValue)}</p>
        </div>
        <div className={cn(
          'p-4 rounded-xl border',
          lowCount > 0
            ? 'border-danger/30 bg-danger/5'
            : 'border-border-primary bg-bg-secondary',
        )}>
          <p className="text-xs text-text-muted mb-1">{t('warehouse.lowStock')}</p>
          <p className={cn('text-2xl font-bold', lowCount > 0 ? 'text-danger' : 'text-text-primary')}>
            {lowCount}
          </p>
        </div>
      </div>

      <Card padding="none">
        <div className="flex items-center gap-3 p-4 border-b border-border-primary flex-wrap">
          <Input
            placeholder="Mahsulot nomi yoki kod..."
            leftIcon={<Search size={15} />}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="max-w-xs"
          />

          {warehouses.length > 0 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setSelectedWarehouse(undefined)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  !selectedWarehouse
                    ? 'bg-accent-primary/10 text-accent-primary'
                    : 'text-text-secondary hover:bg-bg-tertiary',
                )}
              >
                Barcha omborlar
              </button>
              {warehouses.map(w => (
                <button
                  key={w.id}
                  onClick={() => setSelectedWarehouse(w.id)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                    selectedWarehouse === w.id
                      ? 'bg-accent-primary/10 text-accent-primary'
                      : 'text-text-secondary hover:bg-bg-tertiary',
                  )}
                >
                  {w.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-primary">
                {['Mahsulot', 'Ombor', 'Qoldiq', "O'rtacha narx", 'Qiymat', ''].map(h => (
                  <th
                    key={h}
                    className={cn(
                      'px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-text-muted',
                      h === 'Qoldiq' || h === "O'rtacha narx" || h === 'Qiymat'
                        ? 'text-right'
                        : 'text-left',
                    )}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-border-primary">
                    {Array.from({ length: 6 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton className="h-4 rounded" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : !filtered.length ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      icon={<ClipboardList size={28} />}
                      title={t('warehouse.notFound')}
                      description={t('products.notFound')}
                    />
                  </td>
                </tr>
              ) : (
                filtered.map(item => (
                  <InventoryRow
                    key={item.id}
                    item={item}
                    onAdjust={handleAdjust}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <AdjustModal
        open={!!adjustItem}
        item={adjustItem}
        onClose={() => setAdjustItem(null)}
        onSave={handleSaveAdjust}
        loading={adjustMutation.isPending}
      />
    </div>
  )
}
