import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Save } from 'lucide-react'
import { PageHeader }      from '@components/layout/PageHeader/PageHeader'
import { Card }            from '@components/ui/Card/Card'
import { Button }          from '@components/ui/Button/Button'
import { Input, Textarea } from '@components/ui/Input/Input'
import { Skeleton }        from '@components/ui/Skeleton/Skeleton'
import {
  useProduct,
  useCreateProduct,
  useUpdateProduct,
  useCategories,
} from '@features/products/hooks/useProducts'
import { useT }  from '@i18n/index'
import { cn }    from '@utils/cn'

// ============================================
// O'LCHOV BIRLIKLARI
// ============================================
const UNITS = [
  { value: 'dona',  label: 'Dona'  },
  { value: 'kg',    label: 'Kg'    },
  { value: 'g',     label: 'Gramm' },
  { value: 'litr',  label: 'Litr'  },
  { value: 'metr',  label: 'Metr'  },
  { value: 'm2',    label: 'M²'    },
  { value: 'm3',    label: 'M³'    },
  { value: 'quti',  label: 'Quti'  },
  { value: "to'p",  label: "To'p"  },
  { value: 'juft',  label: 'Juft'  },
]

// ============================================
// VALIDATSIYA
// ============================================
const schema = z.object({
  name:        z.string().min(2, 'Kamida 2 ta belgi').max(200, 'Juda uzun'),
  code:        z.string().max(50).optional().or(z.literal('')),
  barcode:     z.string().max(50).optional().or(z.literal('')),
  category:    z.string().max(100).optional().or(z.literal('')),
  unit:        z.string().default('dona'),
  description: z.string().max(500).optional().or(z.literal('')),
  buyPrice:    z.coerce.number().min(0, "Manfiy bo'lmaydi"),
  sellPrice:   z.coerce.number().min(0, "Manfiy bo'lmaydi"),
  minPrice:    z.coerce.number().min(0).optional(),
  minStock:    z.coerce.number().min(0).optional(),
  isService:   z.boolean().default(false),
})

type FormData = z.infer<typeof schema>

