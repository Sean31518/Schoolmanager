import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ApiRequestError } from '../../lib/apiClient'
import { useSubjects } from '../subjects/hooks'
import { useCalendarEvents, useCreateCalendarEvent, useDeleteCalendarEvent } from './hooks'
import type { CalendarEventDto, CalendarEventType } from './types'

const TYPE_LABELS: Record<CalendarEventType, string> = {
  MANUAL: 'Termin',
  EXAM: 'Klausur',
  HOLIDAY: 'Ferien',
  PUBLIC_HOLIDAY: 'Feiertag',
}

const TYPE_COLORS: Record<CalendarEventType, string> = {
  MANUAL: '#3B82F6',
  EXAM: '#EF4444',
  HOLIDAY: '#22C55E',
  PUBLIC_HOLIDAY: '#F59E0B',
}

const WEEKDAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
}

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
  const deleteEvent = useDeleteCalendarEvent()

  const [title, setTitle] = useState('')
  const [type, setType] = useState<'MANUAL' | 'EXAM'>('MANUAL')
  const [startDate, setStartDate] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [error, setError] = useState<string | null>(null)

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

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEventDto[]>()
    for (const event of events ?? []) {
      const key = event.startDate.slice(0, 10)
      const list = map.get(key) ?? []
      list.push(event)
      map.set(key, list)
    }
    return map
  }, [events])

  const monthLabel = new Date(Date.UTC(year, month, 1)).toLocaleDateString('de-DE', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">Kalender</h1>
        <div className="flex items-center gap-2 text-sm">
          <button
            onClick={() => goToMonth(-1)}
            className="rounded border border-slate-300 px-2 py-1 dark:border-slate-600 dark:text-slate-200"
          >
            ←
          </button>
          <span className="min-w-[10rem] text-center font-medium capitalize text-slate-800 dark:text-slate-100">
            {monthLabel}
          </span>
          <button
            onClick={() => goToMonth(1)}
            className="rounded border border-slate-300 px-2 py-1 dark:border-slate-600 dark:text-slate-200"
          >
            →
          </button>
        </div>
      </div>

      <p className="text-sm text-slate-500 dark:text-slate-400">
        Ferien &amp; Feiertage importieren?{' '}
        <Link to="/settings" className="text-blue-600 hover:underline dark:text-blue-400">
          In den Einstellungen
        </Link>
      </p>

      <div className="rounded-lg bg-white p-4 shadow-sm dark:bg-slate-800">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Neuer Termin</h2>
        <form onSubmit={handleCreate} className="mt-3 flex flex-wrap items-end gap-3">
          <label className="text-sm text-slate-600 dark:text-slate-300">
            Titel
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 block rounded border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>
          <label className="text-sm text-slate-600 dark:text-slate-300">
            Typ
            <select
              value={type}
              onChange={(e) => setType(e.target.value as 'MANUAL' | 'EXAM')}
              className="mt-1 block rounded border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="MANUAL">Termin</option>
              <option value="EXAM">Klausur</option>
            </select>
          </label>
          <label className="text-sm text-slate-600 dark:text-slate-300">
            Datum
            <input
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 block rounded border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>
          <label className="text-sm text-slate-600 dark:text-slate-300">
            Fach (optional)
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="mt-1 block rounded border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
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
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Anlegen
          </button>
        </form>
        {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
      </div>

      <div className="rounded-lg bg-white p-4 shadow-sm dark:bg-slate-800">
        {isLoading ? (
          <p className="text-slate-400 dark:text-slate-500">Lädt...</p>
        ) : (
          <>
            <div className="grid grid-cols-7 gap-px overflow-hidden rounded border border-slate-200 bg-slate-200 text-xs font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-700 dark:text-slate-400">
              {WEEKDAY_LABELS.map((label) => (
                <div key={label} className="bg-slate-50 px-2 py-1 text-center dark:bg-slate-800">
                  {label}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-px overflow-hidden rounded border border-t-0 border-slate-200 bg-slate-200 dark:border-slate-700 dark:bg-slate-700">
              {monthGrid.map((day) => {
                const dayKey = toDateKey(day)
                const isCurrentMonth = day.getUTCMonth() === month
                const dayEvents = eventsByDay.get(dayKey) ?? []
                const isToday = dayKey === todayKey
                return (
                  <div
                    key={dayKey}
                    className={
                      isCurrentMonth
                        ? 'min-h-[6rem] bg-white p-1.5 dark:bg-slate-800'
                        : 'min-h-[6rem] bg-slate-50 p-1.5 dark:bg-slate-900'
                    }
                  >
                    <div
                      className={
                        isToday
                          ? 'inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white'
                          : isCurrentMonth
                            ? 'text-xs font-medium text-slate-600 dark:text-slate-300'
                            : 'text-xs font-medium text-slate-300 dark:text-slate-600'
                      }
                    >
                      {day.getUTCDate()}
                    </div>
                    <div className="mt-1 space-y-0.5">
                      {dayEvents.slice(0, 3).map((event) =>
                        event.type === 'EXAM' ? (
                          <Link
                            key={event.id}
                            to={`/exams/${event.id}`}
                            title={`${event.title} – Klausurvorbereitung öffnen`}
                            className="group flex items-center gap-1 truncate rounded px-1 py-0.5 text-[11px] font-medium text-white"
                            style={{ backgroundColor: TYPE_COLORS[event.type] }}
                          >
                            <span className="truncate">{event.title}</span>
                            <button
                              onClick={(e) => {
                                e.preventDefault()
                                void deleteEvent.mutateAsync(event.id)
                              }}
                              className="ml-auto hidden flex-shrink-0 group-hover:inline"
                              aria-label="Löschen"
                            >
                              ×
                            </button>
                          </Link>
                        ) : (
                          <div
                            key={event.id}
                            title={`${event.title}${event.endDate ? ` – ${formatDay(event.endDate)}` : ''}`}
                            className="group flex items-center gap-1 truncate rounded px-1 py-0.5 text-[11px] font-medium text-white"
                            style={{ backgroundColor: TYPE_COLORS[event.type] }}
                          >
                            <span className="truncate">{event.title}</span>
                            {event.type === 'MANUAL' && (
                              <button
                                onClick={() => void deleteEvent.mutateAsync(event.id)}
                                className="ml-auto hidden flex-shrink-0 group-hover:inline"
                                aria-label="Löschen"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        ),
                      )}
                      {dayEvents.length > 3 && (
                        <div className="text-[11px] text-slate-400 dark:text-slate-500">
                          +{dayEvents.length - 3} mehr
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
              {(Object.keys(TYPE_LABELS) as CalendarEventType[]).map((t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: TYPE_COLORS[t] }}
                  />
                  {TYPE_LABELS[t]}
                </span>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
