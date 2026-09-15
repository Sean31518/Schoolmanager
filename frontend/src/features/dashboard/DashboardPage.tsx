import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { GeneralNotesWidget } from '../generalNotes/GeneralNotesWidget'
import { HomeworkWidget } from '../homework/HomeworkWidget'
import { useDashboard } from './hooks'

export function DashboardPage() {
  const { user } = useAuth()
  const { data, isLoading } = useDashboard()

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-slate-800">
        <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">
          Hallo, {user?.displayName}
        </h1>
        {data && (
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            Aktuelle Klassenstufe: {data.currentGradeLevel}
          </p>
        )}
      </div>

      {isLoading || !data ? (
        <p className="text-slate-400 dark:text-slate-500">Lädt...</p>
      ) : (
        <>
          <div>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
              Meine Hefte
            </h2>
            {data.quickLinks.length > 0 ? (
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                {data.quickLinks.map((link) => (
                  <Link
                    key={link.sectionTypeId}
                    to={`/subjects/${link.subjectId}/sections/${link.sectionTypeId}/${data.currentGradeLevel}`}
                    className="flex items-center gap-3 rounded-lg bg-white p-4 shadow-sm hover:shadow dark:bg-slate-800"
                  >
                    <span
                      className="h-3 w-3 flex-shrink-0 rounded-full"
                      style={{ backgroundColor: link.color }}
                    />
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
                      {link.subjectName} · {link.sectionTypeName}
                    </span>
                    {!link.hasContent && (
                      <span className="ml-auto text-xs text-slate-300 dark:text-slate-600">
                        neu
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-slate-400 dark:text-slate-500">
                Noch keine Notizbereiche für Klasse {data.currentGradeLevel}.{' '}
                <Link to="/subjects" className="text-blue-600 hover:underline dark:text-blue-400">
                  Fächer verwalten
                </Link>
              </p>
            )}
          </div>

          <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-slate-800">
            <HomeworkWidget items={data.upcomingHomework} />
          </div>

          <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-slate-800">
            <GeneralNotesWidget notes={data.generalNotes} />
          </div>
        </>
      )}
    </div>
  )
}
