import { useState, type FormEvent } from 'react'
import { ApiRequestError } from '../lib/apiClient'
import { useCreateHomework } from '../features/homework/hooks'
import { useSubjectNotes } from '../features/notes/hooks'
import { useSubjects } from '../features/subjects/hooks'

export function CreateHausaufgabeModal({ onClose }: { onClose: () => void }) {
  const { data: subjects } = useSubjects()
  const createHomework = useCreateHomework()

  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [linkedNoteId, setLinkedNoteId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const { data: notes } = useSubjectNotes(subjectId)

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await createHomework.mutateAsync({
        title,
        dueDate: dueDate || null,
        subjectId: subjectId || null,
        linkedNoteId: linkedNoteId || null,
      })
      onClose()
    } catch (err) {
      setError(
        err instanceof ApiRequestError ? err.message : 'Hausaufgabe konnte nicht angelegt werden',
      )
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <form
        onSubmit={(e) => void handleCreate(e)}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-lg border border-border bg-bg-1 p-5 shadow-lg"
      >
        <h2 className="text-[15px] font-semibold text-text-primary">Neue Hausaufgabe</h2>

        <label className="mt-3 block text-sm text-text-secondary">
          Titel
          <input
            autoFocus
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 block w-full rounded-md border border-border bg-bg-muted px-3 py-2 text-sm text-text-primary"
          />
        </label>

        <label className="mt-3 block text-sm text-text-secondary">
          Fach (optional)
          <select
            value={subjectId}
            onChange={(e) => {
              setSubjectId(e.target.value)
              setLinkedNoteId('')
            }}
            className="mt-1 block w-full rounded-md border border-border bg-bg-muted px-3 py-2 text-sm text-text-primary"
          >
            <option value="">–</option>
            {(subjects ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>

        {subjectId && (
          <label className="mt-3 block text-sm text-text-secondary">
            Verknüpfte Notiz (optional)
            <select
              value={linkedNoteId}
              onChange={(e) => setLinkedNoteId(e.target.value)}
              className="mt-1 block w-full rounded-md border border-border bg-bg-muted px-3 py-2 text-sm text-text-primary"
            >
              <option value="">–</option>
              {(notes ?? []).map((note) => (
                <option key={note.id} value={note.id}>
                  {note.title}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="mt-3 block text-sm text-text-secondary">
          Fällig am (optional)
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="mt-1 block w-full rounded-md border border-border bg-bg-muted px-3 py-2 text-sm text-text-primary"
          />
        </label>

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

        <div className="mt-5 flex items-center gap-3">
          <button
            type="submit"
            disabled={createHomework.isPending}
            className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-ink disabled:opacity-50"
          >
            Anlegen
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border px-4 py-2 text-sm text-text-secondary hover:bg-bg-hover"
          >
            Abbrechen
          </button>
        </div>
      </form>
    </div>
  )
}
