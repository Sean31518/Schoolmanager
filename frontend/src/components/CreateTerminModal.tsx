import { useState, type FormEvent } from 'react'
import { ApiRequestError } from '../lib/apiClient'
import { useCreateCalendarEvent } from '../features/calendar/hooks'
import { LinkEditor } from '../features/hefte/HeftLinks'
import { toLinkInputs, type DraftLink } from '../features/hefte/types'
import { useSubjects } from '../features/subjects/hooks'
import { ToggleSwitch } from './ToggleSwitch'

export function CreateTerminModal({
  onClose,
  defaultType = 'MANUAL',
}: {
  onClose: () => void
  defaultType?: 'MANUAL' | 'EXAM'
}) {
  const { data: subjects } = useSubjects()
  const createEvent = useCreateCalendarEvent()

  const [title, setTitle] = useState('')
  const [type, setType] = useState<'MANUAL' | 'EXAM'>(defaultType)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [allDay, setAllDay] = useState(true)
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [color, setColor] = useState('#3B82F6')
  const [useColor, setUseColor] = useState(false)
  const [links, setLinks] = useState<DraftLink[]>([])
  const [error, setError] = useState<string | null>(null)

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await createEvent.mutateAsync({
        title,
        type,
        startDate,
        endDate: endDate || null,
        allDay,
        startTime: allDay ? null : startTime || null,
        endTime: allDay ? null : endTime || null,
        subjectId: subjectId || null,
        color: useColor ? color : null,
        links: toLinkInputs(links),
      })
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
        <h2 className="text-[15px] font-semibold text-text-primary">
          {type === 'EXAM' ? 'Neue Klausur' : 'Neuer Termin'}
        </h2>

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

        <div className="mt-3 flex items-center gap-3">
          <ToggleSwitch checked={!allDay} onClick={() => setAllDay((v) => !v)} />
          <p className="text-sm text-text-primary">Uhrzeit festlegen</p>
        </div>

        {!allDay && (
          <div className="mt-3 flex gap-3">
            <label className="flex-1 text-sm text-text-secondary">
              Startzeit
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="mt-1 block w-full rounded-md border border-border bg-bg-muted px-3 py-2 text-sm text-text-primary"
              />
            </label>
            <label className="flex-1 text-sm text-text-secondary">
              Endzeit (optional)
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="mt-1 block w-full rounded-md border border-border bg-bg-muted px-3 py-2 text-sm text-text-primary"
              />
            </label>
          </div>
        )}

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
              value={color}
              disabled={!useColor}
              onChange={(e) => setColor(e.target.value)}
              className="mt-1 block h-9 w-14 rounded-md border border-border disabled:opacity-40"
            />
          </label>
          <button
            type="button"
            onClick={() => setUseColor((v) => !v)}
            className="text-sm text-text-muted hover:text-accent-text"
          >
            {useColor ? 'Automatische Farbe verwenden' : 'Eigene Farbe festlegen'}
          </button>
        </div>

        <div className="mt-3 text-sm text-text-secondary">
          {type === 'EXAM' ? 'Lernstoff: Hefte / Seiten (optional)' : 'Hefte / Seiten (optional)'}
          <div className="mt-1.5">
            <LinkEditor value={links} onChange={setLinks} subjectId={subjectId || null} />
          </div>
        </div>

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
