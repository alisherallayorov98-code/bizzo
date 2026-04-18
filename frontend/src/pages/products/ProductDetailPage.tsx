import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Edit2, Package, BarChart2,
  Tag, Hash, AlertTriangle, CheckCircle,
  Layers, Info,
} from 'lucide-react'
import { PageHeader }       from '@components/layout/PageHeader/PageHeader'
import { Card }             from '@components/ui/Card/Card'
import { Badge }            from '@components/ui/Badge/Badge'
import { Button }           from '@components/ui/Button/Button'
import { Skeleton }         from '@components/ui/Skeleton/Skeleton'
import { ProductFormModal } from '@features/products/components/ProductFormModal'
import { useProduct }       from '@features/products/hooks/useProducts'
import { useT }             from '@i18n/index'
import { formatCurrency }   from '@utils/formatters'
import { cn }               from '@utils/cn'

// ============================================
// HELPER: NARX QATORI
// ============================================
function PriceRow({
  label,
  value,
  highlight,
  muted,
}: {
  label:      string
  value:      number
  highlight?: 'success' | 'warning' | 'danger'
  muted?:     boolean
}) {
  const colorMap = {
    success: 'text-success',
    warning: 'text-warning',
    danger:  'text-danger',
  }
  return (
    <div className="flex justify-between items-center py-2 border-b border-border-primary/50 last:border-0">
      <span className="text-sm text-text-secondary">{label}</span>
      <span className={cn(
        'text-sm font-semibold tabular-nums',
        highlight ? colorMap[highlight] : muted ? 'text-text-muted' : 'text-text-primary',
      )}>
        {formatCurrency(value)}
      </span>
    </div>
  )
}

