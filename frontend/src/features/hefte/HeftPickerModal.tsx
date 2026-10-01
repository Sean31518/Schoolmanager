import { useMemo, useState } from 'react'
import { useHefte } from './hooks'
import { PdfPage } from './PdfPage'
import type { DraftLink, HeftDto } from './types'
import { useHeftDocument } from './useHeftDocument'

const THUMB_WIDTH = 112

/** Pick a Heft, then optionally a page or page range from its thumbnails.
 * Hefte of `subjectId` (the form's Fach) are listed first. */
export function HeftPickerModal({
  subjectId,
  onPick,
  onClose,
}: {
  subjectId?: string | null
  onPick: (link: DraftLink) => void
  onClose: () => void
}) {
  const [heft, setHeft] = useState<HeftDto | null>(null)

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[min(720px,calc(var(--app-100vh)-2rem))] w-full max-w-2xl flex-col rounded-lg border border-border bg-bg-1 shadow-lg"
      >
        {heft ? (
          <PagePicker heft={heft} onBack={() => setHeft(null)} onPick={onPick} />
        ) : (
          <HeftList subjectId={subjectId ?? null} onSelect={setHeft} />
        )}
        <div className="flex justify-end border-t border-border px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border px-3 py-1.5 text-sm text-text-secondary hover:bg-bg-hover"
          >
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  )
}

function HeftList({ subjectId, onSelect }: { subjectId: string | null; onSelect: (heft: HeftDto) => void }) {
  const { data: hefte, isLoading } = useHefte()
  const [query, setQuery] = useState('')

  const groups = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('de-DE')
    const matching = (hefte ?? []).filter((h) => !q || h.path.toLocaleLowerCase('de-DE').includes(q))
    const byGroup = new Map<string, { label: string; color: string | null; hefte: HeftDto[] }>()
    for (const h of matching) {
      const key = h.subject?.id ?? 'none'
      if (!byGroup.has(key)) {
        byGroup.set(key, { label: h.subject?.name ?? 'Ohne Fach', color: h.subject?.color ?? null, hefte: [] })
      }
      byGroup.get(key)!.hefte.push(h)
    }
    return [...byGroup.entries()]
      .sort(([a, ga], [b, gb]) => {
        if (a === subjectId) return -1
        if (b === subjectId) return 1
        if (a === 'none') return 1
        if (b === 'none') return -1
        return ga.label.localeCompare(gb.label, 'de')
      })
      .map(([, group]) => group)
  }, [hefte, query, subjectId])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-border p-4">
        <h2 className="text-[15px] font-semibold text-text-primary">Heft verknüpfen</h2>
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Heft oder Ordner suchen..."
          className="mt-3 block w-full rounded-md border border-border bg-bg-muted px-3 py-2 text-sm text-text-primary"
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {isLoading && <p className="text-sm text-text-tertiary">Lädt...</p>}
        {!isLoading && groups.length === 0 && (
          <p className="text-sm text-text-tertiary">
            {hefte?.length ? 'Nichts gefunden.' : 'Noch keine Hefte - richte in den Einstellungen das Goodnotes-Backup ein.'}
          </p>
        )}
        <div className="space-y-4">
          {groups.map((group) => (
            <section key={group.label}>
              <h3 className="flex items-center gap-1.5 font-mono text-[10px] tracking-wider text-text-tertiary">
                {group.color && <span className="h-2 w-2 rounded-[2px]" style={{ backgroundColor: group.color }} />}
                {group.label.toUpperCase()}
              </h3>
              <ul className="mt-1.5 divide-y divide-border-subtle rounded-md border border-border">
                {group.hefte.map((h) => (
                  <li key={h.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(h)}
                      className="flex w-full items-baseline gap-2 px-3 py-2 text-left hover:bg-bg-hover"
                    >
                      <span className="truncate text-sm text-text-primary">{h.name}</span>
                      <span className="min-w-0 flex-1 truncate font-mono text-[10px] text-text-muted">{h.folderPath}</span>
                      <span className="shrink-0 font-mono text-[10px] text-text-tertiary">{h.pageCount} S.</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}

function PagePicker({
  heft,
  onBack,
  onPick,
}: {
  heft: HeftDto
  onBack: () => void
  onPick: (link: DraftLink) => void
}) {
  const { doc, error } = useHeftDocument(heft)
  const [start, setStart] = useState<number | null>(null)
  const [end, setEnd] = useState<number | null>(null)

  // First click picks a page, a second click on another page makes it a
  // range, a further click starts over.
  function clickPage(page: number) {
    if (start === null || (end !== null && end !== start)) {
      setStart(page)
      setEnd(page)
    } else {
      setStart(Math.min(start, page))
      setEnd(Math.max(start, page))
    }
  }

  const selected = (page: number) => start !== null && end !== null && page >= start && page <= end
  const pageCount = doc?.numPages ?? 0

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
        <button type="button" onClick={onBack} className="text-xs text-text-tertiary hover:text-text-secondary">
          ← Hefte
        </button>
        <h2 className="min-w-0 flex-1 truncate text-[15px] font-semibold text-text-primary">{heft.name}</h2>
        <button
          type="button"
          onClick={() => onPick({ fileId: heft.id, heftName: heft.name, pageStart: null, pageEnd: null })}
          className="rounded-md border border-border px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-hover"
        >
          Ganzes Heft
        </button>
        <button
          type="button"
          disabled={start === null}
          onClick={() => onPick({ fileId: heft.id, heftName: heft.name, pageStart: start, pageEnd: end })}
          className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-ink disabled:opacity-40"
        >
          {start === null ? 'Seiten wählen' : end !== start ? `Seiten ${start}–${end}` : `Seite ${start}`} verknüpfen
        </button>
      </div>
      <p className="px-4 pt-3 text-xs text-text-tertiary">
        Tippe eine Seite an - und eine zweite für einen Bereich.
      </p>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {error && <p className="text-sm text-red-400">Das PDF konnte nicht geladen werden.</p>}
        {!doc && !error && <p className="text-sm text-text-tertiary">PDF wird geladen...</p>}
        <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-3">
          {doc &&
            Array.from({ length: pageCount }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                type="button"
                onClick={() => clickPage(page)}
                className={`flex flex-col items-center gap-1 rounded-md p-1 ${selected(page) ? 'bg-accent/15' : 'hover:bg-bg-hover'}`}
              >
                <PdfPage
                  doc={doc}
                  pageNumber={page}
                  width={THUMB_WIDTH}
                  className={`rounded-sm ${selected(page) ? 'ring-2 ring-accent' : 'ring-1 ring-border'}`}
                />
                <span className="font-mono text-[10px] text-text-tertiary">{page}</span>
              </button>
            ))}
        </div>
      </div>
    </div>
  )
}
