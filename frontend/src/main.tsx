import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { registerTokenProvider } from './config/api'
import { useAuthStore } from './store/auth.store'
import { initSentry } from './utils/sentry-init'
import './styles/globals.css'
import './styles/animations.css'
import './styles/print.css'
import './styles/mobile.css'

// API interceptor uchun token provider o'rnatish
// (circular import oldini olish uchun main.tsx da bootstrap qilinadi)
initSentry()

registerTokenProvider({
  getToken:  () => useAuthStore.getState().accessToken,
  setAuth:   (user, token) => useAuthStore.getState().setAuth(user as any, token),
  clearAuth: () => useAuthStore.getState().clearAuth(),
})

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element not found')

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
)
