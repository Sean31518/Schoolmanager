import { Link } from 'react-router-dom'
import { useTimetable } from './hooks'
import { TimetableView } from './TimetableView'

export function TimetablePage() {
  const { data } = useTimetable()
  const hasEntries = (data?.timetableSlots ?? []).some((slot) => slot.subjectId)

  return (
    <div className="space-y-6">
      <h1 className="text-[15px] font-semibold text-text-primary">Stundenplan</h1>
      <TimetableView />
      {!hasEntries && (
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
