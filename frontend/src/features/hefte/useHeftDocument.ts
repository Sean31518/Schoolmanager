import { useEffect, useState } from 'react'
import { loadHeftDocument, type PdfDocument } from './pdf'
import type { HeftDto } from './types'

/** The parsed PDF of a Heft's currently shown version. */
export function useHeftDocument(heft: HeftDto | undefined) {
  // Tagged with the version it belongs to, so switching Hefte never shows
  // the previous one's pages for a moment.
  const [loaded, setLoaded] = useState<{ key: string; doc: PdfDocument | null; error: boolean } | null>(null)
  const heftId = heft?.id
  const version = heft?.modifiedAt
  const key = heftId && version ? `${heftId}@${version}` : null

  useEffect(() => {
    if (!heftId || !version || !key) return
    let cancelled = false
    loadHeftDocument(heftId, version).then(
      (doc) => !cancelled && setLoaded({ key, doc, error: false }),
      () => !cancelled && setLoaded({ key, doc: null, error: true }),
    )
    return () => {
      cancelled = true
    }
  }, [heftId, version, key])

  const current = loaded && loaded.key === key ? loaded : null
  return { doc: current?.doc ?? null, error: current?.error ?? false }
}

/** Width of an element, kept up to date - pages render at exactly that. */
export function useElementWidth<T extends HTMLElement>() {
  const [element, setElement] = useState<T | null>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    if (!element) return
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)))
    observer.observe(element)
    return () => observer.disconnect()
  }, [element])
  return { measure: setElement, width }
}
