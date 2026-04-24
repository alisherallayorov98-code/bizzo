import { create } from 'zustand'

export interface POSItem {
  productId:   string
  productName: string
  productUnit: string
  barcode?:    string
  quantity:    number
  price:       number
  total:       number
}

export type PaymentMethod = 'CASH' | 'DEBT' | 'CARD' | 'TRANSFER'

interface POSStore {
  items:         POSItem[]
  contactId:     string
  contactName:   string
  paymentMethod: PaymentMethod
  discount:      number
  warehouseId:   string

  addItem:      (item: Omit<POSItem, 'total'>) => void
  removeItem:   (productId: string) => void
  updateQty:    (productId: string, qty: number) => void
  setContact:   (id: string, name: string) => void
  setPayment:   (method: PaymentMethod) => void
  setDiscount:  (pct: number) => void
  setWarehouse: (id: string) => void
  clear:        () => void

  subtotal:    () => number
  discountAmt: () => number
  grandTotal:  () => number
}

export const usePOSStore = create<POSStore>((set, get) => ({
  items:         [],
  contactId:     '',
  contactName:   '',
  paymentMethod: 'CASH',
  discount:      0,
  warehouseId:   '',

  addItem: (item) => set(s => {
    const existing = s.items.find(i => i.productId === item.productId)
    if (existing) {
      return {
        items: s.items.map(i =>
          i.productId === item.productId
            ? { ...i, quantity: i.quantity + item.quantity, total: (i.quantity + item.quantity) * i.price }
            : i,
        ),
      }
    }
    return { items: [...s.items, { ...item, total: item.quantity * item.price }] }
  }),

  removeItem: (productId) => set(s => ({
    items: s.items.filter(i => i.productId !== productId),
  })),

  updateQty: (productId, qty) => set(s => ({
    items: qty <= 0
      ? s.items.filter(i => i.productId !== productId)
      : s.items.map(i =>
          i.productId === productId
            ? { ...i, quantity: qty, total: qty * i.price }
            : i,
        ),
  })),

  setContact:   (id, name) => set({ contactId: id, contactName: name }),
  setPayment:   (method)   => set({ paymentMethod: method }),
  setDiscount:  (pct)      => set({ discount: pct }),
  setWarehouse: (id)       => set({ warehouseId: id }),
  clear: () => set({ items: [], contactId: '', contactName: '', discount: 0, paymentMethod: 'CASH', warehouseId: '' }),

  subtotal:    () => get().items.reduce((s, i) => s + i.total, 0),
  discountAmt: () => Math.round(get().subtotal() * get().discount / 100),
  grandTotal:  () => get().subtotal() - get().discountAmt(),
}))
