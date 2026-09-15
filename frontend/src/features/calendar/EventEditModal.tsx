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
        className="w-full max-w-md rounded-lg bg-white p-5 shadow-lg dark:bg-slate-800"
      >
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
          Termin bearbeiten
        </h2>

        <label className="mt-3 block text-sm text-slate-600 dark:text-slate-300">
          Titel
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 block w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          />
        </label>

        {canRetype && (
          <label className="mt-3 block text-sm text-slate-600 dark:text-slate-300">
            Typ
            <select
              value={type}
              onChange={(e) => setType(e.target.value as 'MANUAL' | 'EXAM')}
              className="mt-1 block w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="MANUAL">Termin</option>
              <option value="EXAM">Klausur</option>
            </select>
          </label>
        )}

        <div className="mt-3 flex gap-3">
          <label className="flex-1 text-sm text-slate-600 dark:text-slate-300">
            Von
            <input
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 block w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>
          <label className="flex-1 text-sm text-slate-600 dark:text-slate-300">
            Bis (optional, für mehrtägig)
            <input
              type="date"
              value={endDate}
              min={startDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 block w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>
        </div>

        <label className="mt-3 block text-sm text-slate-600 dark:text-slate-300">
          Fach (optional)
          <select
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            className="mt-1 block w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
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
          <label className="text-sm text-slate-600 dark:text-slate-300">
            Farbe
            <input
              type="color"
              value={effectiveColor}
              onChange={(e) => setColor(e.target.value)}
              className="mt-1 block h-9 w-14 rounded border border-slate-300 dark:border-slate-600"
            />
          </label>
          {color && (
            <button
              type="button"
              onClick={() => setColor(null)}
              className="text-sm text-slate-400 hover:text-blue-600 dark:text-slate-500 dark:hover:text-blue-400"
            >
              Automatische Farbe verwenden
            </button>
          )}
        </div>

        {event.type === 'EXAM' && (
          <p className="mt-3 text-sm">
            <Link
              to={`/exams/${event.id}`}
              className="text-blue-600 hover:underline dark:text-blue-400"
            >
              Klausurvorbereitung öffnen →
            </Link>
          </p>
        )}

        {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div className="mt-5 flex items-center gap-3">
          <button
            type="submit"
            disabled={updateEvent.isPending}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Speichern
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-700"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={() => void handleDelete()}
            className="ml-auto text-sm text-red-600 hover:underline dark:text-red-400"
          >
            Löschen
          </button>
        </div>
      </form>
    </div>
  )
}
