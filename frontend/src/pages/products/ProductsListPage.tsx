import { useState, useCallback, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import * as XLSX from 'xlsx'
import toast from 'react-hot-toast'
import {
  Plus, Search, Package, AlertTriangle, Download,
  Layers, Tag, TrendingDown, Eye, Edit2, Trash2,
  BarChart2,
} from 'lucide-react'
import { PageHeader } from '@components/layout/PageHeader/PageHeader'
import { Button } from '@components/ui/Button/Button'
import { Input } from '@components/ui/Input/Input'
import { Card } from '@components/ui/Card/Card'
import { Badge } from '@components/ui/Badge/Badge'
import { KPICard } from '@components/charts/KPICard/KPICard'
import { TableRowSkeleton } from '@components/ui/Skeleton/Skeleton'
import { Pagination }       from '@components/ui/Pagination/Pagination'
import { EmptyState } from '@components/ui/EmptyState/EmptyState'
import { ConfirmDialog } from '@components/ui/Modal/Modal'
import { ProductFormModal } from '@features/products/components/ProductFormModal'
import {
  useProducts, useProductStats, useDeleteProduct, useBulkDeleteProducts,
} from '@features/products/hooks/useProducts'
import { useT } from '@i18n/index'
import { productService } from '@services/product.service'
import type { Product } from '@services/product.service'
import { formatCurrency } from '@utils/formatters'
import { cn } from '@utils/cn'
import { useDebounce } from '@hooks/useDebounce'
import { BulkActionBar } from '@components/ui/BulkActionBar/BulkActionBar'
import { useKeyboardShortcuts } from '@hooks/useKeyboardShortcuts'

// ============================================
// MAHSULOT QATORI
// ============================================
function ProductRow({
  product,
  selected,
  onToggle,
  onEdit,
  onDelete,
  onView,
}: {
  product:  Product
  selected: boolean
  onToggle: (id: string) => void
  onEdit:   (p: Product) => void
  onDelete: (p: Product) => void
  onView:   (p: Product) => void
}) {
  const t = useT()
  return (
    <tr className={cn(
      'border-b border-border-primary hover:bg-bg-tertiary/50 transition-colors group',
      selected && 'bg-accent-primary/5',
    )}>

      {/* Checkbox */}
      <td className="pl-4 pr-2 py-3 w-8">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggle(product.id)}
          className="w-3.5 h-3.5 rounded border-border-primary accent-accent-primary cursor-pointer"
        />
      </td>

      {/* Nom */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-bg-elevated border border-border-primary flex items-center justify-center shrink-0 overflow-hidden">
            {product.image ? (
              <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
            ) : product.isService
              ? <BarChart2 size={14} className="text-accent-primary" />
              : <Package size={14} className="text-text-muted" />
            }
          </div>
          <div className="min-w-0">
            <button
              onClick={() => onView(product)}
              className="text-sm font-medium text-text-primary hover:text-accent-primary transition-colors truncate block max-w-[220px] text-left"
            >
              {product.name}
            </button>
            {product.code && (
              <p className="text-xs text-text-muted font-mono">{product.code}</p>
            )}
          </div>
        </div>
      </td>

      {/* Tur */}
      <td className="px-4 py-3">
        <Badge variant={product.isService ? 'info' : 'default'} size="sm">
          {product.isService ? t('products.service') : t('products.productSingular')}
        </Badge>
      </td>

      {/* Kategoriya */}
      <td className="px-4 py-3">
        {product.category ? (
          <div className="flex items-center gap-1 text-sm text-text-secondary">
            <Tag size={12} className="text-text-muted" />
            {product.category}
          </div>
        ) : (
          <span className="text-text-muted text-sm">—</span>
        )}
      </td>

      {/* Qoldiq */}
      <td className="px-4 py-3 text-right">
        {!product.isService ? (
          <div>
            <span className={cn(
              'text-sm font-medium tabular-nums',
              product.isLow ? 'text-danger' : 'text-text-primary',
            )}>
              {product.totalStock ?? 0} {product.unit}
            </span>
            {product.isLow && (
              <div className="flex items-center justify-end gap-1 mt-0.5">
                <AlertTriangle size={10} className="text-danger" />
                <span className="text-[10px] text-danger">{t('products.lowStockBadge')}</span>
              </div>
            )}
          </div>
        ) : (
          <span className="text-text-muted text-sm">—</span>
        )}
      </td>

      {/* Narx */}
      <td className="px-4 py-3 text-right">
        <p className="text-sm font-medium text-text-primary tabular-nums">
          {formatCurrency(product.sellPrice)}
        </p>
        {product.buyPrice > 0 && (
          <p className="text-[11px] text-text-muted tabular-nums">
            {formatCurrency(product.buyPrice)} {t('products.cost')}
          </p>
        )}
      </td>

      {/* Amallar */}
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="xs" onClick={() => onView(product)}>
            <Eye size={13} />
          </Button>
          <Button variant="ghost" size="xs" onClick={() => onEdit(product)}>
            <Edit2 size={13} />
          </Button>
          <Button
            variant="ghost"
            size="xs"
            onClick={() => onDelete(product)}
            className="hover:text-danger hover:bg-danger/10"
          >
            <Trash2 size={13} />
          </Button>
        </div>
      </td>
    </tr>
  )
}

// ============================================
// FILTER TABS
// ============================================
const TYPE_TABS = [
  { id: 'ALL',      tKey: 'common.all',           label: 'Barchasi' },
  { id: 'goods',    tKey: 'products.goods',       label: 'Mahsulotlar',  isService: false },
  { id: 'services', tKey: 'products.services',    label: 'Xizmatlar',    isService: true  },
  { id: 'low',      tKey: 'products.lowStock',    label: 'Kam qoldiq' },
]

// ============================================
// ASOSIY SAHIFA
// ============================================
export default function ProductsListPage() {
  const navigate = useNavigate()
  const t = useT()

  // URL — source of truth for tab (so sidebar links work)
  const [searchParams, setSearchParams] = useSearchParams()
  const tabFromUrl = (() => {
    if (searchParams.get('service') === '1') return 'services'
    if (searchParams.get('low') === '1')     return 'low'
    const t = searchParams.get('tab')
    if (t && ['ALL', 'goods', 'services', 'low'].includes(t)) return t
    return 'ALL'
  })()
  const activeTab = tabFromUrl

  const [search,       setSearch]       = useState('')
  const [page,         setPage]         = useState(1)
  const [formOpen,     setFormOpen]     = useState(false)
  const [editProduct,  setEditProduct]  = useState<Product | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null)

  const debouncedSearch   = useDebounce(search, 400)
  const handleSearch      = (v: string) => { setSearch(v); setPage(1) }
  const handleTab         = (v: string) => {
    const next = new URLSearchParams(searchParams)
    next.delete('service'); next.delete('low'); next.delete('tab')
    if (v !== 'ALL') next.set('tab', v)
    setSearchParams(next, { replace: true })
    setPage(1)
  }
  const deleteMutation    = useDeleteProduct()
  const bulkDeleteMut     = useBulkDeleteProducts()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const query = {
    search:    debouncedSearch || undefined,
    isService: activeTab === 'goods' ? false : activeTab === 'services' ? true : undefined,
    isLow:     activeTab === 'low' ? true : undefined,
    page,
    limit:     50,
    sortBy:    'name',
    sortOrder: 'asc' as const,
  }

  const { data, isLoading } = useProducts(query)
  const { data: stats }     = useProductStats()

  const toggleSelect  = useCallback((id: string) => {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }, [])
  const selectAll   = useCallback(() => setSelectedIds(new Set(data?.data.map(p => p.id) ?? [])), [data])
  const clearSelect = useCallback(() => setSelectedIds(new Set()), [])

  const handleExport = async () => {
    try {
      const res = await productService.getAll({ search: debouncedSearch || undefined, limit: 10000 })
      const rows = (res.data ?? []).map((p: Product) => ({
        'Kod':              p.code,
        'Nomi':             p.name,
        'Kategoriya':       p.category ?? '',
        'O\'lchov':         p.unit,
        'Turi':             p.isService ? 'Xizmat' : 'Tovar',
        'Sotib olish narxi': Number(p.buyPrice),
        'Sotuv narxi':      Number(p.sellPrice),
        'Min. qoldiq':      p.minStock,
        'Shtrix-kod':       p.barcode ?? '',
        'Izoh':             p.description ?? '',
      }))
      const ws = XLSX.utils.json_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Mahsulotlar')
      XLSX.writeFile(wb, `bizzo-mahsulotlar-${new Date().toISOString().slice(0, 10)}.xlsx`)
    } catch {
      toast.error('Eksport muvaffaqiyatsiz')
    }
  }

  const handleEdit = useCallback((p: Product) => {
    setEditProduct(p)
    setFormOpen(true)
  }, [])

  const handleDelete = useCallback((p: Product) => {
    setDeleteTarget(p)
  }, [])

  const searchRef = useRef<HTMLInputElement>(null)
  useKeyboardShortcuts([
    { key: 'n', ctrl: true, handler: () => { setEditProduct(null); setFormOpen(true) } },
    { key: '/', skipInput: true, handler: () => searchRef.current?.focus() },
  ])

  const handleView = useCallback((p: Product) => {
    navigate(`/products/${p.id}`)
  }, [navigate])

  const handleCloseForm = () => {
    setFormOpen(false)
    setEditProduct(null)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    await deleteMutation.mutateAsync(deleteTarget.id)
    setDeleteTarget(null)
  }

  return (
    <div>
      <PageHeader
        title={t('nav.products')}
        description={t('products.description')}
        breadcrumbs={[
          { label: t('nav.dashboard'), path: '/dashboard' },
          { label: t('nav.products') },
        ]}
        actions={
          <>
            <Button variant="secondary" size="sm" leftIcon={<Download size={14} />} onClick={handleExport}>
              {t('common.export')}
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus size={14} />}
              onClick={() => setFormOpen(true)}
              title="Ctrl+N"
            >
              {t('products.newProduct')}
            </Button>
          </>
        }
      />

      {/* KPI kartalar */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <KPICard
          title={t('products.total')}
          value={stats?.total ?? '—'}
          icon={<Package size={18} />}
          iconColor="text-accent-primary"
          iconBg="bg-accent-primary/10"
          loading={!stats}
        />
        <KPICard
          title={t('products.goodsKpi')}
          value={stats?.goods ?? '—'}
          subtitle={`${stats?.services ?? 0} ${t('products.servicesCount')}`}
          icon={<Layers size={18} />}
          iconColor="text-info"
          iconBg="bg-info/10"
          loading={!stats}
        />
        <KPICard
          title={t('products.warehouseValue')}
          value={stats ? formatCurrency(stats.totalValue) : '—'}
          icon={<TrendingDown size={18} />}
          iconColor="text-success"
          iconBg="bg-success/10"
          loading={!stats}
        />
        <KPICard
          title={t('products.lowStock')}
          value={stats?.lowStock ?? '—'}
          subtitle={t('products.productsCount')}
          icon={<AlertTriangle size={18} />}
          iconColor={stats?.lowStock ? 'text-danger' : 'text-text-muted'}
          iconBg={stats?.lowStock ? 'bg-danger/10' : 'bg-bg-elevated'}
          loading={!stats}
        />
      </div>

      {/* Minimal qoldiq ogohlantirish kartasi */}
      {(stats?.lowStock ?? 0) > 0 && (
        <div className="mb-4 p-3 rounded-lg border border-danger/30 bg-danger/5 flex items-center gap-2">
          <AlertTriangle size={16} className="text-danger shrink-0" />
          <p className="text-sm text-danger">
            <span className="font-semibold">{stats!.lowStock} {t('products.productsCount')}</span>{' '}
            {t('products.lowStockWarning')}
          </p>
          <button
            onClick={() => handleTab('low')}
            className="ml-auto text-xs text-danger underline hover:no-underline"
          >
            {t('common.view')}
          </button>
        </div>
      )}

      {/* Jadval */}
      <Card padding="none">
        {/* Filtr */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 border-b border-border-primary">
          <Input
            ref={searchRef}
            placeholder={`${t('products.searchPlaceholder')} (/)`}
            leftIcon={<Search size={15} />}
            value={search}
            onChange={e => handleSearch(e.target.value)}
            className="sm:max-w-xs"
          />

          <div className="flex items-center gap-1">
            {TYPE_TABS.map(tab => {
              const active = activeTab === tab.id
              let count: number | undefined
              if (tab.id === 'ALL')      count = stats?.total
              if (tab.id === 'goods')    count = stats?.goods
              if (tab.id === 'services') count = stats?.services
              if (tab.id === 'low')      count = stats?.lowStock

              return (
                <button
                  key={tab.id}
                  onClick={() => handleTab(tab.id)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                    active
                      ? tab.id === 'low'
                        ? 'bg-danger/10 text-danger'
                        : 'bg-accent-primary/10 text-accent-primary'
                      : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary',
                  )}
                >
                  {t(tab.tKey)}
                  {count !== undefined && (
                    <span className={cn(
                      'px-1.5 py-0.5 rounded-full text-[10px] font-mono',
                      active
                        ? tab.id === 'low'
                          ? 'bg-danger/20 text-danger'
                          : 'bg-accent-primary/20 text-accent-primary'
                        : 'bg-bg-elevated text-text-muted',
                    )}>
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Bulk action bar */}
        <BulkActionBar
          selectedCount={selectedIds.size}
          totalCount={data?.data.length ?? 0}
          onSelectAll={selectAll}
          onClearAll={clearSelect}
          actions={[
            {
              label:   "O'chirish",
              icon:    <Trash2 size={13} />,
              variant: 'danger',
              loading: bulkDeleteMut.isPending,
              onClick: () => bulkDeleteMut.mutate([...selectedIds], { onSuccess: clearSelect }),
            },
          ]}
        />

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-primary">
                <th className="pl-4 pr-2 py-3 w-8">
                  <input
                    type="checkbox"
                    checked={!!data?.data.length && selectedIds.size === data.data.length}
                    onChange={() => selectedIds.size === data?.data.length ? clearSelect() : selectAll()}
                    className="w-3.5 h-3.5 rounded border-border-primary accent-accent-primary cursor-pointer"
                  />
                </th>
                {[
                  { key: 'product', label: t('products.colProduct'), align: 'left' },
                  { key: 'type', label: t('products.colType'), align: 'left' },
                  { key: 'category', label: t('products.colCategory'), align: 'left' },
                  { key: 'stock', label: t('products.colStock'), align: 'right' },
                  { key: 'price', label: t('products.colPrice'), align: 'right' },
                  { key: 'actions', label: '', align: 'right' },
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
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRowSkeleton key={i} cols={7} />
                ))
              ) : !data?.data.length ? (
                <tr>
                  <td colSpan={7}>
                    <EmptyState
                      icon={<Package size={28} />}
                      title={t('products.notFound')}
                      description={
                        search
                          ? t('products.searchEmpty', { query: search })
                          : t('products.addFirst')
                      }
                      action={
                        !search
                          ? { label: t('products.addProduct'), onClick: () => setFormOpen(true) }
                          : undefined
                      }
                    />
                  </td>
                </tr>
              ) : (
                data.data.map(p => (
                  <ProductRow
                    key={p.id}
                    product={p}
                    selected={selectedIds.has(p.id)}
                    onToggle={toggleSelect}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onView={handleView}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          page={page}
          totalPages={data?.meta.totalPages ?? 1}
          total={data?.meta.total}
          onPage={setPage}
        />
      </Card>

      <ProductFormModal
        open={formOpen}
        onClose={handleCloseForm}
        product={editProduct}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title={t('products.confirmDelete', { name: deleteTarget?.name || '' })}
        description={t('products.confirmDeleteDesc')}
        confirmText={t('common.delete')}
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