// ============================================
// SAHIFA
// ============================================
export default function ProductFormPage() {
  const { id }   = useParams<{ id: string }>()
  const navigate = useNavigate()
  const t        = useT()
  const isEdit   = !!id

  const { data: product, isLoading: isLoadingProduct } = useProduct(id ?? '')
  const { data: categories = [] } = useCategories()
  const create = useCreateProduct()
  const update = useUpdateProduct()

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver:      zodResolver(schema),
    defaultValues: {
      unit:      'dona',
      buyPrice:  0,
      sellPrice: 0,
      minPrice:  0,
      minStock:  0,
      isService: false,
    },
  })

  useEffect(() => {
    if (isEdit && product) {
      reset({
        name:        product.name,
        code:        product.code        ?? '',
        barcode:     product.barcode     ?? '',
        category:    product.category    ?? '',
        unit:        product.unit        ?? 'dona',
        description: product.description ?? '',
        buyPrice:    product.buyPrice    ?? 0,
        sellPrice:   product.sellPrice   ?? 0,
        minPrice:    product.minPrice    ?? 0,
        minStock:    product.minStock    ?? 0,
        isService:   product.isService   ?? false,
      })
    }
  }, [isEdit, product, reset])

  const onSubmit = async (data: FormData) => {
    const cleaned = Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, v === '' ? undefined : v]),
    ) as any

    if (isEdit && product) {
      await update.mutateAsync({ id: product.id, data: cleaned })
      navigate(`/products/${product.id}`)
    } else {
      const created = await create.mutateAsync(cleaned)
      navigate(`/products/${created.id}`)
    }
  }

  const isService   = watch('isService')
  const selectedUnit = watch('unit')
  const isBusy      = isSubmitting || create.isPending || update.isPending

  if (isEdit && isLoadingProduct) {
    return (
      <div>
        <Skeleton className="h-8 w-48 mb-6" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title={isEdit ? t('products.editProduct') : t('products.newProduct')}
        description={isEdit ? product?.name : ''}
        breadcrumbs={[
          { label: t('nav.dashboard'), path: '/dashboard' },
          { label: t('nav.products'), path: '/products'   },
          ...(isEdit && product ? [{ label: product.name, path: `/products/${product.id}` }] : []),
          { label: isEdit ? t('products.editProduct') : t('products.newProduct') },
        ]}
        actions={
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<ArrowLeft size={14} />}
            onClick={() => navigate(isEdit && product ? `/products/${product.id}` : '/products')}
          >
            {t('products.backToList')}
          </Button>
        }
      />

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* ---- ASOSIY FORMA ---- */}
          <div className="lg:col-span-2 space-y-4">
            <Card padding="md">
              <h3 className="text-sm font-semibold text-text-primary mb-4">
                {t('products.infoSection')}
              </h3>

              {/* Xizmat / Mahsulot toggle */}
              <div className="flex items-center gap-3 p-3 rounded-lg border border-border-primary bg-bg-tertiary mb-4">
                <button
                  type="button"
                  onClick={() => setValue('isService', false)}
                  className={cn(
                    'flex-1 py-2 rounded-md text-sm font-medium transition-all',
                    !isService
                      ? 'bg-bg-primary border border-border-secondary text-text-primary shadow-sm'
                      : 'text-text-muted hover:text-text-secondary',
                  )}
                >
                  {t('products.productSingular')}
                </button>
                <button
                  type="button"
                  onClick={() => setValue('isService', true)}
                  className={cn(
                    'flex-1 py-2 rounded-md text-sm font-medium transition-all',
                    isService
                      ? 'bg-bg-primary border border-border-secondary text-text-primary shadow-sm'
                      : 'text-text-muted hover:text-text-secondary',
                  )}
                >
                  {t('products.service')}
                </button>
              </div>

              {/* Nom */}
              <div className="mb-4">
                <Input
                  label={t('products.productName')}
                  placeholder="Masalan: Toshmatov sement"
                  error={errors.name?.message}
                  required
                  {...register('name')}
                />
              </div>

              {/* Kod va Barcode */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <Input
                  label={t('products.code')}
                  placeholder="SM-001"
                  hint="Ichki kod"
                  {...register('code')}
                />
                <Input
                  label={t('products.barcode')}
                  placeholder="8901234567890"
                  {...register('barcode')}
                />
              </div>

              {/* Kategoriya va Birlik */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-text-secondary">
                    {t('products.category')}
                  </label>
                  <input
                    list="categories-list"
                    placeholder="Sement, Qurilish..."
                    className="w-full px-3 py-2 rounded-lg border border-border-primary bg-bg-secondary text-sm text-text-primary placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-accent-primary focus:border-accent-primary transition-colors"
                    {...register('category')}
                  />
                  <datalist id="categories-list">
                    {categories.map(c => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-text-secondary">
                    {t('products.unitLabel')}
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {UNITS.map(u => (
                      <button
                        key={u.value}
                        type="button"
                        onClick={() => setValue('unit', u.value)}
                        className={cn(
                          'px-2.5 py-1 rounded-md text-xs font-medium border transition-all',
                          selectedUnit === u.value
                            ? 'bg-accent-primary/10 border-accent-primary text-accent-primary'
                            : 'border-border-primary text-text-secondary hover:border-border-secondary',
                        )}
                      >
                        {u.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Tavsif */}
              <Textarea
                label={t('products.description2')}
                placeholder="Mahsulot haqida qo'shimcha ma'lumot..."
                rows={3}
                {...register('description')}
              />
            </Card>
          </div>

          {/* ---- O'NG: Narxlar + Qoldiq + Tugmalar ---- */}
          <div className="space-y-4">

            {/* Narxlar */}
            <Card padding="md">
              <h3 className="text-sm font-semibold text-text-primary mb-4">
                {t('products.pricingSection')}
              </h3>
              <div className="space-y-3">
                <Input
                  label={t('products.purchasePrice')}
                  type="number"
                  placeholder="0"
                  hint="so'm"
                  error={errors.buyPrice?.message}
                  {...register('buyPrice')}
                />
                <Input
                  label={t('products.salePrice')}
                  type="number"
                  placeholder="0"
                  hint="so'm"
                  error={errors.sellPrice?.message}
                  {...register('sellPrice')}
                />
                <Input
                  label={t('products.minPrice')}
                  type="number"
                  placeholder="0"
                  hint="chegirma chegarasi"
                  {...register('minPrice')}
                />
              </div>
            </Card>

            {/* Minimal qoldiq (faqat mahsulot uchun) */}
            {!isService && (
              <Card padding="md">
                <h3 className="text-sm font-semibold text-text-primary mb-3">
                  {t('products.stockSection')}
                </h3>
                <Input
                  label={t('products.minStock')}
                  type="number"
                  placeholder="0"
                  hint={`${selectedUnit || 'dona'}. Bu miqdordan kam bo'lsa ogohlantirish`}
                  {...register('minStock')}
                />
              </Card>
            )}

            {/* Tugmalar */}
            <div className="flex flex-col gap-2">
              <Button
                variant="primary"
                size="md"
                loading={isBusy}
                leftIcon={<Save size={15} />}
                onClick={handleSubmit(onSubmit)}
                className="w-full"
              >
                {isEdit ? t('common.save') : t('products.createProduct')}
              </Button>
              <Button
                variant="secondary"
                size="md"
                disabled={isBusy}
                onClick={() => navigate(isEdit && product ? `/products/${product.id}` : '/products')}
                className="w-full"
              >
                {t('common.cancel')}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
