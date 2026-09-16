import { useCallback, useEffect, useRef, useState } from 'react'

function readStorage(key: string, fallback: number): number {
  try {
    const stored = window.localStorage.getItem(key)
    const parsed = stored !== null ? Number(stored) : NaN
    return Number.isFinite(parsed) ? parsed : fallback
  } catch {
    return fallback
  }
}

function readStorageBool(key: string): boolean {
  try {
    return window.localStorage.getItem(key) === 'true'
  } catch {
    return false
  }
}

/**
 * Persisted, drag-resizable + collapsible sidebar width. `storageKey` scopes
 * the persisted values (per sidebar instance) in localStorage, which is the
 * right place for a purely per-device layout preference — it never needs to
 * sync across devices or be visible to the backend.
 */
export function useResizableSidebar(storageKey: string, defaultWidth: number, min: number, max: number) {
  const [width, setWidth] = useState(() => readStorage(storageKey, defaultWidth))
  const [collapsed, setCollapsed] = useState(() => readStorageBool(`${storageKey}:collapsed`))
  const draggingRef = useRef(false)

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, String(width))
    } catch {
      // Private browsing / storage disabled — resizing still works for this
      // session, it just won't persist. Not worth surfacing to the user.
    }
  }, [storageKey, width])

  useEffect(() => {
    try {
      window.localStorage.setItem(`${storageKey}:collapsed`, String(collapsed))
    } catch {
      // See above.
    }
  }, [storageKey, collapsed])

  const startResize = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      draggingRef.current = true
      const startX = e.clientX
      const startWidth = width
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'

      function onMouseMove(ev: MouseEvent) {
        if (!draggingRef.current) return
        const next = Math.min(max, Math.max(min, startWidth + (ev.clientX - startX)))
        setWidth(next)
      }
      function onMouseUp() {
        draggingRef.current = false
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
      }
      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)
    },
    [width, min, max],
  )

  return { width, collapsed, setCollapsed, startResize }
}
