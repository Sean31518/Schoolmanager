import { useEffect, useRef, useState } from 'react'
import { loadPdfDocument } from './pdfDocumentCache'

export function PdfPageView({ fileId, pageNumber }: { fileId: string; pageNumber: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function render() {
      try {
        const doc = await loadPdfDocument(fileId)
        const page = await doc.getPage(pageNumber)
        if (cancelled) return

        const viewport = page.getViewport({ scale: 1.5 })
        const canvas = canvasRef.current
        if (!canvas) return
        canvas.width = viewport.width
        canvas.height = viewport.height
        const context = canvas.getContext('2d')
        if (!context) return

        await page.render({ canvasContext: context, viewport, canvas }).promise
      } catch {
        if (!cancelled) setError('PDF-Seite konnte nicht geladen werden')
      }
    }

    void render()
    return () => {
      cancelled = true
    }
  }, [fileId, pageNumber])

  if (error) {
    return <p className="text-sm text-red-400">{error}</p>
  }

  return (
    <div className="mx-auto w-fit max-w-full overflow-x-auto rounded-lg border border-border bg-bg-2 p-2">
      <canvas ref={canvasRef} className="max-w-full rounded" />
      <p className="mt-1 text-center font-mono text-[10px] tracking-wider text-text-tertiary">
        SEITE {pageNumber}
      </p>
    </div>
  )
}
