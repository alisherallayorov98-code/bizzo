import { useEffect, useState } from 'react'

export function useServiceWorker() {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [registration,    setRegistration]    = useState<ServiceWorkerRegistration | null>(null)

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    navigator.serviceWorker.ready.then(reg => {
      setRegistration(reg)

      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing
        if (!newWorker) return

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setUpdateAvailable(true)
          }
        })
      })
    })

    let refreshing = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true
        window.location.reload()
      }
    })
  }, [])

  const applyUpdate = () => {
    registration?.waiting?.postMessage({ type: 'SKIP_WAITING' })
  }

  return { updateAvailable, applyUpdate }
}
