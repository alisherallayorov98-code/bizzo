import { useState } from 'react'
import { User, Building2, Scale } from 'lucide-react'
import { Modal }    from '@components/ui/Modal/Modal'
import { Input }    from '@components/ui/Input/Input'
import { Button }   from '@components/ui/Button/Button'
import { useCreateBatch, useQualityTypes } from '@features/waste-module/hooks/useWaste'
import { formatCurrency } from '@utils/formatters'
import { useT } from '@i18n/index'
import { cn } from '@utils/cn'

type SourceType = 'CITIZEN' | 'SUPPLIER'

interface Form {
  sourceType:    SourceType
  qualityTypeId: string
  inputWeight:   string
  pricePerKg:    string
  citizenName:   string
  citizenPhone:  string
  contactId:     string
  invoiceNumber: string
  notes:         string
}

const INIT: Form = {
  sourceType:    'CITIZEN',
  qualityTypeId: '',
  inputWeight:   '',
  pricePerKg:    '',
  citizenName:   '',
  citizenPhone:  '',
  contactId:     '',
  invoiceNumber: '',
  notes:         '',
}

export default function NewBatchModal({
  open,
  onClose,
}: {
  open:    boolean
  onClose: () => void
}) {
  const t = useT()
  const [form, setForm] = useState<Form>(INIT)
  const set = (key: keyof Form, val: string) =>
    setForm(f => ({ ...f, [key]: val }))

  const { data: qualityTypes } = useQualityTypes()
  const create = useCreateBatch()

  const totalCost =
    (parseFloat(form.inputWeight) || 0) * (parseFloat(form.pricePerKg) || 0)

  const handleQualityChange = (id: string) => {
    set('qualityTypeId', id)
    const qt = qualityTypes?.find(q => q.id === id)
    if (qt && !form.pricePerKg) {
      set('pricePerKg', String(qt.buyPricePerKg))
    }
  }

  const handleSubmit = async () => {
    const payload: any = {
      qualityTypeId: form.qualityTypeId,
      inputWeight:   parseFloat(form.inputWeight),
      pricePerKg:    parseFloat(form.pricePerKg),
      sourceType:    form.sourceType,
    }

    if (form.sourceType === 'CITIZEN') {
      payload.citizenName  = form.citizenName
      payload.citizenPhone = form.citizenPhone || undefined
    } else {
      payload.contactId     = form.contactId     || undefined
      payload.invoiceNumber = form.invoiceNumber || undefined
    }

    if (form.notes) payload.notes = form.notes

    await create.mutateAsync(payload)
    setForm(INIT)
    onClose()
  }

  const isValid =
    form.qualityTypeId &&
    parseFloat(form.inputWeight) > 0 &&
    parseFloat(form.pricePerKg) > 0 &&
    (form.sourceType === 'CITIZEN' ? !!form.citizenName : true)

  const SOURCE_TYPES = [
    { type: 'CITIZEN'  as SourceType, labelKey: 'waste.citizen',  icon: User },
    { type: 'SUPPLIER' as SourceType, labelKey: 'waste.supplier', icon: Building2 },
  ]

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('waste.newBatchTitle')}
      description={t('waste.newBatchDesc')}
      size="md"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="primary"
            size="sm"
            loading={create.isPending}
            disabled={!isValid}
            onClick={handleSubmit}
          >
            {t('waste.receiveBtn')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
            {t('waste.sourceTypeLabel')}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {SOURCE_TYPES.map(({ type, labelKey, icon: Icon }) => (
              <button
                key={type}
                type="button"
                onClick={() => set('sourceType', type)}
                className={cn(
                  'flex items-center gap-2.5 p-3 rounded-xl border-2 transition-all text-left',
                  form.sourceType === type
                    ? 'border-accent-primary bg-accent-primary/10'
                    : 'border-border-primary hover:border-border-secondary bg-bg-secondary',
                )}
              >
                <div className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                  form.sourceType === type
                    ? 'bg-accent-primary/20 text-accent-primary'
                    : 'bg-bg-tertiary text-text-muted',
                )}>
                  <Icon size={16} />
                </div>
                <span className={cn(
                  'text-sm font-medium',
                  form.sourceType === type ? 'text-accent-primary' : 'text-text-secondary',
                )}>
                  {t(labelKey)}
                </span>
              </button>
            ))}
          </div>
        </div>

        {form.sourceType === 'CITIZEN' && (
          <div className="grid grid-cols-2 gap-3">
            <Input
              label={t('waste.citizenNameLabel')}
              placeholder={t('waste.citizenNamePh')}
              value={form.citizenName}
              onChange={e => set('citizenName', e.target.value)}
            />
            <Input
              label={t('common.phone')}
              placeholder="+998 90 123 45 67"
              value={form.citizenPhone}
              onChange={e => set('citizenPhone', e.target.value)}
            />
          </div>
        )}

        {form.sourceType === 'SUPPLIER' && (
          <div className="grid grid-cols-2 gap-3">
            <Input
              label={t('waste.invoiceNumberLabel')}
              placeholder="INV-2024-001"
              value={form.invoiceNumber}
              onChange={e => set('invoiceNumber', e.target.value)}
            />
            <Input
              label={t('waste.contactIdOptional')}
              placeholder={t('waste.supplier')}
              value={form.contactId}
              onChange={e => set('contactId', e.target.value)}
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1.5">
            {t('waste.qualityTypeLabel')}
          </label>
          <select
            value={form.qualityTypeId}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleQualityChange(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border-primary bg-bg-secondary text-sm text-text-primary focus:outline-none focus:border-accent-primary transition-colors"
          >
            <option value="">{t('waste.selectQuality')}</option>
            {qualityTypes?.map(qt => (
              <option key={qt.id} value={qt.id}>
                {qt.name} — {t('waste.expectedLossRange', { min: qt.expectedLossMin, max: qt.expectedLossMax })}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label={t('waste.inputWeightLabel')}
            type="number"
            placeholder="0.00"
            leftIcon={<Scale size={14} />}
            value={form.inputWeight}
            onChange={e => set('inputWeight', e.target.value)}
          />
          <Input
            label={t('waste.pricePerKgLabel')}
            type="number"
            placeholder="0"
            value={form.pricePerKg}
            onChange={e => set('pricePerKg', e.target.value)}
          />
        </div>

        {totalCost > 0 && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-success/5 border border-success/20">
            <span className="text-sm text-text-secondary">{t('waste.totalCostLabel')}:</span>
            <span className="text-sm font-bold tabular-nums text-success">
              {formatCurrency(totalCost)}
            </span>
          </div>
        )}

        <Input
          label={t('sales.notesOptional')}
          placeholder="Qo'shimcha ma'lumot..."
          value={form.notes}
          onChange={e => set('notes', e.target.value)}
        />
      </div>
    </Modal>
  )
}
