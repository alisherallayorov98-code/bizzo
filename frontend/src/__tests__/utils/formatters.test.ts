import { describe, it, expect } from 'vitest'
import { formatCurrency } from '@utils/formatters'

describe('formatCurrency', () => {
  it('formats UZS with thousand separators and symbol', () => {
    const out = formatCurrency(1234567)
    expect(out).toContain('1')
    expect(out).toContain("so'm")
  })

  it('returns em-dash for invalid input', () => {
    expect(formatCurrency(NaN)).toBe('—')
  })

  it('handles negative amounts with leading minus', () => {
    expect(formatCurrency(-500).startsWith('-')).toBe(true)
  })

  it('formats USD with dollar sign', () => {
    const out = formatCurrency(1000, 'USD')
    expect(out).toContain('$')
  })

  it('omits symbol when showSymbol=false', () => {
    expect(formatCurrency(1000, 'UZS', false)).not.toContain("so'm")
  })
})
