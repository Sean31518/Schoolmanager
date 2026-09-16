import { useState, type FormEvent } from 'react'
import { ApiRequestError } from '../../lib/apiClient'
import { useCreateCalendarEvent } from '../calendar/hooks'
import { useSubjects } from '../subjects/hooks'

export function CreateTerminModal({ onClose }: { onClose: () => void }) {
  const { data: subjects } = useSubjects()
  const createEvent = useCreateCalendarEvent()

  const [title, setTitle] = useState('')
  const [type, setType] = useState<'MANUAL' | 'EXAM'>('MANUAL')
  const [startDate, setStartDate] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await createEvent.mutateAsync({ title, type, startDate, subjectId: subjectId || null })
      onClose()
    } catch (err) {
      setError(
        err instanceof ApiRequestError ? err.message : 'Termin konnte nicht angelegt werden',
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
        <h2 className="text-[15px] font-semibold text-text-primary">Neuer Termin</h2>

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
          Typ
          <select
            value={type}
            onChange={(e) => setType(e.target.value as 'MANUAL' | 'EXAM')}
            className="mt-1 block w-full rounded-md border border-border bg-bg-muted px-3 py-2 text-sm text-text-primary"
          >
            <option value="MANUAL">Termin</option>
            <option value="EXAM">Klausur</option>
          </select>
        </label>

        <label className="mt-3 block text-sm text-text-secondary">
          Datum
          <input
            type="date"
            required
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="mt-1 block w-full rounded-md border border-border bg-bg-muted px-3 py-2 text-sm text-text-primary"
          />
        </label>

        <label className="mt-3 block text-sm text-text-secondary">
          Fach (optional)
          <select
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            className="mt-1 block w-full rounded-md border border-border bg-bg-muted px-3 py-2 text-sm text-text-primary"
          >
            <option value="">–</option>
            {(subjects ?? []).map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
        </label>

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

        <div className="mt-5 flex items-center gap-3">
          <button
            type="submit"
            disabled={createEvent.isPending}
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