// ============================================
// ASOSIY SAHIFA
// ============================================
export default function ProductDetailPage() {
  const { id }    = useParams<{ id: string }>()
  const navigate  = useNavigate()
  const t         = useT()
  const [editOpen, setEditOpen] = useState(false)

  const { data: product, isLoading, isError } = useProduct(id!)

  if (isLoading) {
    return (
      <div>
        <div className="mb-6">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-48 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
          </div>
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    )
  }

  if (isError || !product) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Package size={40} className="text-text-muted mb-3" />
        <p className="text-text-primary font-medium">{t('products.notFoundById')}</p>
        <Button
          variant="secondary"
          size="sm"
          className="mt-4"
          onClick={() => navigate('/products')}
          leftIcon={<ArrowLeft size={14} />}
        >
          {t('products.backToList')}
        </Button>
      </div>
    )
  }

  const margin    = product.buyPrice > 0 ? product.sellPrice - product.buyPrice : 0
  const marginPct = product.buyPrice > 0
    ? Math.round(((product.sellPrice - product.buyPrice) / product.buyPrice) * 100)
    : 0
  const stock     = product.totalStock ?? 0
  const isLow     = product.isLow ?? (stock < product.minStock && !product.isService)

  return (
    <div>
      <PageHeader
        title={product.name}
        description={
          product.isService
            ? t('products.service')
            : product.category ?? t('products.productSingular')
        }
        breadcrumbs={[
          { label: t('nav.dashboard'), path: '/dashboard' },
          { label: t('nav.products'), path: '/products'   },
          { label: product.name },
        ]}
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<ArrowLeft size={14} />}
              onClick={() => navigate('/products')}
            >
              {t('products.backToList')}
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Edit2 size={14} />}
              onClick={() => setEditOpen(true)}
            >
              {t('products.editProduct')}
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* ---- CHAP: Asosiy info + narxlar ---- */}
        <div className="lg:col-span-2 space-y-4">

          {/* Asosiy ma'lumotlar */}
          <Card padding="md">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-12 h-12 rounded-xl bg-bg-elevated border border-border-primary flex items-center justify-center shrink-0">
                {product.isService
                  ? <BarChart2 size={20} className="text-accent-primary" />
                  : <Package   size={20} className="text-text-muted" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-semibold text-text-primary truncate">
                  {product.name}
                </h2>
                <div className="flex items-center flex-wrap gap-2 mt-1">
                  <Badge variant={product.isService ? 'info' : 'default'} size="sm">
                    {product.isService ? t('products.service') : t('products.productSingular')}
                  </Badge>
                  {product.category && (
                    <span className="flex items-center gap-1 text-xs text-text-muted">
                      <Tag size={11} /> {product.category}
                    </span>
                  )}
                  {isLow && !product.isService && (
                    <Badge variant="danger" size="sm">
                      <AlertTriangle size={10} className="mr-1" />
                      {t('products.lowStockBadge')}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">
              {t('products.infoSection')}
            </h3>
            <div className="space-y-0">
              {product.code && (
                <div className="flex items-center gap-3 py-2.5 border-b border-border-primary/50">
                  <Hash size={14} className="text-text-muted" />
                  <span className="text-xs text-text-muted w-24">{t('products.code')}</span>
                  <span className="text-sm text-text-primary font-mono">{product.code}</span>
                </div>
              )}
              {product.barcode && (
                <div className="flex items-center gap-3 py-2.5 border-b border-border-primary/50">
                  <Hash size={14} className="text-text-muted" />
                  <span className="text-xs text-text-muted w-24">{t('products.barcode')}</span>
                  <span className="text-sm text-text-primary font-mono">{product.barcode}</span>
                </div>
              )}
              <div className="flex items-center gap-3 py-2.5 border-b border-border-primary/50">
                <Layers size={14} className="text-text-muted" />
                <span className="text-xs text-text-muted w-24">{t('products.unitLabel')}</span>
                <span className="text-sm text-text-primary">{product.unit}</span>
              </div>
              {product.description && (
                <div className="flex items-start gap-3 py-2.5">
                  <Info size={14} className="text-text-muted mt-0.5" />
                  <div>
                    <span className="text-xs text-text-muted block mb-0.5">{t('products.description2')}</span>
                    <span className="text-sm text-text-secondary">{product.description}</span>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Narxlar */}
          <Card padding="md">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">
              {t('products.pricingSection')}
            </h3>
            <PriceRow label={t('products.purchasePrice')} value={product.buyPrice}  muted />
            <PriceRow label={t('products.salePrice')}     value={product.sellPrice} highlight="success" />
            {product.minPrice > 0 && (
              <PriceRow label={t('products.minPrice')} value={product.minPrice} highlight="warning" />
            )}

            {/* Marja */}
            {product.buyPrice > 0 && (
              <div className="mt-3 pt-3 border-t border-border-primary flex items-center justify-between">
                <span className="text-sm text-text-secondary">{t('products.margin')}</span>
                <div className="text-right">
                  <p className="text-sm font-bold text-success tabular-nums">
                    +{formatCurrency(margin)}
                  </p>
                  <p className="text-xs text-text-muted">{marginPct}%</p>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* ---- O'NG: Qoldiq holati ---- */}
        <div className="space-y-4">
          {!product.isService && (
            <Card padding="md">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">
                {t('products.stockSection')}
              </h3>

              {/* Joriy qoldiq */}
              <div className={cn(
                'p-4 rounded-xl border text-center mb-3',
                isLow
                  ? 'bg-danger/5 border-danger/30'
                  : 'bg-success/5 border-success/30',
              )}>
                <p className={cn(
                  'text-3xl font-bold tabular-nums mb-1',
                  isLow ? 'text-danger' : 'text-success',
                )}>
                  {stock}
                </p>
                <p className="text-xs text-text-muted">{product.unit}</p>
                <div className="flex items-center justify-center gap-1 mt-2">
                  {isLow ? (
                    <AlertTriangle size={13} className="text-danger" />
                  ) : (
                    <CheckCircle size={13} className="text-success" />
                  )}
                  <span className={cn(
                    'text-xs font-medium',
                    isLow ? 'text-danger' : 'text-success',
                  )}>
                    {isLow ? t('products.lowStockStatus') : t('products.okStatus')}
                  </span>
                </div>
              </div>

              {/* Minimal qoldiq */}
              <div className="flex justify-between items-center py-2">
                <span className="text-xs text-text-muted">{t('products.minStockLabel')}</span>
                <span className="text-sm font-medium text-text-secondary tabular-nums">
                  {product.minStock} {product.unit}
                </span>
              </div>

              {/* Progress */}
              {product.minStock > 0 && (
                <div className="mt-1">
                  <div className="w-full bg-bg-elevated rounded-full h-1.5 overflow-hidden">
                    <div
                      className={cn(
                        'h-1.5 rounded-full transition-all',
                        isLow ? 'bg-danger' : 'bg-success',
                      )}
                      style={{
                        width: `${Math.min(100, Math.round((stock / (product.minStock * 2)) * 100))}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </Card>
          )}

          {product.isService && (
            <Card padding="md">
              <div className="text-center py-4">
                <BarChart2 size={28} className="text-accent-primary mx-auto mb-2" />
                <p className="text-sm text-text-muted">Xizmatlar uchun qoldiq hisoblanmaydi</p>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Edit modal */}
      <ProductFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        product={product}
      />
    </div>
  )
}
