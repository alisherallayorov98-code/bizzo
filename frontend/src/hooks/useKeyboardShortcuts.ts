import { useEffect, useCallback, RefObject } from 'react'

type ShortcutHandler = (e: KeyboardEvent) => void

interface Shortcut {
  key:      string        // e.g. 'k', 'n', 'Escape', '/'
  ctrl?:    boolean       // Ctrl or Cmd
  shift?:   boolean
  alt?:     boolean
  handler:  ShortcutHandler
  /** Skip if focus is inside an input/textarea/select */
  skipInput?: boolean
}

export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    for (const sc of shortcuts) {
      const ctrl  = sc.ctrl  ? (e.ctrlKey || e.metaKey) : !(e.ctrlKey || e.metaKey)
      const shift = sc.shift ? e.shiftKey : !e.shiftKey
      const alt   = sc.alt   ? e.altKey   : !e.altKey

      if (!ctrl || !shift || !alt) continue
      if (e.key.toLowerCase() !== sc.key.toLowerCase()) continue

      if (sc.skipInput) {
        const tag = (document.activeElement as HTMLElement)?.tagName?.toLowerCase()
        if (tag === 'input' || tag === 'textarea' || tag === 'select') continue
      }

      e.preventDefault()
      sc.handler(e)
      break
    }
  }, [shortcuts])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}

/** Focus a ref element */
export function useFocusShortcut(ref: RefObject<HTMLInputElement | null>, key = 'k', ctrl = true) {
  useKeyboardShortcuts([{
    key, ctrl,
    handler: () => { ref.current?.focus(); ref.current?.select() },
  }])
}
