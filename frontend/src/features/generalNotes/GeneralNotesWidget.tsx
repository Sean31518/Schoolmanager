import { GeneralNoteCard } from './GeneralNoteCard'
import { useCreateGeneralNote } from './hooks'
import type { GeneralNoteDto } from './types'

export function GeneralNotesWidget({ notes }: { notes: GeneralNoteDto[] }) {
  const createNote = useCreateGeneralNote()

  return (
    <div className="rounded-lg border border-border bg-bg-1">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="font-mono text-[10px] tracking-wider text-text-tertiary">NOTIZEN</span>
        <button
          onClick={() =>
            void createNote.mutateAsync({ contentJson: { type: 'doc', content: [] } })
          }
          className="rounded-md bg-accent px-2.5 py-1 text-xs font-semibold text-accent-ink"
        >
          Neue Notiz
        </button>
      </div>
      <div className="space-y-2 p-2.5">
        {notes.map((note) => (
          <GeneralNoteCard key={note.id} note={note} />
        ))}
        {notes.length === 0 && <p className="text-sm text-text-tertiary">Noch keine Notizen.</p>}
      </div>
    </div>
  )
}
