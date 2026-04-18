import { format as dfFormat } from 'date-fns'
import { uz, ru } from 'date-fns/locale'
import { useI18n } from '@i18n/index'

const locales = { uz, ru }

export function formatDate(d: Date | string | number, pattern = 'dd.MM.yyyy'): string {
  const lang = useI18n.getState().lang
  return dfFormat(new Date(d), pattern, { locale: locales[lang] })
}

export function formatNumber(n: number | string | null | undefined): string {
  if (n === null || n === undefined || n === '') return '—'
  const lang = useI18n.getState().lang
  return new Intl.NumberFormat(lang === 'ru' ? 'ru-RU' : 'uz-UZ').format(Number(n))
}

export function formatCurrency(n: number | string | null | undefined, currency = 'UZS'): string {
  if (n === null || n === undefined || n === '') return '—'
  const lang = useI18n.getState().lang
  const unit = currency === 'UZS' ? (lang === 'ru' ? 'сум' : 'so\'m') : currency
  return `${formatNumber(n)} ${unit}`
}
