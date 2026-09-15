import { useState } from 'react'
import { Link } from 'react-router-dom'
import { formatRelativeTime } from '../../lib/relativeTime'
import { useSubject } from '../subjects/hooks'
import { useSubjectNotes } from './hooks'

export function NoteListSidebar({
  subjectId,
  activeNoteId,
}: {
  subjectId: string
  activeNoteId: string
}) {
  const { data: subject } = useSubject(subjectId)
  const { data: notes, isLoading } = useSubjectNotes(subjectId)
  const [query, setQuery] = useState('')

  const filtered = (notes ?? []).filter((note) => {
    if (!query.trim()) return true
    const haystack = `${note.title} ${note.topicName} ${note.sectionTypeName}`.toLowerCase()
    return haystack.includes(query.trim().toLowerCase())
  })

  return (
    <div className="flex w-[248px] shrink-0 flex-col border-r border-border">
      <div className="flex flex-col gap-2 border-b border-border p-3.5">
        <div className="flex items-center gap-2">
          {subject && (
            <span
              className="h-[9px] w-[9px] shrink-0 rounded-[2px]"
              style={{ backgroundColor: subject.color }}
            />
          )}
          <span className="truncate text-sm font-semibold text-text-primary">
            {subject?.name}
          </span>
          <span className="ml-auto font-mono text-[10px] text-text-tertiary">
            {notes?.length ?? 0}
          </span>
        </div>
        <label className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs text-text-muted focus-within:border-text-disabled">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-[13px] w-[13px] shrink-0"
          >
            <path d="m21 21-4.34-4.34" />
            <circle cx="11" cy="11" r="8" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`In ${subject?.name ?? 'Fach'} suchen`}
            className="w-full bg-transparent text-xs text-text-primary placeholder:text-text-muted focus:outline-none"
          />
        </label>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {isLoading && <p className="p-3 text-xs text-text-tertiary">Lädt...</p>}
        {!isLoading && filtered.length === 0 && (
          <p className="p-3 text-xs text-text-tertiary">Keine Notizen gefunden.</p>
        )}
        {filtered.map((note) => {
          const isActive = note.id === activeNoteId
          return (
            <Link
              key={note.id}
              to={`/subjects/${subjectId}/sections/${note.sectionTypeId}/topics/${note.topicId}/notes/${note.id}`}
              className={
                isActive
                  ? 'block border-t border-border-subtle bg-bg-hover px-3.5 py-2.5 shadow-[inset_3px_0_0_var(--color-accent)]'
                  : 'block border-t border-border-subtle px-3.5 py-2.5 hover:bg-bg-hover/50'
              }
            >
              <div
                className={
                  isActive
                    ? 'truncate text-[12.5px] font-semibold text-text-primary'
                    : 'truncate text-[12.5px] font-medium text-text-secondary'
                }
              >
                {note.title}
              </div>
              <div className="mt-0.5 font-mono text-[10px] text-text-muted">
                {note.topicName.toUpperCase()} · {formatRelativeTime(note.updatedAt)}
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
