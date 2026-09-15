import { Link } from 'react-router-dom'
import { TimetableGrid } from './TimetableGrid'

export function TimetablePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">Stundenplan</h1>
      <TimetableGrid />
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Zeitraster bearbeiten?{' '}
        <Link to="/settings" className="text-blue-600 hover:underline dark:text-blue-400">
          In den Einstellungen
        </Link>
      </p>
    </div>
  )
}
