import { useState, type FormEvent } from 'react'
import { ApiRequestError } from '../../lib/apiClient'
import { FEDERAL_STATES } from '../../lib/federalStates'
import { useAuth } from '../auth/AuthContext'
import { useImportHolidays } from './hooks'

export function HolidayImportForm() {
  const { settings } = useAuth()
  const importHolidays = useImportHolidays()
  const [importYear, setImportYear] = useState(new Date().getFullYear())
  const [importState, setImportState] = useState(settings?.federalState ?? 'BW')
  const [importMessage, setImportMessage] = useState<string | null>(null)

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

  return (
    <div>
      <form onSubmit={handleImport} className="flex flex-wrap items-end gap-3">
        <label className="text-sm text-text-secondary">
          Jahr
          <input
            type="number"
            value={importYear}
            onChange={(e) => setImportYear(Number(e.target.value))}
            className="mt-1 block w-24 rounded-md border border-border bg-bg-muted px-3 py-2 text-sm text-text-primary"
          />
        </label>
        <label className="text-sm text-text-secondary">
          Bundesland
          <select
            value={importState}
            onChange={(e) => setImportState(e.target.value)}
            className="[color-scheme:dark] mt-1 block rounded-md border border-border bg-bg-muted px-3 py-2 text-sm text-text-primary"
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
          className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-ink disabled:opacity-50"
        >
          Importieren
        </button>
      </form>
      {importMessage && <p className="mt-2 text-sm text-text-secondary">{importMessage}</p>}
    </div>
  )
}
