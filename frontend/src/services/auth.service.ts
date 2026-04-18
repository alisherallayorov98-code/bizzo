import { api } from '@config/api'
import type { AuthUser } from '@store/auth.store'

// ============================================
// REQUEST / RESPONSE TYPES
// ============================================
export interface LoginRequest {
  email:    string
  password: string
}

export interface AuthResponse {
  accessToken: string
  user:        AuthUser
}

// ============================================
// AUTH SERVICE
// ============================================
export const authService = {
  /**
   * Tizimga kirish.
   * Refresh token httpOnly cookie ga backend tomonidan yoziladi.
   */
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const { data } = await api.post<{ data: AuthResponse }>('/auth/login', credentials)
    return data.data
  },

  /**
   * Silent refresh — cookie dagi refresh token ishlatiladi.
   * withCredentials = true (api instanceda o'rnatilgan).
   */
  async refresh(): Promise<AuthResponse> {
    const { data } = await api.post<{ data: AuthResponse }>('/auth/refresh')
    return data.data
  },

  /**
   * Joriy foydalanuvchi ma'lumotlarini olish.
   */
  async getMe(): Promise<AuthUser> {
    const { data } = await api.get<{ data: { user: AuthUser } }>('/auth/me')
    return data.data.user
  },

  /**
   * Tizimdan chiqish — cookie backend tomonidan o'chiriladi.
   */
  async logout(): Promise<void> {
    await api.post('/auth/logout')
  },

  /**
   * Parol o'zgartirish.
   */
  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    await api.post('/auth/change-password', { oldPassword, newPassword })
  },

  async requestVerification(): Promise<{ message: string }> {
    const { data } = await api.post<{ data: { message: string } }>('/auth/request-verification')
    return data.data
  },

  async verifyEmail(token: string): Promise<{ message: string }> {
    const { data } = await api.post<{ data: { message: string } }>('/auth/verify-email', { token })
    return data.data
  },

  async forgotPassword(email: string): Promise<{ message: string }> {
    const { data } = await api.post<{ data: { message: string } }>('/auth/forgot-password', { email })
    return data.data
  },

  async resetPassword(token: string, password: string): Promise<{ message: string }> {
    const { data } = await api.post<{ data: { message: string } }>('/auth/reset-password', { token, password })
    return data.data
  },
}
