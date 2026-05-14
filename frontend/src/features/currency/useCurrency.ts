import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@config/api'
import toast from 'react-hot-toast'

export interface ExchangeRates {
  USD: number
  EUR: number
  RUB: number
  date: string
  source: 'CBU' | 'MANUAL'
}

const CURRENCY_KEY = 'exchange-rates'

export function useExchangeRates() {
  return useQuery<ExchangeRates>({
    queryKey:  [CURRENCY_KEY],
    queryFn:   async () => {
      const { data } = await api.get('/currency/rates')
      return data
    },
    staleTime: 10 * 60_000, // 10 min cache
    refetchOnWindowFocus: false,
  })
}

export function useUpdateRates() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (rates: Partial<ExchangeRates>) => api.post('/currency/rates', rates).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [CURRENCY_KEY] })
      toast.success('Kurslar saqlandi')
    },
    onError: () => toast.error('Kurslarni saqlashda xatolik'),
  })
}

export function useRefreshCbuRates() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.get('/currency/rates/cbu').then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [CURRENCY_KEY] })
      toast.success('CBU kurslari yangilandi')
    },
    onError: () => toast.error('CBU dan kurslarni olishda xatolik'),
  })
}

// Konvertatsiya utility (client side, rates dan)
export function convertAmount(amount: number, from: string, to: string, rates: ExchangeRates): number {
  if (from === to) return amount
  const toUZS = (n: number, cur: string) => {
    if (cur === 'UZS') return n
    if (cur === 'USD') return n * rates.USD
    if (cur === 'EUR') return n * rates.EUR
    if (cur === 'RUB') return n * rates.RUB
    return n
  }
  const fromUZS = (n: number, cur: string) => {
    if (cur === 'UZS') return n
    if (cur === 'USD') return n / rates.USD
    if (cur === 'EUR') return n / rates.EUR
    if (cur === 'RUB') return n / rates.RUB
    return n
  }
  return fromUZS(toUZS(amount, from), to)
}

export const CURRENCIES = [
  { code: 'UZS', label: "So'm",  symbol: 'so\'m', flag: '🇺🇿' },
  { code: 'USD', label: 'Dollar', symbol: '$',     flag: '🇺🇸' },
  { code: 'EUR', label: 'Evro',   symbol: '€',     flag: '🇪🇺' },
  { code: 'RUB', label: 'Rubl',   symbol: '₽',     flag: '🇷🇺' },
]

export function formatWithCurrency(amount: number, currency: string): string {
  const cur = CURRENCIES.find(c => c.code === currency)
  const formatted = new Intl.NumberFormat('uz-UZ').format(Math.round(amount))
  if (!cur || currency === 'UZS') return `${formatted} so'm`
  return `${cur.symbol}${formatted}`
}
