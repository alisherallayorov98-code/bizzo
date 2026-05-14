import { useState, useEffect, useCallback } from 'react'
import api from '@config/api'
import toast from 'react-hot-toast'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64   = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData  = atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

export type PushState = 'loading' | 'unsupported' | 'denied' | 'subscribed' | 'unsubscribed'

export function usePushNotifications() {
  const [state,        setState]        = useState<PushState>('loading')
  const [isSubscribing, setSubscribing] = useState(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setState('unsupported')
      return
    }
    if (Notification.permission === 'denied') { setState('denied'); return }

    navigator.serviceWorker.ready.then(reg => {
      reg.pushManager.getSubscription().then(sub => {
        setState(sub ? 'subscribed' : 'unsubscribed')
      })
    })
  }, [])

  const subscribe = useCallback(async () => {
    if (!('serviceWorker' in navigator)) return
    setSubscribing(true)
    try {
      const { data: { publicKey } } = await api.get('/notifications/push/vapid-key')
      if (!publicKey) { toast.error('VAPID kaliti topilmadi'); return }

      const perm = await Notification.requestPermission()
      if (perm !== 'granted') { setState('denied'); return }

      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      })

      await api.post('/notifications/push/subscribe', sub.toJSON())
      setState('subscribed')
      toast.success('Push bildirishnomalar yoqildi')
    } catch (err) {
      toast.error('Obuna bo\'lishda xatolik')
    } finally {
      setSubscribing(false)
    }
  }, [])

  const unsubscribe = useCallback(async () => {
    setSubscribing(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await api.delete('/notifications/push/unsubscribe', { data: { endpoint: sub.endpoint } })
        await sub.unsubscribe()
      }
      setState('unsubscribed')
      toast.success('Push bildirishnomalar o\'chirildi')
    } catch {
      toast.error('Xatolik yuz berdi')
    } finally {
      setSubscribing(false)
    }
  }, [])

  const sendTest = useCallback(async () => {
    try {
      await api.post('/notifications/push/test')
      toast.success('Test bildirishnoma yuborildi')
    } catch {
      toast.error('Xatolik')
    }
  }, [])

  return { state, isSubscribing, subscribe, unsubscribe, sendTest }
}
