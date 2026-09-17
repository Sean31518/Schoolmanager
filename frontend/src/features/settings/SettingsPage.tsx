import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import { apiFetch, ApiRequestError, getAccessToken } from '../../lib/apiClient'
import { FEDERAL_STATES } from '../../lib/federalStates'
import {
  disablePushNotifications,
  enablePushNotifications,
  getPushStatus,
  isPushSupported,
} from '../../lib/pushNotifications'
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

      <SettingsSection title="Erinnerungen">
        <NotificationsSettings />
      </SettingsSection>

      <SettingsSection title="Daten">
        <ExportDataButton />
        <ImportDataButton />
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

function ExportDataButton() {
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleExport() {
    setError(null)
    setIsExporting(true)
    try {
      const token = getAccessToken()
      const res = await fetch('/api/export', {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Export fehlgeschlagen')
      const blob = await res.blob()
      const disposition = res.headers.get('Content-Disposition') ?? ''
      const filename = disposition.match(/filename="([^"]+)"/)?.[1] ?? 'schulmanager-export.json'
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      setError('Export fehlgeschlagen. Bitte versuche es erneut.')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div>
      <p className="text-sm text-text-secondary">
        Lädt alle deine Daten (Fächer, Notizen, Hausaufgaben, Stundenplan, Termine) als JSON-Datei
        herunter. Angehängte Dateien (Bilder/PDFs) sind darin nur als Verweis enthalten, nicht mit
        ihrem Inhalt.
      </p>
      <button
        type="button"
        onClick={() => void handleExport()}
        disabled={isExporting}
        className="mt-3 rounded-md border border-border px-4 py-2 text-sm text-text-secondary hover:bg-bg-hover disabled:opacity-50"
      >
        {isExporting ? 'Exportiere...' : 'Alle Daten exportieren'}
      </button>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  )
}

interface ImportSummary {
  subjects: number
  noteSectionTypes: number
  topics: number
  notes: number
  blocksSkipped: number
  flashcards: number
  timeGridSlots: number
  timetableSlots: number
  calendarEvents: number
  examPrepItems: number
  homework: number
  generalNotes: number
}

const IMPORT_SUMMARY_LABELS: Array<[keyof ImportSummary, string]> = [
  ['subjects', 'Fächer'],
  ['noteSectionTypes', 'Hefte'],
  ['topics', 'Themen'],
  ['notes', 'Notizen'],
  ['flashcards', 'Karteikarten'],
  ['timeGridSlots', 'Zeitraster-Einträge'],
  ['timetableSlots', 'Stundenplan-Einträge'],
  ['calendarEvents', 'Termine'],
  ['homework', 'Hausaufgaben'],
  ['generalNotes', 'allgemeine Notizen'],
]

function ImportDataButton() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<ImportSummary | null>(null)

  async function handleFileSelected(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    if (
      !confirm(
        'Die Daten aus dieser Datei werden zu deinem Konto hinzugefügt. Bestehende Daten werden nicht gelöscht oder überschrieben. Fortfahren?',
      )
    ) {
      return
    }

    setError(null)
    setSummary(null)
    setIsImporting(true)
    try {
      const text = await file.text()
      const parsed = JSON.parse(text)
      const result = await apiFetch<{ summary: ImportSummary }>('/import', {
        method: 'POST',
        body: JSON.stringify(parsed),
      })
      setSummary(result.summary)
    } catch {
      // The backend only ever fails here with a generic Zod validation
      // error or a parse error — neither is meaningful to show verbatim,
      // so this stays a single friendly message regardless of cause.
      setError('Import fehlgeschlagen. Ist das eine gültige Export-Datei?')
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className="mt-5 border-t border-border-subtle pt-5">
      <p className="text-sm text-text-secondary">
        Importiert Daten aus einer zuvor exportierten JSON-Datei. Inhalte werden zu deinem Konto
        hinzugefügt — nichts Bestehendes wird dabei gelöscht oder überschrieben.
      </p>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        onChange={(e) => void handleFileSelected(e)}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={isImporting}
        className="mt-3 rounded-md border border-border px-4 py-2 text-sm text-text-secondary hover:bg-bg-hover disabled:opacity-50"
      >
        {isImporting ? 'Importiere...' : 'Daten importieren'}
      </button>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
      {summary && (
        <div className="mt-3 rounded-md border border-border-subtle bg-bg-muted p-3 text-sm">
          <p className="font-semibold text-text-primary">Import abgeschlossen.</p>
          <ul className="mt-1.5 space-y-0.5 text-xs text-text-secondary">
            {IMPORT_SUMMARY_LABELS.filter(([key]) => summary[key] > 0).map(([key, label]) => (
              <li key={key}>
                {summary[key]} {label}
              </li>
            ))}
          </ul>
          {summary.blocksSkipped > 0 && (
            <p className="mt-2 text-xs text-text-tertiary">
              {summary.blocksSkipped} Anhänge (Bilder/PDFs) wurden übersprungen, da die
              Originaldatei nicht im Export enthalten war.
            </p>
          )}
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-3 rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-ink"
          >
            Seite neu laden
          </button>
        </div>
      )}
    </div>
  )
}

function NotificationsSettings() {
  const supported = isPushSupported()
  const [status, setStatus] = useState<{ active: boolean; configured: boolean } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!supported) return
    void getPushStatus()
      .then(setStatus)
      .catch(() => undefined)
  }, [supported])

  async function handleToggle() {
    setError(null)
    setBusy(true)
    try {
      if (status?.active) {
        await disablePushNotifications()
      } else {
        await enablePushNotifications()
      }
      setStatus(await getPushStatus())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Das hat leider nicht geklappt.')
    } finally {
      setBusy(false)
    }
  }

  if (!supported) {
    return (
      <p className="text-sm text-text-tertiary">
        Dein Browser unterstützt keine Push-Benachrichtigungen.
      </p>
    )
  }

  if (status && !status.configured) {
    return (
      <p className="text-sm text-text-tertiary">
        Push-Benachrichtigungen sind auf diesem Server nicht eingerichtet.
      </p>
    )
  }

  return (
    <div>
      <p className="text-sm text-text-secondary">
        Erhalte eine Benachrichtigung, wenn eine Klausur in 3 Tagen oder morgen ansteht, oder eine
        Hausaufgabe morgen fällig ist — auch wenn Schulmanager gerade nicht geöffnet ist.
      </p>
      <button
        type="button"
        onClick={() => void handleToggle()}
        disabled={busy || !status}
        className="mt-3 rounded-md border border-border px-4 py-2 text-sm text-text-secondary hover:bg-bg-hover disabled:opacity-50"
      >
        {status?.active ? 'Benachrichtigungen deaktivieren' : 'Benachrichtigungen aktivieren'}
      </button>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  )
}
