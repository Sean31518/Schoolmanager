import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useExams } from '../calendar/hooks'
import { useExamPrep } from '../examPrep/hooks'
import { useTopicsMastery } from '../flashcards/hooks'

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

  const { data: prepItems } = useExamPrep(nextExam?.id ?? '')
  const topicIds = useMemo(
    () => [...new Set((prepItems ?? []).map((item) => item.topicId))],
    [prepItems],
  )
  const { byTopic } = useTopicsMastery(topicIds)

  if (!nextExam) return null

  const totals = [...byTopic.values()].reduce(
    (acc, t) => ({ done: acc.done + t.done, total: acc.total + t.total }),
    { done: 0, total: 0 },
  )
  const pct = totals.total > 0 ? Math.round((totals.done / totals.total) * 100) : 0

  return (
    <Link
      to={`/exams/${nextExam.id}`}
      className="block rounded-lg border border-accent/35 border-l-[3px] bg-accent/[0.07] px-3 py-2.5"
    >
      <div className="font-mono text-[10px] tracking-wider text-accent">
        {formatDaysLabel(daysUntil(nextExam.startDate))}
      </div>
      <div className="mt-0.5 text-sm font-semibold text-text-primary">{nextExam.title}</div>
      <div className="mt-0.5 text-xs text-text-secondary">
        {topicIds.length > 0
          ? totals.total > 0
            ? `${totals.done} von ${totals.total} Karten gewusst`
            : `${topicIds.length} Themen im Lernstapel · noch keine Karten`
          : 'Noch kein Lernstapel angelegt'}
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
