import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal } from '@components/ui/Modal/Modal'
import { Button } from '@components/ui/Button/Button'
import { Input, Textarea } from '@components/ui/Input/Input'
import { ImageUpload } from '@components/ui/ImageUpload/ImageUpload'
import { cn } from '@utils/cn'
import type { Product } from '@services/product.service'
import { useCreateProduct, useUpdateProduct, useCategories } from '../hooks/useProducts'
import { useWarehouses } from '@features/warehouse/hooks/useWarehouse'
import { useT } from '@i18n/index'

// ============================================
// O'LCHOV BIRLIKLARI
// ============================================
const UNITS = [
  { value: 'dona',  label: 'Dona' },
  { value: 'kg',    label: 'Kg' },
  { value: 'g',     label: 'Gramm' },
  { value: 'litr',  label: 'Litr' },
  { value: 'metr',  label: 'Metr' },
  { value: 'm2',    label: 'M²' },
  { value: 'm3',    label: 'M³' },
  { value: 'quti',  label: 'Quti' },
  { value: 'to\'p', label: "To'p" },
  { value: 'juft',  label: 'Juft' },
]

// ============================================
// VALIDATSIYA
// ============================================
const schema = z.object({
  name:               z.string().min(2, 'Kamida 2 ta belgi').max(200, 'Juda uzun'),
  code:               z.string().max(50).optional().or(z.literal('')),
  barcode:            z.string().max(50).optional().or(z.literal('')),
  category:           z.string().max(100).optional().or(z.literal('')),
  unit:               z.string().default('dona'),
  description:        z.string().max(500).optional().or(z.literal('')),
  buyPrice:           z.coerce.number().min(0, 'Manfiy bo\'lmaydi'),
  sellPrice:          z.coerce.number().min(0, 'Manfiy bo\'lmaydi'),
  wholesalePrice:     z.coerce.number().min(0).optional().nullable(),
  vipPrice:           z.coerce.number().min(0).optional().nullable(),
  minPrice:           z.coerce.number().min(0).optional(),
  minStock:           z.coerce.number().min(0).optional(),
  isService:          z.boolean().default(false),
  image:              z.string().optional().nullable(),
  openingStock:       z.coerce.number().min(0).optional(),
  openingWarehouseId: z.string().optional(),
}).refine(
  data => !(Number(data.openingStock) > 0 && !data.openingWarehouseId),
  { message: 'Ombor tanlanishi shart', path: ['openingWarehouseId'] },
)

type FormData = z.infer<typeof schema>

// ============================================
// PROPS
// ============================================
interface ProductFormModalProps {
  open:      boolean
  onClose:   () => void
  product?:  Product | null
}

