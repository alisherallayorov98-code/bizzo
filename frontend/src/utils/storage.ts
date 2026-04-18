// LocalStorage wrapper

export const storage = {
  get<T>(key: string, defaultValue: T): T {
    try {
      const item = localStorage.getItem(key)
      return item ? (JSON.parse(item) as T) : defaultValue
    } catch {
      return defaultValue
    }
  },

  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      console.warn(`LocalStorage: '${key}' ni saqlashda xato`)
    }
  },

  remove(key: string): void {
    localStorage.removeItem(key)
  },

  clear(): void {
    localStorage.clear()
  },
}
