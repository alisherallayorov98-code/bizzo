import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { env } from './env'

// ============================================
// AXIOS INSTANCE
// ============================================
export const api = axios.create({
  baseURL:         env.API_URL,
  timeout:         30000,
  withCredentials: true,                   // httpOnly cookie uchun
  headers: {
    'Content-Type': 'application/json',
  },
})

// ============================================
// TOKEN PROVIDER (circular import oldini olish)
// auth.store.ts bu fayl ni import qilmaydi — faqat shu fayl storeni ishlatadi
// ============================================
type TokenProvider = {
  getToken:   () => string | null
  setAuth:    (user: unknown, token: string) => void
  clearAuth:  () => void
}

let _tokenProvider: TokenProvider | null = null

/** AuthStore tayyor bo'lgach, api modulga token provider o'rnatiladi */
export function registerTokenProvider(provider: TokenProvider) {
  _tokenProvider = provider
}

// ============================================
// SILENT REFRESH — RACE CONDITION PROTECTION
// ============================================
let isRefreshing = false
let refreshQueue: Array<{
  resolve: (token: string) => void
  reject:  (error: unknown) => void
}> = []

function resolveQueue(token: string) {
  refreshQueue.forEach((p) => p.resolve(token))
  refreshQueue = []
}

function rejectQueue(err: unknown) {
  refreshQueue.forEach((p) => p.reject(err))
  refreshQueue = []
}

// ============================================
// REQUEST INTERCEPTOR — token qo'shish
// ============================================
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = _tokenProvider?.getToken() ?? null
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

// ============================================
// RESPONSE INTERCEPTOR — 401 → silent refresh
// ============================================
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    const isRefreshUrl = original?.url?.includes('/auth/refresh')
    const isLoginUrl   = original?.url?.includes('/auth/login')
    if (error.response?.status !== 401 || original?._retry || isRefreshUrl || isLoginUrl) {
      return Promise.reject(error)
    }

    original._retry = true

    // Refresh in-flight — navbatga qo'shish
    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        refreshQueue.push({ resolve, reject })
      }).then((newToken) => {
        if (original.headers) {
          original.headers.Authorization = `Bearer ${newToken}`
        }
        return api(original)
      })
    }

    isRefreshing = true

    try {
      const { data } = await axios.post(
        `${env.API_URL}/auth/refresh`,
        {},
        { withCredentials: true },
      )

      const newToken: string = data.data.accessToken
      _tokenProvider?.setAuth(data.data.user, newToken)
      resolveQueue(newToken)

      if (original.headers) {
        original.headers.Authorization = `Bearer ${newToken}`
      }
      return api(original)
    } catch (err) {
      rejectQueue(err)
      _tokenProvider?.clearAuth()
      window.location.href = '/login'
      return Promise.reject(err)
    } finally {
      isRefreshing = false
    }
  },
)

export default api
