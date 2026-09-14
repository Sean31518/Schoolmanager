import { useMemo, useState, type FormEvent } from 'react'
import { ApiRequestError } from '../../lib/apiClient'
import { useAuth } from '../auth/AuthContext'
import {
  useCalendarEvents,
  useCreateCalendarEvent,
  useDeleteCalendarEvent,
  useImportHolidays,
} from './hooks'
import type { CalendarEventDto, CalendarEventType } from './types'

const FEDERAL_STATES: { value: string; label: string }[] = [
  { value: 'BW', label: 'Baden-Württemberg' },
  { value: 'BY', label: 'Bayern' },
  { value: 'BE', label: 'Berlin' },
  { value: 'BB', label: 'Brandenburg' },
  { value: 'HB', label: 'Bremen' },
  { value: 'HH', label: 'Hamburg' },
  { value: 'HE', label: 'Hessen' },
  { value: 'MV', label: 'Mecklenburg-Vorpommern' },
  { value: 'NI', label: 'Niedersachsen' },
  { value: 'NW', label: 'Nordrhein-Westfalen' },
  { value: 'RP', label: 'Rheinland-Pfalz' },
  { value: 'SL', label: 'Saarland' },
  { value: 'SN', label: 'Sachsen' },
  { value: 'ST', label: 'Sachsen-Anhalt' },
  { value: 'SH', label: 'Schleswig-Holstein' },
  { value: 'TH', label: 'Thüringen' },
]

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

function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
}

export function CalendarPage() {
  const { settings } = useAuth()
  const [year, setYear] = useState(new Date().getFullYear())
  const { data: events, isLoading } = useCalendarEvents({
    from: `${year}-01-01`,
    to: `${year}-12-31`,
  })
  const createEvent = useCreateCalendarEvent()
  const deleteEvent = useDeleteCalendarEvent()
  const importHolidays = useImportHolidays()

  const [title, setTitle] = useState('')
  const [type, setType] = useState<'MANUAL' | 'EXAM'>('MANUAL')
  const [startDate, setStartDate] = useState('')
  const [error, setError] = useState<string | null>(null)

  const [importYear, setImportYear] = useState(year)
  const [importState, setImportState] = useState(settings?.federalState ?? 'BW')
  const [importMessage, setImportMessage] = useState<string | null>(null)

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await createEvent.mutateAsync({ title, type, startDate })
      setTitle('')
      setStartDate('')
    } catch (err) {
      setError(
        err instanceof ApiRequestError ? err.message : 'Termin konnte nicht angelegt werden',
      )
    }
  }

  async function handleImport(e: FormEvent) {
    e.preventDefault()
    setImportMessage(null)
    try {
      const result = await importHolidays.mutateAsync({
        year: importYear,
        federalState: importState,
      })
      setImportMessage(
        `${result.imported} neu, ${result.updated} aktualisiert, ${result.skipped} unverändert` +
          (result.errors.length > 0 ? ` – Fehler: ${result.errors.join('; ')}` : ''),
      )
    } catch (err) {
      setImportMessage(err instanceof ApiRequestError ? err.message : 'Import fehlgeschlagen')
    }
  }

  const grouped = useMemo(() => {
    const map = new Map<string, CalendarEventDto[]>()
    for (const event of events ?? []) {
      const month = event.startDate.slice(0, 7)
      const list = map.get(month) ?? []
      list.push(event)
      map.set(month, list)
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [events])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-800">Kalender</h1>
        <div className="flex items-center gap-2 text-sm">
          <button
            onClick={() => setYear((y) => y - 1)}
            className="rounded border border-slate-300 px-2 py-1"
          >
            ←
          </button>
          <span className="font-medium">{year}</span>
          <button
            onClick={() => setYear((y) => y + 1)}
            className="rounded border border-slate-300 px-2 py-1"
          >
            →
          </button>
        </div>
      </div>

      <div className="rounded-lg bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800">Ferien &amp; Feiertage importieren</h2>
        <form onSubmit={handleImport} className="mt-3 flex flex-wrap items-end gap-3">
          <label className="text-sm text-slate-600">
            Jahr
            <input
              type="number"
              value={importYear}
              onChange={(e) => setImportYear(Number(e.target.value))}
              className="mt-1 block w-24 rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm text-slate-600">
            Bundesland
            <select
              value={importState}
              onChange={(e) => setImportState(e.target.value)}
              className="mt-1 block rounded border border-slate-300 px-3 py-2 text-sm"
            >
              {FEDERAL_STATES.map((state) => (
                <option key={state.value} value={state.value}>
                  {state.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            disabled={importHolidays.isPending}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Importieren
          </button>
        </form>
        {importMessage && <p className="mt-2 text-sm text-slate-600">{importMessage}</p>}
      </div>

      <div className="rounded-lg bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800">Neuer Termin</h2>
        <form onSubmit={handleCreate} className="mt-3 flex flex-wrap items-end gap-3">
          <label className="text-sm text-slate-600">
            Titel
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 block rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm text-slate-600">
            Typ
            <select
              value={type}
              onChange={(e) => setType(e.target.value as 'MANUAL' | 'EXAM')}
              className="mt-1 block rounded border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="MANUAL">Termin</option>
              <option value="EXAM">Klausur</option>
            </select>
          </label>
          <label className="text-sm text-slate-600">
            Datum
            <input
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 block rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <button
            type="submit"
            disabled={createEvent.isPending}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Anlegen
          </button>
        </form>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>

      {isLoading ? (
        <p className="text-slate-400">Lädt...</p>
      ) : grouped.length === 0 ? (
        <p className="text-slate-400">Keine Termine in {year}.</p>
      ) : (
        <div className="space-y-4">
          {grouped.map(([month, monthEvents]) => (
            <div key={month} className="rounded-lg bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-500">
                {new Date(`${month}-01`).toLocaleDateString('de-DE', {
                  month: 'long',
                  year: 'numeric',
                })}
              </h3>
              <ul className="mt-2 space-y-1">
                {monthEvents.map((event) => (
                  <li key={event.id} className="flex items-center gap-3 text-sm">
                    <span
                      className="rounded px-1.5 py-0.5 text-xs font-medium text-white"
                      style={{ backgroundColor: TYPE_COLORS[event.type] }}
                    >
                      {TYPE_LABELS[event.type]}
                    </span>
                    <span className="text-slate-500">
                      {formatDay(event.startDate)}
                      {event.endDate && ` – ${formatDay(event.endDate)}`}
                    </span>
                    <span className="flex-1 text-slate-800">{event.title}</span>
                    {(event.type === 'MANUAL' || event.type === 'EXAM') && (
                      <button
                        onClick={() => void deleteEvent.mutateAsync(event.id)}
                        className="text-xs text-slate-400 hover:text-red-600"
                      >
                        Löschen
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
