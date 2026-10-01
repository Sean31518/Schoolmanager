import { useEffect, useRef, useState } from 'react'
import type { PdfDocument } from './pdf'

const A4_RATIO = 297 / 210

/**
 * One PDF page, rendered only once it scrolls near the viewport (a Heft can
 * have hundreds of pages) and at the width it's actually shown at. Until
 * then it's a placeholder of the right aspect ratio, so scroll positions
 * and jumps to a page are stable before anything has rendered.
 */
export function PdfPage({
  doc,
  pageNumber,
  width,
  className = '',
}: {
  doc: PdfDocument
  pageNumber: number
  width: number
  className?: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [visible, setVisible] = useState(false)
  const [ratio, setRatio] = useState(A4_RATIO)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: '600px 0px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!visible || width <= 0) return
    let cancelled = false
    let renderTask: { cancel: () => void; promise: Promise<void> } | null = null

    void (async () => {
      try {
        const page = await doc.getPage(pageNumber)
        if (cancelled) return
        const base = page.getViewport({ scale: 1 })
        setRatio(base.height / base.width)
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
        const viewport = page.getViewport({ scale: (width / base.width) * pixelRatio })
        const canvas = canvasRef.current
        const context = canvas?.getContext('2d')
        if (!canvas || !context) return
        canvas.width = Math.floor(viewport.width)
        canvas.height = Math.floor(viewport.height)
        renderTask = page.render({ canvasContext: context, viewport, canvas })
        await renderTask.promise
      } catch (err) {
        if (!cancelled && !(err instanceof Error && err.name === 'RenderingCancelledException')) {
          setFailed(true)
        }
      }
    })()

    return () => {
      cancelled = true
      renderTask?.cancel()
    }
  }, [doc, pageNumber, width, visible])

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden bg-white ${className}`}
      style={{ width, height: Math.round(width * ratio) }}
    >
      {failed ? (
        <p className="p-3 text-xs text-red-500">Seite {pageNumber} konnte nicht geladen werden</p>
      ) : (
        <canvas ref={canvasRef} className="block h-full w-full" />
      )}
    </div>
  )
}
