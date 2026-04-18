// ================================================
// VALYUTA FORMATLASH
// ================================================

/** So'm formatda: 1234567 → "1 234 567 so'm" */
export function formatCurrency(
  amount: number | string,
  currency = 'UZS',
  showSymbol = true
): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(num)) return '—'

  const formatted = new Intl.NumberFormat('uz-UZ', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(num))

  const sign = num < 0 ? '-' : ''

  if (currency === 'UZS') {
    return showSymbol ? `${sign}${formatted} so'm` : `${sign}${formatted}`
  }
  if (currency === 'USD') {
    return showSymbol ? `${sign}$${formatted}` : `${sign}${formatted}`
  }
  return `${sign}${formatted} ${currency}`
}

// ================================================
// RAQAM FORMATLASH
// ================================================

/** Og'irlik: 1234.5 → "1 234.5 kg" */
export function formatWeight(value: number | string, unit = 'kg'): string {
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return '—'
  return `${new Intl.NumberFormat('uz-UZ', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num)} ${unit}`
}

/** Foiz: 34.6 → "34.6%" */
export function formatPercent(value: number, decimals = 1): string {
  if (isNaN(value)) return '—'
  return `${value.toFixed(decimals)}%`
}

/** Raqam: 1234567 → "1 234 567" */
export function formatNumber(value: number, decimals = 0): string {
  if (isNaN(value)) return '—'
  return new Intl.NumberFormat('uz-UZ', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

/** Katta raqam qisqartirish: 1500000 → "1.5M" */
export function formatCompact(num: number): string {
  if (isNaN(num)) return '—'
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}B`
  if (num >= 1_000_000)     return `${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000)         return `${(num / 1_000).toFixed(1)}K`
  return String(num)
}

// ================================================
// SANA FORMATLASH
// ================================================

const MONTHS_SHORT = ['yan', 'fev', 'mar', 'apr', 'may', 'iyn', 'iyl', 'avg', 'sen', 'okt', 'noy', 'dek']
const MONTHS_FULL  = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr']

function parseDate(date: string | Date | null | undefined): Date | null {
  if (!date) return null
  const d = typeof date === 'string' ? new Date(date) : date
  return isNaN(d.getTime()) ? null : d
}

/** "15 yan 2024" yoki "15.01.2024" */
export function formatDate(
  date: string | Date | null | undefined,
  variant: 'short' | 'medium' | 'long' = 'medium'
): string {
  const d = parseDate(date)
  if (!d) return '—'

  const day   = d.getDate()
  const month = d.getMonth()
  const year  = d.getFullYear()
  const dd    = String(day).padStart(2, '0')
  const mm    = String(month + 1).padStart(2, '0')

  if (variant === 'short')  return `${dd}.${mm}.${year}`
  if (variant === 'medium') return `${day} ${MONTHS_SHORT[month]} ${year}`
  return `${day} ${MONTHS_FULL[month]} ${year} yil`
}

/** "15 yan 2024, 14:32" */
export function formatDateTime(date: string | Date | null | undefined): string {
  const d = parseDate(date)
  if (!d) return '—'
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${formatDate(d)}, ${h}:${m}`
}

/** "2 soat oldin" / "3 kun oldin" */
export function formatRelativeTime(date: string | Date | null | undefined): string {
  const d = parseDate(date)
  if (!d) return '—'

  const diffMs   = Date.now() - d.getTime()
  const diffSec  = Math.floor(diffMs / 1000)
  const diffMin  = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay  = Math.floor(diffHour / 24)
  const diffMonth = Math.floor(diffDay / 30)
  const diffYear = Math.floor(diffDay / 365)

  if (diffSec  < 60)  return 'hozir'
  if (diffMin  < 60)  return `${diffMin} daqiqa oldin`
  if (diffHour < 24)  return `${diffHour} soat oldin`
  if (diffDay  < 30)  return `${diffDay} kun oldin`
  if (diffMonth < 12) return `${diffMonth} oy oldin`
  return `${diffYear} yil oldin`
}

/** "Yanvar 2024" */
export function formatMonth(month: number, year: number): string {
  return `${MONTHS_FULL[month - 1]} ${year}`
}

// ================================================
// MATN FORMATLASH
// ================================================

/** Qisqa ism: "Alisher Toshmatov" → "AT" */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(n => n[0]?.toUpperCase() ?? '')
    .join('')
}

/** Uzun matni qisqartirish */
export function truncate(text: string, maxLength = 50): string {
  return text.length <= maxLength ? text : `${text.slice(0, maxLength)}...`
}

/** Telefon: "998901234567" → "+998 90 123 45 67" */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 12 && digits.startsWith('998')) {
    return `+${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 10)} ${digits.slice(10)}`
  }
  if (digits.length === 9) {
    return `+998 ${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 7)} ${digits.slice(7)}`
  }
  return phone
}

/** Fayl hajmi: 1048576 → "1.0 MB" */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024)              return `${bytes} B`
  if (bytes < 1024 * 1024)       return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

/** O'zgarish foizi: (100, 120) → "+20.0%" */
export function formatChangePercent(oldValue: number, newValue: number): string {
  if (oldValue === 0) return newValue > 0 ? '+100%' : '—'
  const pct = ((newValue - oldValue) / Math.abs(oldValue)) * 100
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`
}
