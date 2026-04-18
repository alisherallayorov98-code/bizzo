import { useState, useEffect } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Modal }   from '@components/ui/Modal/Modal'
import { Button }  from '@components/ui/Button/Button'
import { Input }   from '@components/ui/Input/Input'
import { useUpdateDeal } from '@features/sales-module/hooks/useSales'
import { useContacts }   from '@features/contacts/hooks/useContacts'
import { useQuery }      from '@tanstack/react-query'
import { settingsService } from '@services/settings.service'
import { formatCurrency }  from '@utils/formatters'
import { cn }  from '@utils/cn'
import type { DealDetail } from '@services/sales.service'

const STAGE_PROBS = [
  { value: 'LEAD',        label: 'Lead',       prob: 10 },
  { value: 'QUALIFIED',   label: 'Tekshirildi', prob: 25 },
  { value: 'PROPOSAL',    label: 'Taklif',     prob: 50 },
  { value: 'NEGOTIATION', label: 'Muzokara',   prob: 75 },
] as const

const SOURCES = ['Instagram', 'Facebook', 'Sayt', 'Tavsiya', 'Telefon', 'Email', "Ko'rgazma", 'Boshqa']

interface ItemForm {
  name: string; quantity: string; unit: string; price: string; discount: string
}

export default function EditDealModal({
  deal, open, onClose,
}: { deal: DealDetail; open: boolean; onClose: () => void }) {
  const updateDeal = useUpdateDeal()
  const { data: contacts } = useContacts({ limit: 200 })
  const { data: users }    = useQuery({
    queryKey: ['settings', 'users'],
    queryFn:  settingsService.getUsers,
    staleTime: 60_000,
  })

  const [title,       setTitle]       = useState(deal.title)
  const [contactId,   setContactId]   = useState(deal.contactId)
  const [stage,       setStage]       = useState(deal.stage)
  const [amount,      setAmount]      = useState(String(deal.amount || ''))
  const [discount,    setDiscount]    = useState(String(deal.discount || 0))
  const [closeDate,   setCloseDate]   = useState(
    deal.expectedCloseDate ? deal.expectedCloseDate.slice(0, 10) : ''
  )
  const [source,      setSource]      = useState(deal.source ?? '')
  const [notes,       setNotes]       = useState(deal.notes ?? '')
  const [assignedToId, setAssignedToId] = useState(deal.assignedToId ?? '')
  const [items, setItems] = useState<ItemForm[]>(
    deal.items?.length
      ? deal.items.map(i => ({
          name: i.name, quantity: String(i.quantity),
          unit: i.unit, price: String(i.price), discount: String(i.discount),
        }))
      : []
  )

  // Sync when deal changes (re-open)
  useEffect(() => {
    setTitle(deal.title)
    setContactId(deal.contactId)
    setStage(deal.stage)
    setAmount(String(deal.amount || ''))
    setDiscount(String(deal.discount || 0))
    setCloseDate(deal.expectedCloseDate ? deal.expectedCloseDate.slice(0, 10) : '')
    setSource(deal.source ?? '')
    setNotes(deal.notes ?? '')
    setAssignedToId(deal.assignedToId ?? '')
    setItems(deal.items?.length
      ? deal.items.map(i => ({
          name: i.name, quantity: String(i.quantity),
          unit: i.unit, price: String(i.price), discount: String(i.discount),
        }))
      : [])
  }, [deal.id])

  const itemsTotal = items.reduce((sum, item) => {
    return sum + (parseFloat(item.quantity)||0) * (parseFloat(item.price)||0) * (1 - (parseFloat(item.discount)||0) / 100)
  }, 0)

  const dealAmount   = items.length > 0 ? itemsTotal : (parseFloat(amount) || 0)
  const discPct      = parseFloat(discount) || 0
  const finalAmount  = dealAmount * (1 - discPct / 100)

  const addItem    = () => setItems(p => [...p, { name: '', quantity: '1', unit: 'dona', price: '', discount: '0' }])
  const removeItem = (i: number) => setItems(p => p.filter((_, idx) => idx !== i))
  const updateItem = (i: number, f: keyof ItemForm, v: string) =>
    setItems(p => p.map((row, idx) => idx === i ? { ...row, [f]: v } : row))

  function handleSave() {
    if (!title || !contactId) return
    updateDeal.mutate({
      id:                deal.id,
      title,
      contactId,
      stage:             stage as any,
      amount:            items.length > 0 ? itemsTotal : parseFloat(amount) || 0,
      discount:          discPct,
      expectedCloseDate: closeDate || undefined,
      source:            source    || undefined,
      notes:             notes     || undefined,
      assignedToId:      assignedToId || undefined,
      items: items.length > 0 ? items.map(i => ({
        name: i.name, quantity: parseFloat(i.quantity)||1,
        unit: i.unit, price: parseFloat(i.price)||0, discount: parseFloat(i.discount)||0,
      })) : undefined,
    } as any, { onSuccess: onClose })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Dealni tahrirlash"
      size="lg"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>Bekor</Button>
          <Button
            variant="primary" size="sm"
            loading={updateDeal.isPending}
            onClick={handleSave}
            disabled={!title || !contactId}
          >
            Saqlash
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          label="Sarlavha *"
          placeholder="Deal nomi..."
          value={title}
          onChange={e => setTitle(e.target.value)}
        />

        {/* Contact */}
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1.5">
            Kontakt <span className="text-danger">*</span>
          </label>
          <select
            value={contactId}
            onChange={e => setContactId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border-primary bg-bg-secondary text-sm text-text-primary focus:outline-none focus:border-accent-primary transition-colors"
          >
            <option value="">Kontaktni tanlang</option>
            {contacts?.data?.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Stage */}
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1.5">Bosqich</label>
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
                <div>{s.label}</div>
                <div className="text-[10px] opacity-70">{s.prob}%</div>
              </button>
            ))}
          </div>
        </div>

        {/* Items / Amount */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-text-secondary">Mahsulotlar / Xizmatlar</label>
            <Button variant="ghost" size="xs" leftIcon={<Plus size={12} />} onClick={addItem}>
              Qo'shish
            </Button>
          </div>

          {items.length === 0 ? (
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Summa"
                type="number"
                placeholder="0"
                value={amount}
                onChange={e => setAmount(e.target.value)}
              />
              <Input
                label="Chegirma (%)"
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
                      placeholder="Mahsulot nomi"
                      value={item.name}
                      onChange={e => updateItem(i, 'name', e.target.value)}
                      className="h-7 col-span-2 rounded-md text-xs bg-bg-secondary text-text-primary border border-border-primary px-2 focus:outline-none focus:border-accent-primary"
                    />
                    <div className="flex gap-1">
                      <input
                        type="number"
                        placeholder="Miqdor"
                        value={item.quantity}
                        onChange={e => updateItem(i, 'quantity', e.target.value)}
                        className="h-7 w-14 rounded-md text-xs bg-bg-secondary text-text-primary border border-border-primary px-2 focus:outline-none focus:border-accent-primary"
                      />
                      <input
                        placeholder="Birlik"
                        value={item.unit}
                        onChange={e => updateItem(i, 'unit', e.target.value)}
                        className="h-7 w-16 rounded-md text-xs bg-bg-secondary text-text-primary border border-border-primary px-2 focus:outline-none focus:border-accent-primary"
                      />
                    </div>
                    <input
                      type="number"
                      placeholder="Narx"
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
            <span className="text-sm text-text-secondary">Jami summa</span>
            <span className="text-base font-bold tabular-nums text-success">
              {formatCurrency(finalAmount)}
            </span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Yopilish sanasi"
            type="date"
            value={closeDate}
            onChange={e => setCloseDate(e.target.value)}
          />
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">Manba</label>
            <select
              value={source}
              onChange={e => setSource(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border-primary bg-bg-secondary text-sm text-text-primary focus:outline-none focus:border-accent-primary transition-colors"
            >
              <option value="">Tanlang</option>
              {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* Assignee */}
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1.5">
            Mas'ul shaxs (ixtiyoriy)
          </label>
          <select
            value={assignedToId}
            onChange={e => setAssignedToId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border-primary bg-bg-secondary text-sm text-text-primary focus:outline-none focus:border-accent-primary transition-colors"
          >
            <option value="">Tayinlanmagan</option>
            {Array.isArray(users) && users.map((u: any) => (
              <option key={u.id} value={u.id}>
                {u.firstName} {u.lastName} — {u.role}
              </option>
            ))}
          </select>
        </div>

        <Input
          label="Izoh (ixtiyoriy)"
          placeholder="Qo'shimcha ma'lumot..."
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />
      </div>
    </Modal>
  )
}
