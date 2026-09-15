import { Link } from 'react-router-dom'
import type { RecentlyViewedNoteDto } from './types'

export function RecentNotesWidget({ notes }: { notes: RecentlyViewedNoteDto[] }) {
  return (
    <div className="rounded-lg bg-white p-4 shadow-sm dark:bg-slate-800">
      <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
        Zuletzt besucht
      </h2>
      {notes.length === 0 ? (
        <p className="mt-2 text-sm text-slate-400 dark:text-slate-500">
          Noch keine Notiz geöffnet.
        </p>
      ) : (
        <ul className="mt-2 space-y-2">
          {notes.map((note) => (
            <li key={note.id}>
              <Link
                to={`/subjects/${note.subjectId}/sections/${note.sectionTypeId}/topics/${note.topicId}/notes/${note.id}`}
                className="block"
              >
                <div className="flex items-center gap-2 text-sm">
                  <span
                    className="h-2 w-2 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: note.subjectColor }}
                  />
                  <span className="flex-1 truncate text-slate-700 hover:text-blue-600 dark:text-slate-200 dark:hover:text-blue-400">
                    {note.title}
                  </span>
                </div>
                <div className="ml-4 truncate text-xs text-slate-400 dark:text-slate-500">
                  {note.subjectName} · {note.sectionTypeName} · {note.topicName}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
