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
    <section className="rounded-lg border border-border bg-bg-1 p-4">
      <h2 className="text-[13px] font-semibold text-text-primary">{title}</h2>
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
    return <p className="text-text-tertiary">Lädt...</p>
  }

  return (
    <div className="space-y-5">
      <h1 className="text-[15px] font-semibold text-text-primary">Einstellungen</h1>

      <SettingsSection title="Schuljahr">
        <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
          <label className="text-sm text-text-secondary">
            Klassenstufe
            <select
              value={gradeLevel}
              onChange={(e) => setGradeLevel(Number(e.target.value))}
              className="dark:[color-scheme:dark] mt-1 block rounded-md border border-border bg-bg-muted px-3 py-2 text-sm text-text-primary"
            >
              {GRADE_LEVELS.map((level) => (
                <option key={level} value={level}>
                  Klasse {level}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm text-text-secondary">
            Bundesland
            <select
              value={federalState}
              onChange={(e) => setFederalState(e.target.value)}
              className="dark:[color-scheme:dark] mt-1 block rounded-md border border-border bg-bg-muted px-3 py-2 text-sm text-text-primary"
            >
              {FEDERAL_STATES.map((state) => (
                <option key={state.value} value={state.value}>
                  {state.label}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm text-text-secondary">
            Schuljahr (optional)
            <input
              value={schoolYearLabel}
              onChange={(e) => setSchoolYearLabel(e.target.value)}
              maxLength={20}
              placeholder="z.B. 2026/2027"
              className="mt-1 block rounded-md border border-border bg-bg-muted px-3 py-2 text-sm text-text-primary placeholder:text-text-muted"
            />
          </label>

          <button
            type="submit"
            disabled={updateSettings.isPending}
            className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-ink disabled:opacity-50"
          >
            Speichern
          </button>
          {saved && <p className="text-sm text-green-400">Gespeichert.</p>}
          {error && <p className="text-sm text-red-400">{error}</p>}
        </form>
      </SettingsSection>

      <SettingsSection title="Fächer">
        <SubjectManager />
      </SettingsSection>

      <SettingsSection title="Stundenplan">
        <div className="space-y-5">
          <div>
            <h3 className="font-mono text-[10px] tracking-wider text-text-tertiary">
              ZEITRASTER
            </h3>
            <div className="mt-2">
              <TimeGridEditor />
            </div>
          </div>
          <div className="border-t border-border-subtle pt-5">
            <h3 className="font-mono text-[10px] tracking-wider text-text-tertiary">
              ZUORDNUNG
            </h3>
            <div className="mt-2">
              <TimetableGrid />
            </div>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection title="Kalender">
        <HolidayImportForm />
      </SettingsSection>

      <SettingsSection title="Konto">
        <button
          onClick={() => void logout()}
          className="rounded-md border border-border px-4 py-2 text-sm text-text-secondary hover:bg-bg-hover"
        >
          Abmelden
        </button>
      </SettingsSection>
    </div>
  )
}
