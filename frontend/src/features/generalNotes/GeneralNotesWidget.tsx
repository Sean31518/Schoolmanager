import { GeneralNoteCard } from './GeneralNoteCard'
import { useCreateGeneralNote } from './hooks'
import type { GeneralNoteDto } from './types'

export function GeneralNotesWidget({ notes }: { notes: GeneralNoteDto[] }) {
  const createNote = useCreateGeneralNote()

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">Notizen</h2>
        <button
          onClick={() =>
            void createNote.mutateAsync({ contentJson: { type: 'doc', content: [] } })
          }
          className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white"
        >
          Neue Notiz
        </button>
      </div>
      <div className="mt-3 space-y-3">
        {notes.map((note) => (
          <GeneralNoteCard key={note.id} note={note} />
        ))}
        {notes.length === 0 && <p className="text-sm text-slate-400">Noch keine Notizen.</p>}
      </div>
    </div>
  )
}
