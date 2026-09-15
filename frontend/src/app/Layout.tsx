import { Link, Outlet } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthContext'
import { useTheme } from '../lib/useTheme'

export function Layout() {
  const { user } = useAuth()
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <header className="border-b border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-6">
            <Link to="/" className="text-lg font-semibold text-slate-800 dark:text-slate-100">
              Schulmanager
            </Link>
            <nav className="flex gap-4 text-sm text-slate-600 dark:text-slate-300">
              <Link to="/subjects" className="hover:text-blue-600 dark:hover:text-blue-400">
                Fächer
              </Link>
              <Link to="/timetable" className="hover:text-blue-600 dark:hover:text-blue-400">
                Stundenplan
              </Link>
              <Link to="/calendar" className="hover:text-blue-600 dark:hover:text-blue-400">
                Kalender
              </Link>
              <Link to="/exams" className="hover:text-blue-600 dark:hover:text-blue-400">
                Klausuren
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
            <button
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Zu hellem Design wechseln' : 'Zu dunklem Design wechseln'}
              title={theme === 'dark' ? 'Helles Design' : 'Dunkles Design'}
              className="rounded border border-slate-300 p-1.5 hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-700"
            >
              {theme === 'dark' ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-4 w-4"
                >
                  <path d="M12 3a1 1 0 011 1v1a1 1 0 11-2 0V4a1 1 0 011-1zm0 15a5 5 0 100-10 5 5 0 000 10zm9-6a1 1 0 010 2h-1a1 1 0 110-2h1zM4 12a1 1 0 010 2H3a1 1 0 010-2h1zm14.657-6.657a1 1 0 011.414 1.414l-.707.707a1 1 0 11-1.414-1.414l.707-.707zM6.05 17.95a1 1 0 011.414 1.414l-.707.707a1 1 0 11-1.414-1.414l.707-.707zm12.607 1.414a1 1 0 01-1.414 0l-.707-.707a1 1 0 111.414-1.414l.707.707a1 1 0 010 1.414zM7.464 6.464A1 1 0 016.05 6.464l-.707-.707A1 1 0 116.757 4.343l.707.707a1 1 0 010 1.414zM12 20a1 1 0 011 1v0a1 1 0 11-2 0v0a1 1 0 011-1z" />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-4 w-4"
                >
                  <path d="M20.354 15.354A9 9 0 018.646 3.646a9.003 9.003 0 1011.708 11.708z" />
                </svg>
              )}
            </button>
            <span>{user?.displayName}</span>
            <Link
              to="/settings"
              className="rounded border border-slate-300 px-3 py-1 hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-700"
            >
              Einstellungen
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  )
}
