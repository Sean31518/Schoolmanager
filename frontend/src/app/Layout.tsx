import { Link, Outlet } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthContext'

export function Layout() {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-6">
            <Link to="/" className="text-lg font-semibold text-slate-800">
              Schulmanager
            </Link>
            <nav className="flex gap-4 text-sm text-slate-600">
              <Link to="/" className="hover:text-blue-600">
                Dashboard
              </Link>
              <Link to="/subjects" className="hover:text-blue-600">
                Fächer
              </Link>
              <Link to="/timetable" className="hover:text-blue-600">
                Stundenplan
              </Link>
              <Link to="/calendar" className="hover:text-blue-600">
                Kalender
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <span>{user?.displayName}</span>
            <button
              onClick={() => void logout()}
              className="rounded border border-slate-300 px-3 py-1 hover:bg-slate-100"
            >
              Abmelden
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  )
}
