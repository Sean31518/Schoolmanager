import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useExams } from '../calendar/hooks'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function ExamsListPage() {
  const { data: exams, isLoading } = useExams()

  const { upcoming, past } = useMemo(() => {
    const todayKey = new Date().toISOString().slice(0, 10)
    const sorted = [...(exams ?? [])].sort((a, b) => a.startDate.localeCompare(b.startDate))
    return {
      upcoming: sorted.filter((e) => e.startDate.slice(0, 10) >= todayKey),
      past: sorted.filter((e) => e.startDate.slice(0, 10) < todayKey).reverse(),
    }
  }, [exams])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">Klausuren</h1>

      {isLoading ? (
        <p className="text-slate-400 dark:text-slate-500">Lädt...</p>
      ) : (
        <>
          <section>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
              Anstehend
            </h2>
            {upcoming.length === 0 ? (
              <p className="mt-2 text-slate-400 dark:text-slate-500">
                Keine anstehenden Klausuren.{' '}
                <Link to="/calendar" className="text-blue-600 hover:underline dark:text-blue-400">
                  Im Kalender anlegen
                </Link>
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {upcoming.map((exam) => (
                  <li
                    key={exam.id}
                    className="flex items-center gap-3 rounded-lg bg-white p-4 shadow-sm dark:bg-slate-800"
                  >
                    {exam.subject && (
                      <span
                        className="h-3 w-3 flex-shrink-0 rounded-full"
                        style={{ backgroundColor: exam.subject.color }}
                      />
                    )}
                    <span className="font-medium text-slate-800 dark:text-slate-100">
                      {exam.title}
                    </span>
                    {exam.subject && (
                      <span className="text-sm text-slate-400 dark:text-slate-500">
                        {exam.subject.name}
                      </span>
                    )}
                    <span className="ml-auto text-sm text-slate-500 dark:text-slate-400">
                      {formatDate(exam.startDate)}
                    </span>
                    <Link
                      to={`/exams/${exam.id}`}
                      className="text-sm text-blue-600 hover:underline dark:text-blue-400"
                    >
                      Vorbereiten
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {past.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                Vergangen
              </h2>
              <ul className="mt-3 space-y-2">
                {past.map((exam) => (
                  <li
                    key={exam.id}
                    className="flex items-center gap-3 rounded-lg bg-white p-4 shadow-sm opacity-70 dark:bg-slate-800"
                  >
                    {exam.subject && (
                      <span
                        className="h-3 w-3 flex-shrink-0 rounded-full"
                        style={{ backgroundColor: exam.subject.color }}
                      />
                    )}
                    <span className="font-medium text-slate-800 dark:text-slate-100">
                      {exam.title}
                    </span>
                    <span className="ml-auto text-sm text-slate-500 dark:text-slate-400">
                      {formatDate(exam.startDate)}
                    </span>
                    <Link
                      to={`/exams/${exam.id}`}
                      className="text-sm text-blue-600 hover:underline dark:text-blue-400"
                    >
                      Ansehen
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  )
}
