import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { CreateMenu } from '../../components/CreateMenu'
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
      <div className="flex items-center justify-between">
        <h1 className="text-[15px] font-semibold text-text-primary">Klausuren</h1>
        <CreateMenu terminLabel="Klausur" defaultTerminType="EXAM" />
      </div>

      {isLoading ? (
        <p className="text-text-tertiary">Lädt...</p>
      ) : (
        <>
          <section>
            <h2 className="text-[13px] font-semibold text-text-primary">Anstehend</h2>
            {upcoming.length === 0 ? (
              <p className="mt-2 text-text-tertiary">
                Keine anstehenden Klausuren.{' '}
                <Link to="/calendar" className="text-accent-text hover:underline">
                  Im Kalender anlegen
                </Link>
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {upcoming.map((exam) => (
                  <li
                    key={exam.id}
                    className="flex items-center gap-3 rounded-lg border border-border bg-bg-1 p-4"
                  >
                    {exam.subject && (
                      <span
                        className="h-[9px] w-[9px] shrink-0 rounded-[2px]"
                        style={{ backgroundColor: exam.subject.color }}
                      />
                    )}
                    <Link
                      to={`/exams/${exam.id}`}
                      className="font-medium text-text-primary hover:text-accent-text"
                    >
                      {exam.title}
                    </Link>
                    {exam.subject && (
                      <span className="text-sm text-text-tertiary">{exam.subject.name}</span>
                    )}
                    <span className="ml-auto font-mono text-xs text-text-tertiary">
                      {formatDate(exam.startDate)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {past.length > 0 && (
            <section>
              <h2 className="text-[13px] font-semibold text-text-primary">Vergangen</h2>
              <ul className="mt-3 space-y-2">
                {past.map((exam) => (
                  <li
                    key={exam.id}
                    className="flex items-center gap-3 rounded-lg border border-border bg-bg-1 p-4 opacity-70"
                  >
                    {exam.subject && (
                      <span
                        className="h-[9px] w-[9px] shrink-0 rounded-[2px]"
                        style={{ backgroundColor: exam.subject.color }}
                      />
                    )}
                    <Link
                      to={`/exams/${exam.id}`}
                      className="font-medium text-text-primary hover:text-accent-text"
                    >
                      {exam.title}
                    </Link>
                    <span className="ml-auto font-mono text-xs text-text-tertiary">
                      {formatDate(exam.startDate)}
                    </span>
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
