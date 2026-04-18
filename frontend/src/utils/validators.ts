// ================================================
// VALIDATSIYA FUNKSIYALARI
// ================================================

export function isValidSTIR(stir: string): boolean {
  const cleaned = stir.replace(/\D/g, '')
  return cleaned.length === 9 && /^\d{9}$/.test(cleaned)
}

export function isValidPhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '')
  return cleaned.length === 9 || cleaned.length === 12
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function isPositiveNumber(value: unknown): boolean {
  return typeof value === 'number' && !isNaN(value) && value > 0
}

export function isNonNegativeNumber(value: unknown): boolean {
  return typeof value === 'number' && !isNaN(value) && value >= 0
}

export function isRequired(value: unknown): boolean {
  if (value === null || value === undefined) return false
  if (typeof value === 'string') return value.trim().length > 0
  return true
}

export function minLength(value: string, min: number): boolean {
  return value.trim().length >= min
}

export function maxLength(value: string, max: number): boolean {
  return value.trim().length <= max
}
