import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { GeneralNotesWidget } from '../generalNotes/GeneralNotesWidget'
import { HomeworkWidget } from '../homework/HomeworkWidget'
import { ExamHighlightWidget } from './ExamHighlightWidget'
import { RecentNotesWidget } from './RecentNotesWidget'
import { RemindersWidget } from './RemindersWidget'
import { TodayTomorrowWidget } from './TodayTomorrowWidget'
import { useDashboard } from './hooks'

export function DashboardPage() {
  const { user } = useAuth()
  const { data, isLoading } = useDashboard()

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[15px] font-semibold text-text-primary">
          Übersicht
        </h1>
        <p className="mt-0.5 text-sm text-text-tertiary">
          Hallo, {user?.displayName}
        </p>
      </div>

      {isLoading || !data ? (
        <p className="text-text-tertiary">Lädt...</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_268px]">
          <div className="flex flex-col gap-3.5 min-w-0">
            <HomeworkWidget items={data.upcomingHomework} />
            <RecentNotesWidget notes={data.recentlyViewedNotes} />

            {data.quickLinks.length > 0 ? (
              <div className="rounded-lg border border-border bg-bg-1">
                <div className="border-b border-border px-3 py-2 font-mono text-[10px] tracking-wider text-text-tertiary">
                  MEINE HEFTE
                </div>
                <div className="grid grid-cols-1 gap-2 p-2.5 sm:grid-cols-2">
                  {data.quickLinks.map((link) => (
                    <Link
                      key={link.sectionTypeId}
                      to={`/subjects/${link.subjectId}/sections/${link.sectionTypeId}`}
                      className="flex items-center gap-2.5 rounded-md border border-border-subtle px-3 py-2 hover:border-border"
                    >
                      <span
                        className="h-[7px] w-[7px] shrink-0 rounded-[2px]"
                        style={{ backgroundColor: link.color }}
                      />
                      <span className="truncate text-xs font-medium text-text-secondary">
                        {link.subjectName} · {link.sectionTypeName}
                      </span>
                      {!link.hasContent && (
                        <span className="ml-auto shrink-0 font-mono text-[9px] text-text-disabled">
                          neu
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-text-tertiary">
                Noch keine Notizbereiche angelegt.{' '}
                <Link to="/subjects" className="text-accent hover:underline">
                  Fächer verwalten
                </Link>
              </p>
            )}

            <GeneralNotesWidget notes={data.generalNotes} />
          </div>

          <div className="flex flex-col gap-3.5 min-w-0">
            <ExamHighlightWidget />
            <TodayTomorrowWidget today={data.todayTimetable} tomorrow={data.tomorrowTimetable} />
            <RemindersWidget items={data.upcomingReminders} />
          </div>
        </div>
      )}
    </div>
  )
}