// ============================================
// MODAL
// ============================================
export function ProductFormModal({ open, onClose, product }: ProductFormModalProps) {
  const t = useT()
  const isEdit  = !!product
  const create  = useCreateProduct()
  const update  = useUpdateProduct()
  const { data: categories = [] } = useCategories()
  const { data: warehouses = [] } = useWarehouses()

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
      unit:               'dona',
      buyPrice:           0,
      sellPrice:          0,
      wholesalePrice:     null,
      vipPrice:           null,
      minPrice:           0,
      minStock:           0,
      isService:          false,
      image:              null,
      openingStock:       0,
      openingWarehouseId: '',
    },
  })

  useEffect(() => {
    if (open) {
      if (product) {
        reset({
          name:           product.name,
          code:           product.code           ?? '',
          barcode:        product.barcode        ?? '',
          category:       product.category       ?? '',
          unit:           product.unit           ?? 'dona',
          description:    product.description    ?? '',
          buyPrice:       product.buyPrice       ?? 0,
          sellPrice:      product.sellPrice      ?? 0,
          wholesalePrice: (product as any).wholesalePrice ?? null,
          vipPrice:       (product as any).vipPrice       ?? null,
          minPrice:       product.minPrice       ?? 0,
          minStock:       product.minStock       ?? 0,
          isService:      product.isService      ?? false,
          image:          product.image          ?? null,
        })
      } else {
        reset({
          unit:           'dona',
          buyPrice:       0,
          sellPrice:      0,
          wholesalePrice: null,
          vipPrice:       null,
          minPrice:       0,
          minStock:       0,
          isService:      false,
          image:          null,
        })
      }
    }
  }, [open, product, reset])

  const onSubmit = async (data: FormData) => {
    if (!isEdit && Number(data.openingStock) > 0 && !data.openingWarehouseId) {
      setValue('openingWarehouseId', '', { shouldValidate: true })
      return
    }

    const cleaned = Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, v === '' ? undefined : v]),
    ) as any

    if (isEdit) {
      await update.mutateAsync({ id: product!.id, data: cleaned })
    } else {
      await create.mutateAsync(cleaned)
    }
    onClose()
  }

  const isService    = watch('isService')
  const selectedUnit = watch('unit')
  const openingStock = watch('openingStock')
  const isBusy       = isSubmitting || create.isPending || update.isPending

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? t('products.editProduct') : t('products.newProduct')}
      description={isEdit ? product?.name : "Mahsulot yoki xizmat qo'shing"}
      size="lg"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={isBusy}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="primary"
            size="sm"
            loading={isBusy}
            onClick={handleSubmit(onSubmit)}
          >
            {isEdit ? t('common.save') : t('common.create')}
          </Button>
        </>
      }
    >
      <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>

        {/* Xizmat / Mahsulot toggle */}
        <div className="flex items-center gap-3 p-3 rounded-lg border border-border-primary bg-bg-tertiary">
          <button
            type="button"
            onClick={() => setValue('isService', false, { shouldValidate: true })}
            className={cn(
              'flex-1 py-2 rounded-md text-sm font-medium transition-all',
              !isService
                ? 'bg-bg-primary border border-border-secondary text-text-primary shadow-sm'
                : 'text-text-muted hover:text-text-secondary',
            )}
          >
            Mahsulot
          </button>
          <button
            type="button"
            onClick={() => setValue('isService', true, { shouldValidate: true })}
            className={cn(
              'flex-1 py-2 rounded-md text-sm font-medium transition-all',
              isService
                ? 'bg-bg-primary border border-border-secondary text-text-primary shadow-sm'
                : 'text-text-muted hover:text-text-secondary',
            )}
          >
            Xizmat
          </button>
        </div>

        {/* Rasm + Nom */}
        <div className="grid grid-cols-[auto_1fr] gap-4 items-start">
          <ImageUpload
            value={watch('image')}
            onChange={url => setValue('image', url)}
            size="md"
            label="Rasm"
            hint="5 MB gacha"
          />
          <Input
            label={t('products.productName')}
            placeholder="Masalan: Toshmatov sement"
            error={errors.name?.message}
            required
            {...register('name')}
          />
        </div>

        {/* Kod va Barcode */}
        <div className="grid grid-cols-2 gap-4">
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
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-secondary">
              Kategoriya
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

          {/* O'lchov birligi */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-secondary">
              O'lchov birligi
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

        {/* Narxlar */}
        <div className="pt-2 border-t border-border-primary space-y-3">
          <div className="grid grid-cols-3 gap-3">
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
              hint="chakana"
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
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Ulgurji narx"
              type="number"
              placeholder="0"
              hint="Ulgurji mijozlar uchun"
              {...register('wholesalePrice')}
            />
            <Input
              label="VIP narx"
              type="number"
              placeholder="0"
              hint="VIP mijozlar uchun"
              {...register('vipPrice')}
            />
          </div>
        </div>

        {/* Minimal qoldiq (faqat mahsulot uchun) */}
        {!isService && (
          <Input
            label={t('products.minStock')}
            type="number"
            placeholder="0"
            hint={`${selectedUnit || 'dona'}. Bu miqdordan kam bo'lsa ogohlantirish`}
            {...register('minStock')}
          />
        )}

        {/* Boshlang'ich qoldiq — faqat yangi mahsulot uchun */}
        {!isEdit && !isService && (
          <div className="pt-2 border-t border-border-primary space-y-3">
            <p className="text-sm font-semibold text-text-primary">Boshlang'ich qoldiq</p>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label={`Miqdor (${selectedUnit || 'dona'})`}
                type="number"
                placeholder="0"
                hint="0 bo'lsa kiritilmaydi"
                {...register('openingStock')}
              />
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-secondary">
                  Ombor
                  {Number(openingStock) > 0 && (
                    <span className="text-danger ml-0.5">*</span>
                  )}
                </label>
                <select
                  className={cn(
                    'w-full px-3 py-2 rounded-lg border bg-bg-secondary text-sm text-text-primary',
                    'focus:outline-none focus:ring-1 focus:ring-accent-primary focus:border-accent-primary transition-colors',
                    errors.openingWarehouseId
                      ? 'border-danger'
                      : 'border-border-primary',
                  )}
                  {...register('openingWarehouseId')}
                >
                  <option value="">— Tanlang —</option>
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
                {errors.openingWarehouseId && (
                  <p className="text-xs text-danger">{errors.openingWarehouseId.message}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tavsif */}
        <Textarea
          label={t('products.description2')}
          placeholder="Mahsulot haqida qo'shimcha ma'lumot..."
          rows={2}
          {...register('description')}
        />
      </form>
    </Modal>
  )
}
