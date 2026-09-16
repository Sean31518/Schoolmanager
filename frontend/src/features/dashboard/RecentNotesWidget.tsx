import { Link } from 'react-router-dom'
import { formatRelativeTime } from '../../lib/relativeTime'
import type { RecentlyViewedNoteDto } from './types'

export function RecentNotesWidget({ notes }: { notes: RecentlyViewedNoteDto[] }) {
  return (
    <div className="rounded-lg border border-border bg-bg-1">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="font-mono text-[10px] tracking-wider text-text-tertiary">
          ZULETZT BEARBEITET
        </span>
      </div>
      {notes.length === 0 ? (
        <p className="px-3 py-3 text-sm text-text-tertiary">Noch keine Notiz geöffnet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-2 p-2.5 sm:grid-cols-4">
          {notes.map((note) => (
            <Link
              key={note.id}
              to={`/subjects/${note.subjectId}/sections/${note.sectionTypeId}/notes/${note.id}`}
              className="flex min-w-0 flex-col gap-1.5 rounded-md border border-border-subtle px-2.5 py-2 hover:border-border"
            >
              <span className="flex items-center gap-1.5">
                <span
                  className="h-[7px] w-[7px] shrink-0 rounded-[2px]"
                  style={{ backgroundColor: note.subjectColor }}
                />
                <span className="min-w-0 flex-1 truncate font-mono text-[9px] tracking-wider text-text-tertiary">
                  {note.subjectName.toUpperCase()}
                </span>
              </span>
              <span className="truncate text-xs font-semibold leading-tight text-text-primary">
                {note.title}
              </span>
              <span className="font-mono text-[9px] text-text-muted">
                {formatRelativeTime(note.lastViewedAt)}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
