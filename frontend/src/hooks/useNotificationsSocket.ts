import { useEffect, useRef } from 'react'
import { io, Socket }       from 'socket.io-client'
import { useQueryClient }   from '@tanstack/react-query'
import { useAuthStore }     from '@store/auth.store'

const WS_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000'

let globalSocket: Socket | null = null
let refCount = 0

/**
 * Connects to the /notifications WebSocket namespace and invalidates
 * the React Query 'notifications' cache on new events.
 * Uses a module-level singleton so multiple consumers share one connection.
 */
export function useNotificationsSocket() {
  const qc    = useQueryClient()
  const token = useAuthStore(s => s.accessToken)
  const initialized = useRef(false)

  useEffect(() => {
    if (!token) return

    refCount++

    if (!globalSocket) {
      globalSocket = io(`${WS_URL}/notifications`, {
        auth:          { token },
        transports:    ['websocket'],
        reconnection:  true,
        reconnectionDelay: 2000,
      })

      globalSocket.on('notification', () => {
        qc.invalidateQueries({ queryKey: ['notifications'] })
      })

      globalSocket.on('unread_count', (data: { count: number }) => {
        // Optimistically update the unread count in cache
        qc.setQueryData(['notifications'], (old: any) => {
          if (!old) return old
          return { ...old, unreadCount: data.count }
        })
      })
    }

    initialized.current = true

    return () => {
      refCount--
      if (refCount === 0 && globalSocket) {
        globalSocket.disconnect()
        globalSocket = null
      }
    }
  }, [token, qc])
}
