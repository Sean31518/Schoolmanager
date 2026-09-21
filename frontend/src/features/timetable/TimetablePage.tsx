import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiRequestError } from '../../lib/apiClient'
import { useSettings, useSyncIservNow } from '../settings/hooks'
import { useTimetable } from './hooks'
import { TimetableView } from './TimetableView'

function IservSyncButton() {
  const { data: settings } = useSettings()
  const syncNow = useSyncIservNow()
  const [error, setError] = useState<string | null>(null)

  if (!settings?.iservConfigured) return null

  async function handleSync() {
    setError(null)
    try {
      await syncNow.mutateAsync()
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Synchronisierung fehlgeschlagen.')
    }
  }

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-xs text-red-400">{error}</span>}
      <button
        type="button"
        onClick={() => void handleSync()}
        disabled={syncNow.isPending}
        title="Jetzt mit IServ synchronisieren"
        aria-label="Jetzt mit IServ synchronisieren"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border text-text-secondary hover:border-text-disabled hover:text-text-primary disabled:opacity-50"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`h-3.5 w-3.5 ${syncNow.isPending ? 'animate-spin' : ''}`}
        >
          <path d="M21 12a9 9 0 1 1-2.64-6.36" />
          <path d="M21 3v6h-6" />
        </svg>
      </button>
    </div>
  )
}

export function TimetablePage() {
  const { data } = useTimetable()
  const hasEntries = (data?.timetableSlots ?? []).some((slot) => slot.subjectId)
  // The manual plan being empty only matters as a "you probably want to set
  // this up" nudge when there's no IServ-driven plan filling the gap - once
  // it's active and populated, an empty manual plan is completely expected,
  // not something to point the user at Settings for.
  const showEmptyHint = !hasEntries && !data?.iservActive

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-[15px] font-semibold text-text-primary">Stundenplan</h1>
        <IservSyncButton />
      </div>
      <TimetableView />
      {showEmptyHint && (
        <p className="text-sm text-text-tertiary">
          Stundenplan bearbeiten?{' '}
          <Link to="/settings" className="text-accent-text hover:underline">
            In den Einstellungen
          </Link>
        </p>
      )}
    </div>
  )
}
