import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Warehouse as WarehouseIcon, Search, AlertTriangle,
  Package, DollarSign, Plus, RefreshCw, Sparkles, ArrowRight,
} from 'lucide-react'
import { PageHeader } from '@components/layout/PageHeader/PageHeader'
import { Button } from '@components/ui/Button/Button'
import { Input } from '@components/ui/Input/Input'
import { Card } from '@components/ui/Card/Card'
import { Badge } from '@components/ui/Badge/Badge'
import { KPICard } from '@components/charts/KPICard/KPICard'
import { EmptyState } from '@components/ui/EmptyState/EmptyState'
import { Skeleton } from '@components/ui/Skeleton/Skeleton'
import {
  useWarehouses, useStockOverview, useCreateWarehouse,
} from '@features/warehouse/hooks/useWarehouse'
import { formatCurrency } from '@utils/formatters'
import { cn } from '@utils/cn'
import { useT } from '@i18n/index'
import api from '@config/api'

interface RestockSuggestion {
  product: {
    id: string; name: string; code?: string; unit: string; buyPrice: number; minStock: number
  }
  currentQty:     number
  shortageQty:    number
  suggestedQty:   number
  suggestedPrice: number
  lastSupplier:   { id: string; name: string; phone?: string } | null
  lastInDate:     string | null
  soldPerDay:     number
}

// ============================================
// OMBOR YARATISH MODALI
// ============================================
function CreateWarehouseModal({
  open,
  onClose,
}: {
  open:    boolean
  onClose: () => void
}) {
  const [name, setName]           = useState('')
  const [address, setAddress]     = useState('')
  const [isDefault, setIsDefault] = useState(false)
  const createMutation            = useCreateWarehouse()

  if (!open) return null

  const handleSave = async () => {
    if (!name.trim()) return
    await createMutation.mutateAsync({ name: name.trim(), address: address.trim() || undefined, isDefault })
    setName('')
    setAddress('')
    setIsDefault(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-bg-primary border border-border-primary rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <div>
          <h3 className="text-base font-semibold text-text-primary">Yangi ombor</h3>
          <p className="text-sm text-text-muted mt-0.5">Ombor ma'lumotlarini kiriting</p>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-text-secondary">Ombor nomi *</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Asosiy ombor"
            className="w-full px-3 py-2 rounded-lg border border-border-primary bg-bg-secondary text-sm text-text-primary placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-accent-primary transition-colors"
            autoFocus
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-text-secondary">Manzil</label>
          <input
            type="text"
            value={address}
            onChange={e => setAddress(e.target.value)}
            placeholder="Toshkent sh., Chilonzor t."
            className="w-full px-3 py-2 rounded-lg border border-border-primary bg-bg-secondary text-sm text-text-primary placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-accent-primary transition-colors"
          />
        </div>

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isDefault}
            onChange={e => setIsDefault(e.target.checked)}
            className="w-4 h-4 rounded border-border-primary accent-accent-primary"
          />
          <span className="text-sm text-text-secondary">Asosiy ombor sifatida belgilash</span>
        </label>

        <div className="flex items-center gap-2 pt-2">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={createMutation.isPending} className="flex-1">
            Bekor qilish
          </Button>
          <Button
            variant="primary" size="sm"
            onClick={handleSave}
            loading={createMutation.isPending}
            disabled={!name.trim()}
            className="flex-1"
          >
            Yaratish
          </Button>
        </div>
      </div>
    </div>
  )
}

