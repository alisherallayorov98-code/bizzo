import { CURRENCIES, useExchangeRates } from './useCurrency'

interface CurrencySelectorProps {
  value:    string
  onChange: (currency: string) => void
  size?:    'sm' | 'md'
  label?:   string
}

export function CurrencySelector({ value, onChange, size = 'sm', label }: CurrencySelectorProps) {
  const h = size === 'sm' ? 'h-8' : 'h-9'
  return (
    <div>
      {label && (
        <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
      )}
      <div className={`flex items-center gap-1 p-0.5 rounded-lg border ${h}`}
        style={{ background: 'var(--color-bg-tertiary)', borderColor: 'var(--color-border-primary)' }}>
        {CURRENCIES.map(c => (
          <button
            key={c.code}
            type="button"
            onClick={() => onChange(c.code)}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all"
            style={{
              background: value === c.code ? 'var(--color-accent-primary)' : 'transparent',
              color:      value === c.code ? '#fff' : 'var(--color-text-muted)',
            }}
          >
            <span>{c.flag}</span>
            <span>{c.code}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// Inline currency badge
export function CurrencyBadge({ amount, currency }: { amount: number; currency?: string }) {
  const cur = currency ?? 'UZS'
  const c   = CURRENCIES.find(x => x.code === cur)
  const fmt = new Intl.NumberFormat('uz-UZ').format(Math.round(amount))

  return (
    <span className="inline-flex items-center gap-1 font-mono tabular-nums">
      {c?.flag && <span style={{ fontSize: 11 }}>{c.flag}</span>}
      <span>{cur === 'UZS' ? `${fmt} so'm` : `${c?.symbol}${fmt}`}</span>
    </span>
  )
}

// Exchange rate display strip
export function RatesStrip() {
  const { data: rates } = useExchangeRates()
  if (!rates) return null

  return (
    <div className="flex items-center gap-4 px-3 py-1.5 rounded-lg text-xs"
      style={{ background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border-primary)' }}>
      <span style={{ color: 'var(--color-text-muted)' }}>CBU:</span>
      <span style={{ color: 'var(--color-text-secondary)' }}>🇺🇸 $1 = {rates.USD.toLocaleString('uz-UZ')} so'm</span>
      <span style={{ color: 'var(--color-text-secondary)' }}>🇪🇺 €1 = {rates.EUR.toLocaleString('uz-UZ')} so'm</span>
      <span style={{ color: 'var(--color-text-secondary)' }}>🇷🇺 ₽1 = {rates.RUB.toLocaleString('uz-UZ')} so'm</span>
      <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
        {rates.source === 'MANUAL' ? '(manual)' : ''}
      </span>
    </div>
  )
}
