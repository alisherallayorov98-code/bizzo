import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useQueryClient } from '@tanstack/react-query'
import api from '@config/api'

export interface AssistantAction {
  action: string
  [key: string]: any
}

export interface ActionResult {
  type:    'success' | 'info' | 'error'
  message: string
  data?:   any
}

// ============================================
// Action executor
// ============================================
export function useAssistantActions() {
  const navigate = useNavigate()
  const qc       = useQueryClient()

  const execute = async (action: AssistantAction): Promise<ActionResult> => {
    switch (action.action) {
      // ============================================
      // NAVIGATE
      // ============================================
      case 'navigate': {
        if (!action.path) return { type: 'error', message: 'Sahifa ko\'rsatilmagan' }
        navigate(action.path)
        return { type: 'success', message: `${action.path} sahifasi ochildi` }
      }

      // ============================================
      // QUERY — javob assistant ekranida ko'rsatiladi
      // ============================================
      case 'query': {
        if (action.result?.answer) {
          return { type: 'info', message: action.result.answer, data: action.result.data }
        }
        try {
          const r = await api.post('/assistant/query', { type: action.type, params: action })
          return { type: 'info', message: r.data.data.answer, data: r.data.data.data }
        } catch (e: any) {
          return { type: 'error', message: e?.message ?? 'So\'rovni bajara olmadim' }
        }
      }

      // ============================================
      // CREATE_EXPENSE
      // ============================================
      case 'create_expense': {
        try {
          await api.post('/cash-expenses', {
            category:   action.category   || 'OTHER',
            amount:     action.amount,
            payeeName:  action.payeeName,
            payeePhone: action.payeePhone,
            notes:      action.notes,
          })
          qc.invalidateQueries({ queryKey: ['cash-expenses'] })
          qc.invalidateQueries({ queryKey: ['cash-expense-stats'] })
          return {
            type: 'success',
            message: `Chiqim yozildi: ${action.payeeName} — ${Number(action.amount).toLocaleString('uz-UZ')} so'm`,
          }
        } catch (e: any) {
          return { type: 'error', message: e?.response?.data?.message ?? 'Chiqim yaratilmadi' }
        }
      }

      // ============================================
      // CREATE_CONTACT
      // ============================================
      case 'create_contact': {
        try {
          const r = await api.post('/contacts', {
            name:  action.name,
            phone: action.phone,
            type:  action.type || 'CUSTOMER',
          })
          qc.invalidateQueries({ queryKey: ['contacts'] })
          return {
            type: 'success',
            message: `${action.name} mijoz/yetkazuvchi qo'shildi`,
            data:    r.data.data,
          }
        } catch (e: any) {
          return { type: 'error', message: e?.response?.data?.message ?? 'Kontakt yaratilmadi' }
        }
      }

      // ============================================
      // FIND_CONTACT
      // ============================================
      case 'find_contact': {
        if (action.contact?.id) {
          navigate(`/contacts/${action.contact.id}`)
          return { type: 'success', message: `${action.contact.name} sahifasi ochildi` }
        }
        navigate(`/contacts?search=${encodeURIComponent(action.name ?? '')}`)
        return { type: 'info', message: `"${action.name}" kontakti topilmadi, ro'yxatda qidiring` }
      }

      // ============================================
      // FIND_PRODUCT
      // ============================================
      case 'find_product': {
        if (action.product?.id) {
          navigate(`/products/${action.product.id}`)
          return { type: 'success', message: `${action.product.name} sahifasi ochildi` }
        }
        navigate(`/products?search=${encodeURIComponent(action.name ?? '')}`)
        return { type: 'info', message: `"${action.name}" mahsuloti topilmadi` }
      }

      // ============================================
      // CONTACT_REPORT
      // ============================================
      case 'contact_report': {
        if (action.contact?.id) {
          navigate(`/contacts/${action.contact.id}/report`)
          return { type: 'success', message: `${action.contact.name} hisoboti ochildi` }
        }
        return { type: 'error', message: `"${action.name}" topilmadi` }
      }

      // ============================================
      // CREATE_INCOMING / OUTGOING — sahifaga prefill bilan o'tish
      // ============================================
      case 'create_incoming': {
        navigate('/warehouse/incoming', {
          state: {
            prefill: {
              contactId: action.contactId,
              lines: (action.lines ?? [])
                .filter((l: any) => l.productId)
                .map((l: any) => ({
                  productId: l.productId,
                  product:   l.product,
                  quantity:  l.quantity ?? 1,
                  price:     l.price ?? 0,
                })),
            },
          },
        })
        return { type: 'success', message: 'Kirim sahifasi ochildi' }
      }
      case 'create_outgoing': {
        navigate('/warehouse/outgoing')
        toast('Chiqim sahifasiga o\'ting va mahsulotlarni qo\'shing', { icon: 'ℹ️' })
        return { type: 'success', message: 'Chiqim sahifasi ochildi' }
      }

      // ============================================
      // PRINT_REPORT
      // ============================================
      case 'print_report': {
        const map: Record<string, string> = {
          sales:          '/reports?tab=sales',
          warehouse:      '/reports?tab=warehouse',
          debts:          '/debts?overdue=true',
          cash_expenses:  '/cash-expenses',
        }
        const path = map[action.type] ?? '/reports'
        navigate(path)
        return { type: 'info', message: `${action.type} sahifasi ochildi, "Chop etish" tugmasini bosing` }
      }

      // ============================================
      // UNKNOWN
      // ============================================
      case 'unknown':
      default:
        return {
          type:    'info',
          message: action.message ?? 'Iltimos aniqroq ayting',
        }
    }
  }

  return { execute }
}
