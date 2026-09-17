import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGlobalSearch } from '../features/search/hooks'
import type { SearchResultDto, SearchResultType } from '../features/search/types'

const TYPE_LABELS: Record<SearchResultType, string> = {
  subject: 'FACH',
  note: 'NOTIZ',
  generalNote: 'NOTIZ',
  homework: 'HAUSAUFGABE',
  calendarEvent: 'TERMIN',
}

const TYPE_ORDER: SearchResultType[] = ['subject', 'note', 'generalNote', 'homework', 'calendarEvent']

/**
 * Mounted exactly once (in Layout.tsx), so its Ctrl/Cmd+K listener never
 * double-fires — Layout's desktop <aside> stays mounted (just CSS-hidden)
 * below the md breakpoint, so anything with a global side effect placed
 * inside SidebarNavList itself would double-mount whenever the mobile
 * drawer is also open. Sidebar trigger buttons just call onOpenChange.
 */
export function GlobalSearchModal({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const { data: results, isFetching } = useGlobalSearch(open ? query : '')

  useEffect(() => {
    function handleKeydown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        onOpenChange(!open)
      } else if (e.key === 'Escape' && open) {
        onOpenChange(false)
      }
    }
    document.addEventListener('keydown', handleKeydown)
    return () => document.removeEventListener('keydown', handleKeydown)
  }, [open, onOpenChange])

  useEffect(() => {
    if (open) {
      setQuery('')
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  if (!open) return null

  function handleSelect(result: SearchResultDto) {
    onOpenChange(false)
    navigate(result.url)
  }

  const trimmed = query.trim()
  const grouped = TYPE_ORDER.map((type) => ({
    type,
    items: (results ?? []).filter((r) => r.type === type),
  })).filter((g) => g.items.length > 0)

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 pt-[12vh]"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="w-full max-w-lg rounded-lg border border-border bg-bg-1 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4 shrink-0 text-text-tertiary"
          >
            <path d="m21 21-4.34-4.34" />
            <circle cx="11" cy="11" r="8" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Fächer, Notizen, Hausaufgaben, Termine durchsuchen..."
            className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
          />
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            title="Schließen"
            aria-label="Schließen"
            className="shrink-0 text-text-muted hover:text-text-primary"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-3.5 w-3.5"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="max-h-[50vh] overflow-y-auto p-1.5">
          {trimmed.length < 2 && (
            <p className="px-2.5 py-3 text-sm text-text-tertiary">Mindestens 2 Zeichen eingeben.</p>
          )}
          {trimmed.length >= 2 && isFetching && grouped.length === 0 && (
            <p className="px-2.5 py-3 text-sm text-text-tertiary">Suche...</p>
          )}
          {trimmed.length >= 2 && !isFetching && grouped.length === 0 && (
            <p className="px-2.5 py-3 text-sm text-text-tertiary">Keine Treffer.</p>
          )}
          {grouped.map((group) => (
            <div key={group.type} className="mb-1">
              <div className="px-2.5 pb-1 pt-2 font-mono text-[9px] tracking-wider text-text-muted">
                {TYPE_LABELS[group.type]}
              </div>
              {group.items.map((item) => (
                <button
                  key={`${item.type}-${item.id}`}
                  type="button"
                  onClick={() => handleSelect(item)}
                  className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                >
                  <span className="min-w-0 flex-1 truncate">{item.title}</span>
                  {item.subtitle && (
                    <span className="shrink-0 truncate font-mono text-[10px] text-text-muted">
                      {item.subtitle}
                    </span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
