import { useState } from 'react'
import { Link } from 'react-router-dom'
import { HeftPickerModal } from './HeftPickerModal'
import { useConfirmLink } from './hooks'
import { viewerUrl } from './links'
import { pageLabel, type DocumentLinkDto, type DraftLink } from './types'

function BookIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3 w-3 shrink-0"
    >
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
    </svg>
  )
}

/** Read-only link chips that open the viewer at the linked pages. A link
 * whose pages were only guessed after a Goodnotes change shows "unsicher"
 * with a button to confirm it. */
export function LinkChips({
  links,
  className = '',
  onRemove,
}: {
  links: DocumentLinkDto[]
  className?: string
  onRemove?: (linkId: string) => void
}) {
  const confirm = useConfirmLink()
  if (links.length === 0) return null
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {links.map((link) => (
        <span
          key={link.id}
          className={`inline-flex max-w-full items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] ${
            link.uncertain ? 'border-amber-500/50 bg-amber-500/10' : 'border-border bg-bg-muted'
          }`}
        >
          <Link
            to={viewerUrl(link)}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex min-w-0 items-center gap-1 text-text-secondary hover:text-text-primary"
            title={link.heftPath}
          >
            <BookIcon />
            <span className="truncate">{link.heftName}</span>
            <span className="shrink-0 text-text-tertiary">· {pageLabel(link)}</span>
          </Link>
          {link.uncertain && (
            <button
              type="button"
              title="Die Seiten wurden nach einer Änderung in Goodnotes geschätzt. Stimmt die Verknüpfung?"
              onClick={(e) => {
                e.stopPropagation()
                confirm.mutate(link.id)
              }}
              className="shrink-0 rounded px-1 font-medium text-amber-600 hover:bg-amber-500/20 dark:text-amber-400"
            >
              unsicher · stimmt ✓
            </button>
          )}
          {onRemove && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onRemove(link.id)
              }}
              title="Verknüpfung entfernen"
              aria-label="Verknüpfung entfernen"
              className="ml-0.5 shrink-0 text-text-muted hover:text-red-400"
            >
              ×
            </button>
          )}
        </span>
      ))}
    </div>
  )
}

/** Form field: the list of linked Hefte/pages, with "+ Heft verknüpfen". */
export function LinkEditor({
  value,
  onChange,
  subjectId,
}: {
  value: DraftLink[]
  onChange: (links: DraftLink[]) => void
  subjectId?: string | null
}) {
  const [pickerOpen, setPickerOpen] = useState(false)

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5">
        {value.map((link, index) => (
          <span
            key={link.id ?? `${link.fileId}-${index}`}
            className={`inline-flex max-w-full items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] text-text-secondary ${
              link.uncertain ? 'border-amber-500/50 bg-amber-500/10' : 'border-border bg-bg-muted'
            }`}
          >
            <BookIcon />
            <span className="truncate">{link.heftName}</span>
            <span className="shrink-0 text-text-tertiary">· {pageLabel(link)}</span>
            {link.uncertain && <span className="shrink-0 text-amber-600 dark:text-amber-400">· unsicher</span>}
            <button
              type="button"
              onClick={() => onChange(value.filter((_, i) => i !== index))}
              title="Verknüpfung entfernen"
              aria-label="Verknüpfung entfernen"
              className="ml-0.5 shrink-0 text-text-muted hover:text-red-400"
            >
              ×
            </button>
          </span>
        ))}
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="rounded-md border border-dashed border-border px-2 py-0.5 text-[11px] text-text-tertiary hover:border-text-disabled hover:text-text-secondary"
        >
          + Heft verknüpfen
        </button>
      </div>
      {pickerOpen && (
        <HeftPickerModal
          subjectId={subjectId}
          onClose={() => setPickerOpen(false)}
          onPick={(link) => {
            onChange([...value, link])
            setPickerOpen(false)
          }}
        />
      )}
    </div>
  )
}
