import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { ApiRequestError } from '../../lib/apiClient'
import { FEDERAL_STATES } from '../../lib/federalStates'
import { useAuth } from '../auth/AuthContext'
import { HolidayImportForm } from '../calendar/HolidayImportForm'
import { SubjectManager } from '../subjects/SubjectManager'
import { TimeGridEditor } from '../timetable/TimeGridEditor'
import { TimetableGrid } from '../timetable/TimetableGrid'
import { useSettings, useUpdateSettings } from './hooks'

const GRADE_LEVELS = Array.from({ length: 13 }, (_, i) => i + 1)

function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-6 rounded-lg bg-white p-4 shadow-sm dark:bg-slate-800">
      <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  )
}

export function SettingsPage() {
  const { data: settings, isLoading } = useSettings()
  const updateSettings = useUpdateSettings()
  const { logout } = useAuth()

  const [gradeLevel, setGradeLevel] = useState(5)
  const [federalState, setFederalState] = useState('BW')
  const [schoolYearLabel, setSchoolYearLabel] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (settings) {
      setGradeLevel(settings.currentGradeLevel)
      setFederalState(settings.federalState)
      setSchoolYearLabel(settings.currentSchoolYearLabel ?? '')
    }
  }, [settings])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSaved(false)
    try {
      await updateSettings.mutateAsync({
        currentGradeLevel: gradeLevel,
        federalState,
        currentSchoolYearLabel: schoolYearLabel.trim() === '' ? null : schoolYearLabel.trim(),
      })
      setSaved(true)
    } catch (err) {
      setError(
        err instanceof ApiRequestError ? err.message : 'Einstellungen konnten nicht gespeichert werden',
      )
    }
  }

  if (isLoading || !settings) {
    return <p className="text-slate-400 dark:text-slate-500">Lädt...</p>
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">Einstellungen</h1>

      <form
        onSubmit={handleSubmit}
        className="mt-4 flex max-w-md flex-col gap-4 rounded-lg bg-white p-4 shadow-sm dark:bg-slate-800"
      >
        <label className="text-sm text-slate-600 dark:text-slate-300">
          Klassenstufe
          <select
            value={gradeLevel}
            onChange={(e) => setGradeLevel(Number(e.target.value))}
            className="mt-1 block rounded border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          >
            {GRADE_LEVELS.map((level) => (
              <option key={level} value={level}>
                Klasse {level}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm text-slate-600 dark:text-slate-300">
          Bundesland
          <select
            value={federalState}
            onChange={(e) => setFederalState(e.target.value)}
            className="mt-1 block rounded border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          >
            {FEDERAL_STATES.map((state) => (
              <option key={state.value} value={state.value}>
                {state.label}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm text-slate-600 dark:text-slate-300">
          Schuljahr (optional)
          <input
            value={schoolYearLabel}
            onChange={(e) => setSchoolYearLabel(e.target.value)}
            maxLength={20}
            placeholder="z.B. 2026/2027"
            className="mt-1 block rounded border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          />
        </label>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={updateSettings.isPending}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Speichern
          </button>
          {saved && <p className="text-sm text-green-600 dark:text-green-400">Gespeichert.</p>}
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        </div>
      </form>

      <SettingsSection title="Fächer verwalten">
        <SubjectManager />
      </SettingsSection>

      <SettingsSection title="Zeitraster">
        <TimeGridEditor />
      </SettingsSection>

      <SettingsSection title="Stundenplan">
        <TimetableGrid />
      </SettingsSection>

      <SettingsSection title="Ferien & Feiertage importieren">
        <HolidayImportForm />
      </SettingsSection>

      <section className="mt-6 rounded-lg bg-white p-4 shadow-sm dark:bg-slate-800">
        <button
          onClick={() => void logout()}
          className="rounded border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-700"
        >
          Abmelden
        </button>
      </section>
    </div>
  )
}
