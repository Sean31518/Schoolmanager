import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useHeft } from './hooks'
import { PdfPage } from './PdfPage'
import { useElementWidth, useHeftDocument } from './useHeftDocument'

const MAX_PAGE_WIDTH = 900
const THUMB_WIDTH = 104

/** /hefte/:id?seite=3&bis=5 - opens the Heft scrolled to page 3 with pages
 * 3-5 marked (the range a link points to). */
export function HeftViewerPage() {
  const { heftId } = useParams()
  const [params] = useSearchParams()
  const rangeStart = Number(params.get('seite')) || null
  const rangeEnd = Number(params.get('bis')) || rangeStart
  const { data: heft, isLoading, isError } = useHeft(heftId)
  const { doc, error } = useHeftDocument(heft)
  const { measure: measurePages, width: pagesWidth } = useElementWidth<HTMLDivElement>()
  const pageWidth = Math.min(pagesWidth, MAX_PAGE_WIDTH)
  const pageRefs = useRef(new Map<number, HTMLDivElement>())
  const thumbRefs = useRef(new Map<number, HTMLButtonElement>())
  const [currentPage, setCurrentPage] = useState(rangeStart ?? 1)
  const [thumbsOpen, setThumbsOpen] = useState(false)
  const jumped = useRef(false)

  const scrollToPage = useCallback((page: number, smooth = true) => {
    pageRefs.current.get(page)?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' })
  }, [])

  // Jump to the linked page once the placeholders exist (they have their
  // final height before rendering, so the position is right).
  useEffect(() => {
    if (!doc || jumped.current || !rangeStart || pageWidth <= 0) return
    jumped.current = true
    requestAnimationFrame(() => scrollToPage(Math.min(rangeStart, doc.numPages), false))
  }, [doc, rangeStart, pageWidth, scrollToPage])

  // Which page is at the top of the viewport, for the indicator/thumbnails.
  useEffect(() => {
    if (!doc) return
    function onScroll() {
      let best = 1
      for (const [page, el] of pageRefs.current) {
        if (el.getBoundingClientRect().top <= window.innerHeight * 0.35) best = Math.max(best, page)
      }
      setCurrentPage(best)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [doc])

  // Keep the current page's thumbnail in view while reading.
  useEffect(() => {
    thumbRefs.current.get(currentPage)?.scrollIntoView({ block: 'nearest' })
  }, [currentPage])

  if (isLoading) return <p className="text-text-tertiary">Lädt...</p>
  if (isError || !heft) return <p className="text-text-tertiary">Heft nicht gefunden.</p>

  const pageNumbers = doc ? Array.from({ length: doc.numPages }, (_, i) => i + 1) : []
  const inRange = (page: number) =>
    rangeStart !== null && rangeEnd !== null && page >= rangeStart && page <= rangeEnd

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Link to="/hefte" className="text-xs text-text-tertiary hover:text-text-secondary">
          ← Hefte
        </Link>
        {heft.subject && (
          <span className="flex items-center gap-1.5 text-xs text-text-secondary">
            <span className="h-2 w-2 rounded-[2px]" style={{ backgroundColor: heft.subject.color }} />
            {heft.subject.name}
          </span>
        )}
        <h1 className="min-w-0 flex-1 truncate text-[15px] font-semibold text-text-primary">{heft.name}</h1>
        {doc && (
          <span className="hidden font-mono text-[11px] text-text-tertiary md:inline">
            {currentPage} / {doc.numPages}
          </span>
        )}
      </div>
      {/* On phones the thumbnails are a drawer; the toggle floats so it's
          reachable while scrolled deep into a Heft. */}
      {doc && (
        <button
          type="button"
          onClick={() => setThumbsOpen((v) => !v)}
          className="fixed bottom-4 right-4 z-30 rounded-full border border-border bg-bg-2 px-3.5 py-2 font-mono text-xs text-text-primary shadow-lg md:hidden"
        >
          {currentPage} / {doc.numPages} · Seiten
        </button>
      )}
      <p className="truncate font-mono text-[10px] text-text-muted">{heft.folderPath || '/'}</p>
      {heft.archived && (
        <p className="rounded-md border border-border bg-bg-1 px-3 py-2 text-xs text-text-secondary">
          Archiviert - kommt automatisch zurück, sobald Goodnotes es wieder sichert.
        </p>
      )}
      {heft.processing && (
        <p className="text-xs text-text-tertiary">
          Eine neuere Version aus Goodnotes wird gerade verarbeitet; angezeigt wird die vorherige.
        </p>
      )}
      {rangeStart !== null && (
        <p className="text-xs text-text-secondary">
          Verknüpft: {rangeEnd && rangeEnd !== rangeStart ? `Seiten ${rangeStart}–${rangeEnd}` : `Seite ${rangeStart}`}{' '}
          <button
            type="button"
            onClick={() => scrollToPage(rangeStart)}
            className="text-accent-text hover:underline"
          >
            hinspringen
          </button>
        </p>
      )}

      {error ? (
        <p className="text-sm text-red-400">Das PDF konnte nicht geladen werden.</p>
      ) : (
        <div className="flex items-start gap-4">
          <aside
            className={`${thumbsOpen ? 'fixed inset-y-0 left-0 z-40 flex bg-bg-2 shadow-lg' : 'hidden'} w-[136px] shrink-0 flex-col gap-2 overflow-y-auto border-r border-border p-3 md:sticky md:top-4 md:flex md:max-h-[calc(var(--app-100vh)-2rem)] md:rounded-lg md:border md:bg-bg-1 md:shadow-none`}
          >
            {doc &&
              pageNumbers.map((page) => (
                <button
                  key={page}
                  ref={(el) => {
                    if (el) thumbRefs.current.set(page, el)
                    else thumbRefs.current.delete(page)
                  }}
                  type="button"
                  onClick={() => {
                    scrollToPage(page)
                    setThumbsOpen(false)
                  }}
                  className={`flex flex-col items-center gap-1 rounded-md p-1 ${
                    page === currentPage ? 'bg-bg-hover' : 'hover:bg-bg-hover/60'
                  }`}
                >
                  <PdfPage
                    doc={doc}
                    pageNumber={page}
                    width={THUMB_WIDTH}
                    className={`rounded-sm ${inRange(page) ? 'ring-2 ring-accent' : 'ring-1 ring-border'}`}
                  />
                  <span className="font-mono text-[10px] text-text-tertiary">{page}</span>
                </button>
              ))}
          </aside>
          {thumbsOpen && (
            <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setThumbsOpen(false)} />
          )}

          <div ref={measurePages} className="flex min-w-0 flex-1 flex-col items-center gap-4">
            {!doc && <p className="self-start text-text-tertiary">PDF wird geladen...</p>}
            {doc &&
              pageWidth > 0 &&
              pageNumbers.map((page) => (
                <div
                  key={page}
                  ref={(el) => {
                    if (el) pageRefs.current.set(page, el)
                    else pageRefs.current.delete(page)
                  }}
                  className="scroll-mt-4"
                >
                  <PdfPage
                    doc={doc}
                    pageNumber={page}
                    width={pageWidth}
                    className={`rounded-md shadow ${inRange(page) ? 'ring-2 ring-accent' : 'ring-1 ring-border'}`}
                  />
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
