import type { ReactNode } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { SidebarResizeHandle } from '../components/SidebarResizeHandle'
import { useAuth } from '../features/auth/AuthContext'
import { useSubjects } from '../features/subjects/hooks'
import { useResizableSidebar } from '../lib/useResizableSidebar'
import { useTheme } from '../lib/useTheme'

const navItems = [
  {
    to: '/',
    label: 'Übersicht',
    end: true,
    icon: (
      <>
        <rect width="7" height="9" x="3" y="3" rx="1" />
        <rect width="7" height="5" x="14" y="3" rx="1" />
        <rect width="7" height="9" x="14" y="12" rx="1" />
        <rect width="7" height="5" x="3" y="16" rx="1" />
      </>
    ),
  },
  {
    to: '/timetable',
    label: 'Stundenplan',
    icon: (
      <>
        <path d="M3 9h18" />
        <path d="M9 3v18" />
        <rect x="3" y="3" width="18" height="18" rx="2" />
      </>
    ),
  },
  {
    to: '/calendar',
    label: 'Kalender',
    icon: (
      <>
        <path d="M8 2v3" />
        <path d="M16 2v3" />
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18" />
        <path d="M8 13h.01" />
        <path d="M12 13h.01" />
        <path d="M16 13h.01" />
        <path d="M8 17h.01" />
        <path d="M12 17h.01" />
        <path d="M16 17h.01" />
      </>
    ),
  },
  {
    to: '/exams',
    label: 'Klausuren',
    icon: (
      <>
        <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z" />
        <path d="M22 10v6" />
        <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5" />
      </>
    ),
  },
]

function NavIcon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[15px] w-[15px] shrink-0"
    >
      {children}
    </svg>
  )
}

export function Layout() {
  const { user } = useAuth()
  const { data: subjects } = useSubjects()
  const { theme, toggleTheme } = useTheme()
  const { width, collapsed, setCollapsed, startResize } = useResizableSidebar(
    'sidebar-main',
    210,
    170,
    360,
  )

  if (collapsed) {
    return (
      <div className="flex min-h-screen bg-bg-0 font-sans text-text-primary">
        <aside className="flex w-11 shrink-0 flex-col items-center gap-3 border-r border-border bg-bg-2 py-4">
          <NavLink to="/" title="Schulmanager">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent font-mono text-xs font-semibold text-accent-ink">
              S
            </span>
          </NavLink>
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            title="Seitenleiste einblenden"
            aria-label="Seitenleiste einblenden"
            className="flex h-6 w-6 items-center justify-center rounded-md text-text-muted hover:bg-bg-hover hover:text-text-primary"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-3.5 w-3.5"
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </aside>
        <main className="flex-1 min-w-0 px-8 py-8">
          <Outlet />
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-bg-0 font-sans text-text-primary">
      <aside
        style={{ width }}
        className="relative flex shrink-0 flex-col gap-4 border-r border-border bg-bg-2 px-3 py-4"
      >
        <div className="flex items-center justify-between gap-2 px-1">
          <NavLink to="/" className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent font-mono text-xs font-semibold text-accent-ink">
              S
            </span>
            <span className="truncate text-[13px] font-semibold">Schulmanager</span>
          </NavLink>
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            title="Seitenleiste ausblenden"
            aria-label="Seitenleiste ausblenden"
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-text-muted hover:bg-bg-hover hover:text-text-primary"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-3.5 w-3.5"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
        </div>

        <nav className="flex flex-col gap-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium ${
                  isActive
                    ? 'bg-bg-hover font-semibold text-text-primary shadow-[inset_2px_0_0_var(--color-accent)]'
                    : 'text-text-secondary hover:bg-bg-hover/60 hover:text-text-primary'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={isActive ? 'text-accent-text' : 'text-text-tertiary'}>
                    <NavIcon>{item.icon}</NavIcon>
                  </span>
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="h-px bg-border" />

        <div className="flex flex-col gap-2 px-1">
          <NavLink
            to="/subjects"
            className="font-mono text-[10px] tracking-wider text-text-tertiary hover:text-text-secondary"
          >
            FÄCHER
          </NavLink>
          {(subjects ?? []).map((subject) => (
            <NavLink
              key={subject.id}
              to={`/subjects/${subject.id}`}
              className="flex items-center gap-2.5 text-[13px] text-text-secondary hover:text-text-primary"
            >
              <span
                className="h-2 w-2 shrink-0 rounded-[2px]"
                style={{ backgroundColor: subject.color }}
              />
              {subject.name}
            </NavLink>
          ))}
        </div>

        <div className="mt-auto flex items-center gap-2 border-t border-border pt-3">
          <button
            type="button"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Helles Design' : 'Dunkles Design'}
            aria-label={theme === 'dark' ? 'Helles Design' : 'Dunkles Design'}
            className="flex h-[22px] w-[22px] items-center justify-center rounded-md bg-bg-hover text-text-secondary hover:text-text-primary"
          >
            {theme === 'dark' ? (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-[13px] w-[13px]"
              >
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2" />
                <path d="M12 20v2" />
                <path d="m4.93 4.93 1.41 1.41" />
                <path d="m17.66 17.66 1.41 1.41" />
                <path d="M2 12h2" />
                <path d="M20 12h2" />
                <path d="m6.34 17.66-1.41 1.41" />
                <path d="m19.07 4.93-1.41 1.41" />
              </svg>
            ) : (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-[13px] w-[13px]"
              >
                <path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401" />
              </svg>
            )}
          </button>
          <span className="flex-1 truncate text-xs text-text-secondary">
            {user?.displayName}
          </span>
          <NavLink
            to="/settings"
            title="Einstellungen"
            aria-label="Einstellungen"
            className="flex text-text-muted hover:text-text-primary"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-3.5 w-3.5"
            >
              <path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </NavLink>
        </div>

        <SidebarResizeHandle onMouseDown={startResize} />
      </aside>

      <main className="flex-1 min-w-0 px-8 py-8">
        <Outlet />
      </main>
    </div>
  )
}