// ============================================
// OMBOR KARTASI
// ============================================
function WarehouseCard({
  warehouse,
  active,
  onClick,
}: {
  warehouse: { id: string; name: string; address?: string; itemCount: number; totalValue: number; isDefault: boolean }
  active:    boolean
  onClick:   () => void
}) {
  const t = useT()
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left p-4 rounded-xl border transition-all',
        active
          ? 'border-accent-primary bg-accent-primary/5'
          : 'border-border-primary bg-bg-secondary hover:border-border-secondary hover:bg-bg-tertiary',
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <WarehouseIcon size={16} className={active ? 'text-accent-primary' : 'text-text-muted'} />
          <span className="text-sm font-semibold text-text-primary">{warehouse.name}</span>
        </div>
        {warehouse.isDefault && (
          <Badge variant="primary" size="sm">{t('warehouse.primary')}</Badge>
        )}
      </div>
      {warehouse.address && (
        <p className="text-xs text-text-muted mb-3 truncate">{warehouse.address}</p>
      )}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <p className="text-text-muted">{t('warehouse.position')}</p>
          <p className="font-semibold text-text-primary">{warehouse.itemCount}</p>
        </div>
        <div>
          <p className="text-text-muted">{t('warehouse.valueCol')}</p>
          <p className="font-semibold text-text-primary">{formatCurrency(warehouse.totalValue)}</p>
        </div>
      </div>
    </button>
  )
}

