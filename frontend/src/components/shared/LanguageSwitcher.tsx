import { useI18n, Lang } from '@i18n/index'
import { Globe } from 'lucide-react'

export function LanguageSwitcher() {
  const { lang, setLang } = useI18n()

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <Globe size={14} style={{ color: 'var(--color-text-muted)' }} />
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value as Lang)}
        style={{
          padding: '6px 8px', borderRadius: 6,
          background: 'var(--color-bg-secondary)',
          color: 'var(--color-text-primary)',
          border: '1px solid var(--color-border)',
          fontSize: 13, cursor: 'pointer',
        }}
      >
        <option value="uz">O'zbek</option>
        <option value="ru">Русский</option>
      </select>
    </div>
  )
}

export default LanguageSwitcher
