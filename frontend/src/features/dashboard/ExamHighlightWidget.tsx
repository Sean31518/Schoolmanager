import { Link } from 'react-router-dom'
import { useExams } from '../calendar/hooks'
import { useDecks } from '../flashcards/hooks'

function daysUntil(iso: string) {
  const now = new Date()
  const target = new Date(iso)
  const ms =
    Date.UTC(target.getFullYear(), target.getMonth(), target.getDate()) -
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round(ms / 86_400_000)
}

function formatDaysLabel(days: number) {
  if (days <= 0) return 'HEUTE'
  if (days === 1) return 'MORGEN'
  return `IN ${days} TAGEN`
}

export function ExamHighlightWidget() {
  const { data: exams } = useExams()

  const nextExam = (exams ?? [])
    .filter((e) => daysUntil(e.startDate) >= 0)
    .sort((a, b) => a.startDate.localeCompare(b.startDate))[0]

  // Progress = the exam's Fach's Karteikarten-Stapel (an exam without a
  // Fach shows none, even though this then fetches all decks).
  const { data: decks } = useDecks(nextExam?.subjectId ?? undefined)

  if (!nextExam) return null

  const subjectDecks = nextExam.subjectId ? (decks ?? []) : []
  const totals = subjectDecks.reduce(
    (acc, d) => ({ done: acc.done + d.knownCount, total: acc.total + d.cardCount }),
    { done: 0, total: 0 },
  )
  const pct = totals.total > 0 ? Math.round((totals.done / totals.total) * 100) : 0
  const lernstoff = nextExam.links.length

  return (
    <Link
      to={`/exams/${nextExam.id}`}
      className="block rounded-lg border border-accent/35 border-l-[3px] bg-accent/[0.07] px-3 py-2.5"
    >
      <div className="font-mono text-[10px] tracking-wider text-accent-text">
        {formatDaysLabel(daysUntil(nextExam.startDate))}
      </div>
      <div className="mt-0.5 text-sm font-semibold text-text-primary">{nextExam.title}</div>
      <div className="mt-0.5 text-xs text-text-secondary">
        {lernstoff > 0 ? `${lernstoff} × Lernstoff` : 'Noch kein Lernstoff verknüpft'}
        {totals.total > 0 && ` · ${totals.done} von ${totals.total} Karten gewusst`}
      </div>
      {totals.total > 0 && (
        <div className="mt-2.5 h-[5px] overflow-hidden rounded-full bg-bg-hover">
          <span
            className="block h-full rounded-full bg-accent"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
      <div className="mt-2.5 flex items-center gap-1.5">
        <span className="flex-1 rounded-md bg-accent py-2 text-center text-xs font-semibold text-accent-ink">
          Weiterlernen
        </span>
      </div>
    </Link>
  )
}
