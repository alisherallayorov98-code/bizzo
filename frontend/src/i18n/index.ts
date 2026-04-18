import { create } from 'zustand'
import uz from '../locales/uz.json'
import ru from '../locales/ru.json'

/**
 * Yengil i18n — tashqi paketsiz. Kelajakda react-i18next ga ko'chirish oson.
 */
export type Lang = 'uz' | 'ru'

const dictionaries: Record<Lang, any> = { uz, ru }

interface I18nState {
  lang: Lang
  setLang: (l: Lang) => void
}

export const useI18n = create<I18nState>((set) => ({
  lang: (localStorage.getItem('lang') as Lang) || 'uz',
  setLang: (lang) => {
    localStorage.setItem('lang', lang)
    document.documentElement.lang = lang
    set({ lang })
  },
}))

function lookup(obj: any, path: string): string | undefined {
  return path.split('.').reduce((acc, key) => (acc ? acc[key] : undefined), obj)
}

export function t(key: string, vars?: Record<string, string | number>): string {
  const lang = useI18n.getState().lang
  const raw = lookup(dictionaries[lang], key) ?? lookup(dictionaries.uz, key) ?? key
  if (!vars) return raw
  return Object.entries(vars).reduce(
    (s, [k, v]) => s.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v)),
    raw,
  )
}

export function useT() {
  useI18n((s) => s.lang) // reaktivlik uchun subscribe
  return t
}
