import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Modal }   from '@components/ui/Modal/Modal'
import { Button }  from '@components/ui/Button/Button'
import { Input }   from '@components/ui/Input/Input'
import { useCreateDeal } from '@features/sales-module/hooks/useSales'
import { useContacts }   from '@features/contacts/hooks/useContacts'
import { formatCurrency } from '@utils/formatters'
import { useT } from '@i18n/index'
import { cn } from '@utils/cn'

// ============================================
// CONSTANTS
// ============================================
const STAGE_PROBS = [
  { value: 'LEAD',        probKey: 'stageLead',        prob: 10 },
  { value: 'QUALIFIED',   probKey: 'stageQualified',   prob: 25 },
  { value: 'PROPOSAL',    probKey: 'stageProposal',    prob: 50 },
  { value: 'NEGOTIATION', probKey: 'stageNegotiation', prob: 75 },
] as const

const SOURCES = ['Instagram', 'Facebook', 'Sayt', 'Tavsiya', 'Telefon', 'Email', "Ko'rgazma", 'Boshqa']

interface DealItemForm {
  name:     string
  quantity: string
  unit:     string
  price:    string
  discount: string
}

// ============================================
// MODAL
// ============================================
export default function NewDealModal({
  open,
  onClose,
}: { open: boolean; onClose: () => void }) {
  const t = useT()
  const [title,     setTitle]     = useState('')
  const [contactId, setContactId] = useState('')
  const [stage,     setStage]     = useState('LEAD')
  const [amount,    setAmount]    = useState('')
  const [discount,  setDiscount]  = useState('0')
  const [closeDate, setCloseDate] = useState('')
  const [source,    setSource]    = useState('')
  const [notes,     setNotes]     = useState('')
  const [items,     setItems]     = useState<DealItemForm[]>([])

  const createDeal = useCreateDeal()
  const { data: contacts } = useContacts({ limit: 200 })

  const itemsTotal = items.reduce((sum, item) => {
    const qty  = parseFloat(item.quantity) || 0
    const pr   = parseFloat(item.price)    || 0
    const disc = parseFloat(item.discount) || 0
    return sum + qty * pr * (1 - disc / 100)
  }, 0)

  const dealAmount      = items.length > 0 ? itemsTotal : (parseFloat(amount) || 0)
  const discountPercent = parseFloat(discount) || 0
  const finalAmount     = dealAmount * (1 - discountPercent / 100)

  const addItem = () =>
    setItems(prev => [...prev, { name: '', quantity: '1', unit: 'dona', price: '', discount: '0' }])

  const removeItem = (i: number) =>
    setItems(prev => prev.filter((_, idx) => idx !== i))

  const updateItem = (i: number, field: keyof DealItemForm, value: string) =>
    setItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item))

  const reset = () => {
    setTitle(''); setContactId(''); setStage('LEAD')
    setAmount(''); setDiscount('0'); setCloseDate('')
    setSource(''); setNotes(''); setItems([])
  }

  const handleSubmit = async () => {
    if (!title || !contactId) return
    await createDeal.mutateAsync({
      title,
      contactId,
      stage:             stage as any,
      amount:            items.length > 0 ? itemsTotal : parseFloat(amount) || 0,
      discount:          discountPercent,
      expectedCloseDate: closeDate || undefined,
      source:            source    || undefined,
      notes:             notes     || undefined,
      items: items.length > 0 ? items.map(item => ({
        name:     item.name,
        quantity: parseFloat(item.quantity) || 1,
        unit:     item.unit,
        price:    parseFloat(item.price)    || 0,
        discount: parseFloat(item.discount) || 0,
      })) : undefined,
    } as any)
    reset()
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={() => { reset(); onClose() }}
      title={t('sales.newDeal')}
      description={t('sales.addDealDesc')}
      size="lg"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={() => { reset(); onClose() }}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="primary"
            size="sm"
            loading={createDeal.isPending}
            onClick={handleSubmit}
            disabled={!title || !contactId}
          >
            {t('common.create')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          label={`${t('sales.colName')} *`}
          placeholder="Masalan: 500 qop polipropilen yetkazib berish"
          value={title}
          onChange={e => setTitle(e.target.value)}
        />

        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1.5">
            {t('sales.colContact')} <span className="text-danger">*</span>
          </label>
          <select
            value={contactId}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setContactId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border-primary bg-bg-secondary text-sm text-text-primary focus:outline-none focus:border-accent-primary transition-colors"
          >
            <option value="">{t('sales.selectContact')}</option>
            {contacts?.data?.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1.5">
            {t('sales.stageLabel')}
          </label>
          <div className="grid grid-cols-4 gap-2">
            {STAGE_PROBS.map(s => (
              <button
                key={s.value}
                type="button"
                onClick={() => setStage(s.value)}
                className={cn(
                  'py-2 rounded-lg text-xs font-medium border transition-all text-center',
                  stage === s.value
                    ? 'border-accent-primary bg-accent-primary/10 text-accent-primary'
                    : 'border-border-primary text-text-secondary hover:border-border-secondary',
                )}
              >
                <div>{t(`sales.${s.probKey}`)}</div>
                <div className="text-[10px] opacity-70">{s.prob}%</div>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-text-secondary">
              {t('sales.productsServices')}
            </label>
            <Button variant="ghost" size="xs" leftIcon={<Plus size={12} />} onClick={addItem}>
              {t('sales.addItem')}
            </Button>
          </div>

          {items.length === 0 ? (
            <div className="grid grid-cols-2 gap-3">
              <Input
                label={t('sales.amountLabel')}
                type="number"
                placeholder="0"
                value={amount}
                onChange={e => setAmount(e.target.value)}
              />
              <Input
                label={t('sales.discountLabel')}
                type="number"
                placeholder="0"
                value={discount}
                onChange={e => setDiscount(e.target.value)}
              />
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item, i) => (
                <div
                  key={i}
                  className="flex gap-2 items-start p-2 rounded-lg bg-bg-tertiary border border-border-primary"
                >
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <input
                      placeholder={t('sales.productName')}
                      value={item.name}
                      onChange={e => updateItem(i, 'name', e.target.value)}
                      className="h-7 col-span-2 rounded-md text-xs bg-bg-secondary text-text-primary border border-border-primary px-2 focus:outline-none focus:border-accent-primary"
                    />
                    <div className="flex gap-1">
                      <input
                        type="number"
                        placeholder={t('sales.quantityPlaceholder')}
                        value={item.quantity}
                        onChange={e => updateItem(i, 'quantity', e.target.value)}
                        className="h-7 w-14 rounded-md text-xs bg-bg-secondary text-text-primary border border-border-primary px-2 focus:outline-none focus:border-accent-primary"
                      />
                      <input
                        placeholder={t('sales.unitPlaceholder')}
                        value={item.unit}
                        onChange={e => updateItem(i, 'unit', e.target.value)}
                        className="h-7 w-16 rounded-md text-xs bg-bg-secondary text-text-primary border border-border-primary px-2 focus:outline-none focus:border-accent-primary"
                      />
                    </div>
                    <input
                      type="number"
                      placeholder={t('sales.pricePlaceholder')}
                      value={item.price}
                      onChange={e => updateItem(i, 'price', e.target.value)}
                      className="h-7 rounded-md text-xs bg-bg-secondary text-text-primary border border-border-primary px-2 focus:outline-none focus:border-accent-primary"
                    />
                  </div>
                  <button
                    onClick={() => removeItem(i)}
                    className="p-1.5 rounded-md text-text-muted hover:text-danger hover:bg-danger/10 transition-colors mt-0.5"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {finalAmount > 0 && (
          <div className="p-3 rounded-lg bg-success/5 border border-success/20 flex justify-between items-center">
            <span className="text-sm text-text-secondary">
              {discountPercent > 0
                ? t('sales.totalWithDiscount', { discount: discountPercent })
                : t('sales.totalLabel')}
            </span>
            <span className="text-base font-bold tabular-nums text-success">
              {formatCurrency(finalAmount)}
            </span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Input
            label={t('sales.closeDate')}
            type="date"
            value={closeDate}
            onChange={e => setCloseDate(e.target.value)}
          />
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              {t('sales.sourceLabel')}
            </label>
            <select
              value={source}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSource(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border-primary bg-bg-secondary text-sm text-text-primary focus:outline-none focus:border-accent-primary transition-colors"
            >
              <option value="">{t('sales.selectSource')}</option>
              {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <Input
          label={t('sales.notesOptional')}
          placeholder="Qo'shimcha ma'lumot..."
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />
      </div>
    </Modal>
  )
}
