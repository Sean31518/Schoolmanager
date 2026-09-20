import { CreateMenu } from '../../components/CreateMenu'
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
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[15px] font-semibold text-text-primary">
            Übersicht
          </h1>
          <p className="mt-0.5 text-sm text-text-tertiary">
            Hallo, {user?.displayName}
          </p>
        </div>
        <CreateMenu />
      </div>

      {isLoading || !data ? (
        <p className="text-text-tertiary">Lädt...</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_268px]">
          <div className="flex flex-col gap-3.5 min-w-0">
            <HomeworkWidget items={data.upcomingHomework} />
            <RecentNotesWidget notes={data.recentlyViewedNotes} />
            <GeneralNotesWidget notes={data.generalNotes} />
          </div>

          <div className="flex flex-col gap-3.5 min-w-0">
            <ExamHighlightWidget />
            <TodayTomorrowWidget
              today={data.todayTimetable}
              tomorrow={data.tomorrowTimetable}
              todayLabel={data.todayLabel}
              tomorrowLabel={data.tomorrowLabel}
            />
            <RemindersWidget items={data.upcomingReminders} />
          </div>
        </div>
      )}
    </div>
  )
}