// ============================================
// ASOSIY SAHIFA
// ============================================
export default function WarehouseOverviewPage() {
  const t = useT()
  const navigate = useNavigate()
  const [selectedWarehouse, setSelectedWarehouse] = useState<string | undefined>(undefined)
  const [search, setSearch]       = useState('')
  const [createOpen, setCreateOpen] = useState(false)

  // Qayta to'ldirish tavsiyalari
  const { data: restock = [] } = useQuery<RestockSuggestion[]>({
    queryKey: ['restock-suggestions'],
    queryFn: async () => {
      const r = await api.get('/warehouse/restock-suggestions')
      return r.data.data ?? []
    },
  })

  // Yetkazib beruvchi bo'yicha guruhlash
  const groupedBySupplier = restock.reduce((acc, s) => {
    const key = s.lastSupplier?.id ?? '_no-supplier'
    if (!acc[key]) acc[key] = { supplier: s.lastSupplier, items: [] }
    acc[key].items.push(s)
    return acc
  }, {} as Record<string, { supplier: RestockSuggestion['lastSupplier']; items: RestockSuggestion[] }>)

  const createOrderForSupplier = (group: { supplier: RestockSuggestion['lastSupplier']; items: RestockSuggestion[] }) => {
    navigate('/warehouse/incoming', {
      state: {
        prefill: {
          contactId: group.supplier?.id,
          lines: group.items.map(s => ({
            productId: s.product.id,
            product:   s.product,
            quantity:  s.suggestedQty,
            price:     s.suggestedPrice,
          })),
        },
      },
    })
  }

  const {
    data: warehouses = [],
    isLoading: warehousesLoading,
    isError: warehousesError,
    refetch: refetchWarehouses,
  } = useWarehouses()

  const {
    data: stockItems = [],
    isLoading: stockLoading,
    isError: stockError,
    refetch: refetchStock,
  } = useStockOverview(selectedWarehouse)

  const filtered = search
    ? stockItems.filter(item =>
        item.productName.toLowerCase().includes(search.toLowerCase()) ||
        item.productCode?.toLowerCase().includes(search.toLowerCase()),
      )
    : stockItems

  const totalValue  = stockItems.reduce((sum, i) => sum + i.totalValue, 0)
  const lowCount    = stockItems.filter(i => i.isLow).length
  const totalItems  = stockItems.length

  return (
    <div>
      <PageHeader
        title={t('nav.warehouse')}
        description={t('warehouse.description')}
        breadcrumbs={[
          { label: t('nav.dashboard'), path: '/dashboard' },
          { label: t('nav.warehouse'), path: '/warehouse' },
          { label: t('warehouse.view') },
        ]}
        actions={
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus size={14} />}
            onClick={() => setCreateOpen(true)}
          >
            {t('warehouse.newWarehouse') || 'Yangi ombor'}
          </Button>
        }
      />

      {/* API xatosi */}
      {warehousesError && (
        <div className="mb-6 p-4 rounded-xl border border-danger/30 bg-danger/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-danger" />
            <p className="text-sm text-danger">Omborlar yuklanmadi. Internet aloqasini tekshiring.</p>
          </div>
          <Button variant="secondary" size="xs" leftIcon={<RefreshCw size={12} />} onClick={() => refetchWarehouses()}>
            Qayta urinish
          </Button>
        </div>
      )}

      {/* KPI kartalar */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <KPICard
          title={t('warehouse.totalPositions')}
          value={totalItems}
          icon={<Package size={18} />}
          iconColor="text-accent-primary"
          iconBg="bg-accent-primary/10"
          loading={stockLoading}
        />
        <KPICard
          title={t('warehouse.value')}
          value={formatCurrency(totalValue)}
          icon={<DollarSign size={18} />}
          iconColor="text-success"
          iconBg="bg-success/10"
          loading={stockLoading}
        />
        <KPICard
          title={t('warehouse.lowStock')}
          value={lowCount}
          subtitle={t('warehouse.productsCount')}
          icon={<AlertTriangle size={18} />}
          iconColor={lowCount > 0 ? 'text-danger' : 'text-text-muted'}
          iconBg={lowCount > 0 ? 'bg-danger/10' : 'bg-bg-elevated'}
          loading={stockLoading}
        />
      </div>

      {/* QAYTA TO'LDIRISH TAVSIYALARI */}
      {restock.length > 0 && (
        <Card className="mb-6 border-2 border-warning/30 bg-warning/5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-warning" />
              <h3 className="text-sm font-semibold text-text-primary">
                Qayta to'ldirish tavsiyalari ({restock.length} ta mahsulot)
              </h3>
            </div>
            <span className="text-xs text-text-muted">
              Yetkazib beruvchi bo'yicha guruhlangan
            </span>
          </div>

          <div className="space-y-3">
            {Object.values(groupedBySupplier).map((group, gi) => {
              const totalAmount = group.items.reduce((s, i) => s + i.suggestedQty * i.suggestedPrice, 0)
              return (
                <div key={gi} className="bg-bg-secondary border border-border-primary rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-semibold text-text-primary">
                        {group.supplier?.name ?? 'Yetkazib beruvchi belgilanmagan'}
                      </p>
                      <p className="text-xs text-text-muted">
                        {group.items.length} ta mahsulot · jami ~ {formatCurrency(totalAmount)}
                      </p>
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      rightIcon={<ArrowRight size={13} />}
                      onClick={() => createOrderForSupplier(group)}
                    >
                      Buyurtma yaratish
                    </Button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-text-muted">
                          <th className="text-left py-1">Mahsulot</th>
                          <th className="text-right py-1">Hozir</th>
                          <th className="text-right py-1">Min</th>
                          <th className="text-right py-1">Kunlik sotuv</th>
                          <th className="text-right py-1">Tavsiya</th>
                          <th className="text-right py-1">Narx</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.items.map(s => (
                          <tr key={s.product.id} className="border-t border-border-primary/40">
                            <td className="py-1.5 text-text-primary">{s.product.name}</td>
                            <td className="text-right tabular-nums text-danger">
                              {s.currentQty} {s.product.unit}
                            </td>
                            <td className="text-right tabular-nums text-text-muted">{s.product.minStock}</td>
                            <td className="text-right tabular-nums text-text-muted">{s.soldPerDay}/kun</td>
                            <td className="text-right tabular-nums font-semibold text-accent-primary">
                              {s.suggestedQty} {s.product.unit}
                            </td>
                            <td className="text-right tabular-nums text-text-secondary">
                              {formatCurrency(s.suggestedPrice)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Ombor yo'q — birinchi ombor yaratish */}
      {!warehousesLoading && !warehousesError && warehouses.length === 0 && (
        <Card>
          <EmptyState
            icon={<WarehouseIcon size={32} />}
            title="Omborlar mavjud emas"
            description="Mahsulot qoldiqlarini boshqarish uchun birinchi omboringizni yarating."
            action={{
              label:   'Birinchi ombor yaratish',
              icon:    <Plus size={14} />,
              onClick: () => setCreateOpen(true),
            }}
          />
        </Card>
      )}

      {/* Ombor paneli + jadval */}
      {(warehousesLoading || warehouses.length > 0) && (
        <div className="grid grid-cols-4 gap-4">
          {/* Omborlar paneli */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                {t('warehouse.warehousesLabel')}
              </p>
              <button
                onClick={() => setCreateOpen(true)}
                className="text-text-muted hover:text-accent-primary transition-colors"
                title="Yangi ombor"
              >
                <Plus size={14} />
              </button>
            </div>

            <button
              onClick={() => setSelectedWarehouse(undefined)}
              className={cn(
                'w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all',
                selectedWarehouse === undefined
                  ? 'bg-accent-primary/10 text-accent-primary'
                  : 'text-text-secondary hover:bg-bg-tertiary',
              )}
            >
              {t('warehouse.allWarehouses')}
            </button>

            {warehousesLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))
            ) : warehouses.map(w => (
              <WarehouseCard
                key={w.id}
                warehouse={w}
                active={selectedWarehouse === w.id}
                onClick={() => setSelectedWarehouse(
                  selectedWarehouse === w.id ? undefined : w.id
                )}
              />
            ))}
          </div>

          {/* Mahsulotlar jadvali */}
          <div className="col-span-3">
            <Card padding="none">
              <div className="p-4 border-b border-border-primary">
                <Input
                  placeholder={t('warehouse.productSearch')}
                  leftIcon={<Search size={15} />}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="max-w-xs"
                />
              </div>

              {stockError && (
                <div className="px-4 py-3 bg-danger/5 border-b border-danger/20 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={13} className="text-danger" />
                    <p className="text-xs text-danger">Qoldiqlar yuklanmadi</p>
                  </div>
                  <Button variant="secondary" size="xs" leftIcon={<RefreshCw size={12} />} onClick={() => refetchStock()}>
                    Qayta
                  </Button>
                </div>
              )}

              {lowCount > 0 && (
                <div className="px-4 py-2.5 bg-danger/5 border-b border-danger/20 flex items-center gap-2">
                  <AlertTriangle size={13} className="text-danger" />
                  <p className="text-xs text-danger">
                    {lowCount} {t('warehouse.productsCount')} {t('warehouse.lowWarning')}
                  </p>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border-primary">
                      {[
                        { key: 'p', label: t('warehouse.colProduct'), align: 'left' },
                        { key: 'w', label: t('warehouse.colWarehouse'), align: 'left' },
                        { key: 's', label: t('warehouse.colStock'), align: 'right' },
                        { key: 'a', label: t('warehouse.colAvgPrice'), align: 'right' },
                        { key: 'v', label: t('warehouse.colValue'), align: 'right' },
                        { key: 'x', label: '', align: 'left' },
                      ].map(h => (
                        <th
                          key={h.key}
                          className={cn(
                            'px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-text-muted',
                            h.align === 'right' ? 'text-right' : 'text-left',
                          )}
                        >
                          {h.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {stockLoading ? (
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
                            icon={<Package size={28} />}
                            title={t('warehouse.notFound')}
                            description={search ? t('warehouse.searchEmpty', { query: search }) : t('warehouse.empty')}
                          />
                        </td>
                      </tr>
                    ) : (
                      filtered.map(item => (
                        <tr
                          key={item.id}
                          className={cn(
                            'border-b border-border-primary hover:bg-bg-tertiary/50 transition-colors',
                            item.isLow && 'bg-danger/3',
                          )}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div>
                                <p className="text-sm font-medium text-text-primary">{item.productName}</p>
                                {item.productCode && (
                                  <p className="text-xs text-text-muted font-mono">{item.productCode}</p>
                                )}
                              </div>
                              {item.isLow && (
                                <AlertTriangle size={13} className="text-danger shrink-0" />
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
                            <span className="text-sm font-medium text-text-primary tabular-nums">
                              {formatCurrency(item.totalValue)}
                            </span>
                          </td>
                          <td className="px-4 py-3 w-8" />
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      )}

      <CreateWarehouseModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  )
}
