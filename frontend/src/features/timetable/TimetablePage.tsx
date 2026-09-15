import { Link } from 'react-router-dom'
import { TimetableView } from './TimetableView'

export function TimetablePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-[15px] font-semibold text-text-primary">Stundenplan</h1>
      <TimetableView />
      <p className="text-sm text-text-tertiary">
        Stundenplan bearbeiten?{' '}
        <Link to="/settings" className="text-accent hover:underline">
          In den Einstellungen
        </Link>
      </p>
    </div>
  )
}
