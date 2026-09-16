import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ApiRequestError } from '../../lib/apiClient'
import { useSubjects } from '../subjects/hooks'
import { getEffectiveColor } from './eventColors'
import { useDeleteCalendarEvent, useUpdateCalendarEvent } from './hooks'
import type { CalendarEventDto } from './types'

export function EventEditModal({
  event,
  onClose,
}: {
  event: CalendarEventDto
  onClose: () => void
}) {
  const { data: subjects } = useSubjects()
  const updateEvent = useUpdateCalendarEvent()
  const deleteEvent = useDeleteCalendarEvent()

  const canRetype = event.type === 'MANUAL' || event.type === 'EXAM'

  const [title, setTitle] = useState(event.title)
  const [type, setType] = useState<'MANUAL' | 'EXAM'>(
    event.type === 'EXAM' ? 'EXAM' : 'MANUAL',
  )
  const [startDate, setStartDate] = useState(event.startDate.slice(0, 10))
  const [endDate, setEndDate] = useState(event.endDate ? event.endDate.slice(0, 10) : '')
  const [subjectId, setSubjectId] = useState(event.subjectId ?? '')
  const [color, setColor] = useState(event.color)
  const [error, setError] = useState<string | null>(null)

  const effectiveColor = color ?? getEffectiveColor({ ...event, color: null })

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await updateEvent.mutateAsync({
        id: event.id,
        data: {
          title,
          ...(canRetype ? { type } : {}),
          startDate,
          endDate: endDate || null,
          subjectId: subjectId || null,
          color,
        },
      })
      onClose()
    } catch (err) {
      setError(
        err instanceof ApiRequestError ? err.message : 'Termin konnte nicht gespeichert werden',
      )
    }
  }

  async function handleDelete() {
    if (confirm(`"${event.title}" wirklich löschen?`)) {
      await deleteEvent.mutateAsync(event.id)
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <form
        onSubmit={handleSave}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-lg border border-border bg-bg-1 p-5 shadow-lg"
      >
        <h2 className="text-[15px] font-semibold text-text-primary">Termin bearbeiten</h2>

        <label className="mt-3 block text-sm text-text-secondary">
          Titel
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 block w-full rounded-md border border-border bg-bg-muted px-3 py-2 text-sm text-text-primary"
          />
        </label>

        {canRetype && (
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
        )}

        <div className="mt-3 flex gap-3">
          <label className="flex-1 text-sm text-text-secondary">
            Von
            <input
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 block w-full rounded-md border border-border bg-bg-muted px-3 py-2 text-sm text-text-primary"
            />
          </label>
          <label className="flex-1 text-sm text-text-secondary">
            Bis (optional, für mehrtägig)
            <input
              type="date"
              value={endDate}
              min={startDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 block w-full rounded-md border border-border bg-bg-muted px-3 py-2 text-sm text-text-primary"
            />
          </label>
        </div>

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

        <div className="mt-3 flex items-end gap-3">
          <label className="text-sm text-text-secondary">
            Farbe
            <input
              type="color"
              value={effectiveColor}
              onChange={(e) => setColor(e.target.value)}
              className="mt-1 block h-9 w-14 rounded-md border border-border"
            />
          </label>
          {color && (
            <button
              type="button"
              onClick={() => setColor(null)}
              className="text-sm text-text-muted hover:text-accent-text"
            >
              Automatische Farbe verwenden
            </button>
          )}
        </div>

        {event.type === 'EXAM' && (
          <p className="mt-3 text-sm">
            <Link to={`/exams/${event.id}`} className="text-accent-text hover:underline">
              Klausurvorbereitung öffnen →
            </Link>
          </p>
        )}

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

        <div className="mt-5 flex items-center gap-3">
          <button
            type="submit"
            disabled={updateEvent.isPending}
            className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-ink disabled:opacity-50"
          >
            Speichern
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border px-4 py-2 text-sm text-text-secondary hover:bg-bg-hover"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={() => void handleDelete()}
            className="ml-auto text-sm text-red-400 hover:underline"
          >
            Löschen
          </button>
        </div>
      </form>
    </div>
  )
}
