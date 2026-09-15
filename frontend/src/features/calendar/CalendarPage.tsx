import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ApiRequestError } from '../../lib/apiClient'
import { useSubjects } from '../subjects/hooks'
import { EventEditModal } from './EventEditModal'
import { TYPE_COLORS, TYPE_LABELS } from './eventColors'
import { useCalendarEvents, useCreateCalendarEvent } from './hooks'
import { WeekRow } from './WeekRow'
import type { CalendarEventDto, CalendarEventType } from './types'

const WEEKDAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

function getMonthGrid(year: number, month: number) {
  const firstOfMonth = new Date(Date.UTC(year, month, 1))
  const startOffset = (firstOfMonth.getUTCDay() + 6) % 7 // Monday = 0
  const gridStart = new Date(firstOfMonth)
  gridStart.setUTCDate(gridStart.getUTCDate() - startOffset)

  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  const weeksNeeded = Math.ceil((startOffset + daysInMonth) / 7)

  const days: Date[] = []
  for (let i = 0; i < weeksNeeded * 7; i++) {
    const d = new Date(gridStart)
    d.setUTCDate(gridStart.getUTCDate() + i)
    days.push(d)
  }
  return days
}

export function CalendarPage() {
  const today = useMemo(() => new Date(), [])
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const todayKey = toDateKey(today)

  const monthGrid = useMemo(() => getMonthGrid(year, month), [year, month])
  const rangeFrom = toDateKey(monthGrid[0])
  const rangeTo = toDateKey(monthGrid[monthGrid.length - 1])

  const { data: events, isLoading } = useCalendarEvents({ from: rangeFrom, to: rangeTo })
  const { data: subjects } = useSubjects()
  const createEvent = useCreateCalendarEvent()

  const [title, setTitle] = useState('')
  const [type, setType] = useState<'MANUAL' | 'EXAM'>('MANUAL')
  const [startDate, setStartDate] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [editingEvent, setEditingEvent] = useState<CalendarEventDto | null>(null)

  function goToMonth(delta: number) {
    const next = new Date(Date.UTC(year, month + delta, 1))
    setYear(next.getUTCFullYear())
    setMonth(next.getUTCMonth())
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await createEvent.mutateAsync({ title, type, startDate, subjectId: subjectId || null })
      setTitle('')
      setStartDate('')
      setSubjectId('')
    } catch (err) {
      setError(
        err instanceof ApiRequestError ? err.message : 'Termin konnte nicht angelegt werden',
      )
    }
  }

  const weeks = useMemo(() => {
    const result: Date[][] = []
    for (let i = 0; i < monthGrid.length; i += 7) {
      result.push(monthGrid.slice(i, i + 7))
    }
    return result
  }, [monthGrid])

  const monthLabel = new Date(Date.UTC(year, month, 1)).toLocaleDateString('de-DE', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-[15px] font-semibold text-text-primary">Kalender</h1>
        <div className="flex items-center gap-2 text-sm">
          <button
            onClick={() => goToMonth(-1)}
            className="rounded-md border border-border px-2 py-1 text-text-secondary hover:border-text-disabled"
          >
            ←
          </button>
          <span className="min-w-[10rem] text-center text-[13px] font-medium capitalize text-text-primary">
            {monthLabel}
          </span>
          <button
            onClick={() => goToMonth(1)}
            className="rounded-md border border-border px-2 py-1 text-text-secondary hover:border-text-disabled"
          >
            →
          </button>
        </div>
      </div>

      <p className="text-sm text-text-tertiary">
        Ferien &amp; Feiertage importieren?{' '}
        <Link to="/settings" className="text-accent hover:underline">
          In den Einstellungen
        </Link>
      </p>

      <div className="rounded-lg border border-border bg-bg-1 p-4">
        <h2 className="text-[13px] font-semibold text-text-primary">Neuer Termin</h2>
        <form onSubmit={handleCreate} className="mt-3 flex flex-wrap items-end gap-3">
          <label className="text-sm text-text-secondary">
            Titel
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 block rounded-md border border-border bg-bg-muted px-3 py-2 text-sm text-text-primary"
            />
          </label>
          <label className="text-sm text-text-secondary">
            Typ
            <select
              value={type}
              onChange={(e) => setType(e.target.value as 'MANUAL' | 'EXAM')}
              className="mt-1 block rounded-md border border-border bg-bg-muted px-3 py-2 text-sm text-text-primary"
            >
              <option value="MANUAL">Termin</option>
              <option value="EXAM">Klausur</option>
            </select>
          </label>
          <label className="text-sm text-text-secondary">
            Datum
            <input
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 block rounded-md border border-border bg-bg-muted px-3 py-2 text-sm text-text-primary"
            />
          </label>
          <label className="text-sm text-text-secondary">
            Fach (optional)
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="mt-1 block rounded-md border border-border bg-bg-muted px-3 py-2 text-sm text-text-primary"
            >
              <option value="">–</option>
              {(subjects ?? []).map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            disabled={createEvent.isPending}
            className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-ink disabled:opacity-50"
          >
            Anlegen
          </button>
        </form>
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
      </div>

      <div className="rounded-lg border border-border bg-bg-1 p-4">
        {isLoading ? (
          <p className="text-text-tertiary">Lädt...</p>
        ) : (
          <>
            <div className="grid grid-cols-7 rounded-t-md border border-b-0 border-border-subtle font-mono text-[10px] tracking-wider text-text-muted">
              {WEEKDAY_LABELS.map((label) => (
                <div key={label} className="bg-bg-muted px-2 py-1 text-center">
                  {label}
                </div>
              ))}
            </div>
            <div className="overflow-hidden rounded-b-md border border-border-subtle">
              {weeks.map((week) => (
                <WeekRow
                  key={toDateKey(week[0])}
                  week={week}
                  month={month}
                  todayKey={todayKey}
                  events={events ?? []}
                  onEventClick={setEditingEvent}
                />
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-text-tertiary">
              {(Object.keys(TYPE_LABELS) as CalendarEventType[])
                .filter((t) => t !== 'MANUAL' && t !== 'EXAM')
                .map((t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <span
                    className="h-2.5 w-2.5 rounded-[2px]"
                    style={{ backgroundColor: TYPE_COLORS[t] }}
                  />
                  {TYPE_LABELS[t]}
                </span>
              ))}
            </div>
          </>
        )}
      </div>

      {editingEvent && (
        <EventEditModal event={editingEvent} onClose={() => setEditingEvent(null)} />
      )}
    </div>
  )
}
