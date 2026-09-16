import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { formatGradeLevels } from '../../lib/gradeLevel'
import { useExams } from '../calendar/hooks'
import { useFlashcards, useReviewFlashcard, useTopicsMastery } from '../flashcards/hooks'
import { useExamPrep } from './hooks'
import { SectionContent } from './SectionContent'
import { extractSections, type NoteSection } from './sections'
import { buildStudyPlan, formatDayOffset } from './studyPlan'
import type { ExamPrepItemDto } from './types'

interface TopicGroup {
  topicId: string
  topicName: string
  subjectColor: string
  items: ExamPrepItemDto[]
}

function groupByTopic(items: ExamPrepItemDto[]): TopicGroup[] {
  const map = new Map<string, TopicGroup>()
  for (const item of items) {
    const existing = map.get(item.topicId)
    if (existing) {
      existing.items.push(item)
    } else {
      map.set(item.topicId, {
        topicId: item.topicId,
        topicName: item.topicName,
        subjectColor: item.subjectColor,
        items: [item],
      })
    }
  }
  return [...map.values()]
}

function daysUntil(iso: string) {
  const now = new Date()
  const target = new Date(iso)
  const ms =
    Date.UTC(target.getFullYear(), target.getMonth(), target.getDate()) -
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round(ms / 86_400_000)
}

export function ExamStudyPage() {
  const { eventId = '' } = useParams()
  const { data: exams } = useExams()
  const exam = exams?.find((e) => e.id === eventId)
  const { data, isLoading } = useExamPrep(eventId)

  const topics = useMemo(() => groupByTopic(data?.items ?? []), [data])
  const topicIds = useMemo(() => topics.map((t) => t.topicId), [topics])
  const { byTopic: mastery } = useTopicsMastery(topicIds)

  const [view, setView] = useState<'karteikarten' | 'material'>('karteikarten')
  const [activeTopicId, setActiveTopicId] = useState<string | null>(null)

  useEffect(() => {
    if (activeTopicId && topics.some((t) => t.topicId === activeTopicId)) return
    const firstNotDone = topics.find((t) => {
      const m = mastery.get(t.topicId)
      return !m || m.total === 0 || m.done < m.total
    })
    setActiveTopicId((firstNotDone ?? topics[0])?.topicId ?? null)
  }, [topics])

  const activeTopic = topics.find((t) => t.topicId === activeTopicId) ?? null

  if (isLoading || !data) {
    return <p className="text-text-tertiary">Lädt...</p>
  }

  if (topics.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader eventId={eventId} />
        <p className="text-text-tertiary">
          Noch keine Inhalte ausgewählt.{' '}
          <Link to={`/exams/${eventId}/edit`} className="text-accent-text hover:underline">
            Jetzt auswählen
          </Link>
        </p>
      </div>
    )
  }

  const remainingTopics = topics
    .map((t) => {
      const m = mastery.get(t.topicId)
      return { topicId: t.topicId, topicName: t.topicName, cardsRemaining: (m?.total ?? 0) - (m?.done ?? 0) }
    })
    .filter((t) => t.cardsRemaining > 0)
  const daysLeft = exam ? Math.max(0, daysUntil(exam.startDate)) : 0
  const plan = buildStudyPlan(remainingTopics, daysLeft)

  return (
    <div className="space-y-6">
      <PageHeader eventId={eventId} />

      <div className="flex gap-1.5 border-b border-border">
        <button
          onClick={() => setView('karteikarten')}
          className={`px-3 py-2 text-sm font-medium ${
            view === 'karteikarten'
              ? 'border-b-2 border-accent text-text-primary'
              : 'text-text-tertiary hover:text-text-secondary'
          }`}
        >
          Karteikarten
        </button>
        <button
          onClick={() => setView('material')}
          className={`px-3 py-2 text-sm font-medium ${
            view === 'material'
              ? 'border-b-2 border-accent text-text-primary'
              : 'text-text-tertiary hover:text-text-secondary'
          }`}
        >
          Material ansehen
        </button>
      </div>

      {view === 'material' ? (
        <MaterialView topics={topics} />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_372px]">
          <Lernstapel
            topics={topics}
            mastery={mastery}
            activeTopicId={activeTopicId}
            onSelect={setActiveTopicId}
          />
          <div className="flex flex-col gap-3">
            {activeTopic && <FlashcardQuiz topic={activeTopic} />}
            {plan.length > 0 && (
              <div className="rounded-lg border border-border p-3.5">
                <div className="font-mono text-[10px] tracking-wider text-text-tertiary">
                  PLAN {exam ? `BIS ${new Date(exam.startDate).toLocaleDateString('de-DE', { weekday: 'short' }).toUpperCase()}` : ''}
                </div>
                <div className="mt-2 flex flex-col gap-2">
                  {plan.map((day) => (
                    <div key={day.dayOffset} className="flex items-start gap-2.5">
                      <span className="w-11 shrink-0 font-mono text-[10px] text-text-secondary">
                        {formatDayOffset(day.dayOffset)}
                      </span>
                      <span className="flex-1 text-xs text-text-primary">
                        {day.topics.map((t) => t.topicName).join(', ')}
                      </span>
                      <span className="shrink-0 font-mono text-[10px] text-text-muted">
                        {day.minutes} MIN
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function PageHeader({ eventId }: { eventId: string }) {
  return (
    <div>
      <Link to={`/exams/${eventId}/edit`} className="text-sm text-accent-text hover:underline">
        ← Auswahl bearbeiten
      </Link>
      <h1 className="mt-1 text-[15px] font-semibold text-text-primary">Lernansicht</h1>
    </div>
  )
}

function Lernstapel({
  topics,
  mastery,
  activeTopicId,
  onSelect,
}: {
  topics: TopicGroup[]
  mastery: Map<string, { done: number; total: number }>
  activeTopicId: string | null
  onSelect: (topicId: string) => void
}) {
  const nextTopicId = topics.find((t) => {
    const m = mastery.get(t.topicId)
    return t.topicId !== activeTopicId && (!m || m.total === 0 || m.done < m.total)
  })?.topicId

  return (
    <div className="rounded-lg border border-border">
      <div className="border-b border-border px-4 py-2.5 font-mono text-[10px] tracking-wider text-text-tertiary">
        LERNSTAPEL
      </div>
      {topics.map((topic) => {
        const m = mastery.get(topic.topicId)
        const done = Boolean(m && m.total > 0 && m.done === m.total)
        const isActive = topic.topicId === activeTopicId
        return (
          <button
            key={topic.topicId}
            type="button"
            onClick={() => onSelect(topic.topicId)}
            className={`flex w-full items-center gap-2.5 border-b border-border-subtle px-4 py-2.5 text-left last:border-b-0 ${
              isActive ? 'bg-accent/[0.06]' : ''
            }`}
          >
            <span
              className={
                done
                  ? 'flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-[4px] bg-accent text-accent-ink'
                  : isActive
                    ? 'h-[15px] w-[15px] shrink-0 rounded-[4px] border-[1.5px] border-accent'
                    : 'h-[15px] w-[15px] shrink-0 rounded-[4px] border-[1.5px] border-text-disabled'
              }
            >
              {done && (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="h-2.5 w-2.5">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              )}
            </span>
            <span className={`flex-1 truncate text-[13px] ${done ? 'font-medium text-text-secondary' : 'font-semibold text-text-primary'}`}>
              {topic.topicName}
            </span>
            <span className="shrink-0 font-mono text-[10px] text-text-muted">
              {topic.topicId === nextTopicId
                ? 'ALS NÄCHSTES'
                : m
                  ? `${m.done}/${m.total} KARTEN`
                  : '…'}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function FlashcardQuiz({ topic }: { topic: TopicGroup }) {
  const { data: cards } = useFlashcards(topic.topicId)
  const reviewCard = useReviewFlashcard(topic.topicId)
  const [queueTopicId, setQueueTopicId] = useState<string | null>(null)
  const [queue, setQueue] = useState<string[]>([])
  const [sessionTotal, setSessionTotal] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [studiedCount, setStudiedCount] = useState(0)

  useEffect(() => {
    if (!cards || queueTopicId === topic.topicId) return
    const due = cards.filter((c) => c.state !== 'KNOWN').map((c) => c.id)
    setQueue(due)
    setSessionTotal(due.length)
    setStudiedCount(0)
    setRevealed(false)
    setQueueTopicId(topic.topicId)
  }, [cards, queueTopicId, topic.topicId])

  const currentId = queue[0]
  const currentCard = cards?.find((c) => c.id === currentId)

  async function handleResult(result: 'known' | 'again') {
    if (!currentId) return
    await reviewCard.mutateAsync({ id: currentId, result })
    setQueue((q) => (result === 'known' ? q.slice(1) : [...q.slice(1), currentId]))
    setStudiedCount((n) => n + 1)
    setRevealed(false)
  }

  if (!cards || cards.length === 0) {
    return (
      <div className="rounded-lg border border-border p-4 text-sm text-text-tertiary">
        Für „{topic.topicName}" gibt es noch keine Karteikarten. Karten können bei „Auswahl
        bearbeiten" pro Thema angelegt werden.
      </div>
    )
  }

  if (!currentCard) {
    return (
      <div className="rounded-lg border border-border p-4 text-sm text-text-secondary">
        „{topic.topicName}" ist für diese Runde durchgearbeitet. 🎉
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] tracking-wider text-text-tertiary">ABFRAGE</span>
        <span className="font-mono text-[10px] text-text-tertiary">
          KARTE {Math.min(studiedCount + 1, Math.max(sessionTotal, 1))} / {Math.max(sessionTotal, 1)}
        </span>
      </div>
      <div className="flex min-h-[196px] flex-col gap-3.5 rounded-lg border border-border bg-bg-2 px-4.5 py-5">
        <span className="font-mono text-[10px] tracking-wider text-text-tertiary">
          {topic.topicName.toUpperCase()}
        </span>
        <span className="text-[17px] font-semibold leading-snug text-text-primary">
          {currentCard.question}
        </span>
        {revealed ? (
          <span className="mt-auto border-t border-dashed border-border pt-3 text-sm text-text-secondary">
            {currentCard.answer}
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setRevealed(true)}
            className="mt-auto border-t border-dashed border-border pt-3 text-left font-mono text-[13px] text-text-muted"
          >
            Antwort aufdecken
          </button>
        )}
      </div>
      {revealed && (
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => void handleResult('known')}
            className="flex-1 rounded-md bg-accent py-2 text-center text-[12.5px] font-semibold text-accent-ink"
          >
            Gewusst
          </button>
          <button
            type="button"
            onClick={() => void handleResult('again')}
            className="flex-1 rounded-md border border-border py-2 text-center text-[12.5px] font-medium text-text-secondary"
          >
            Nochmal
          </button>
        </div>
      )}
    </div>
  )
}

interface ResolvedNoteGroup {
  noteId: string
  item: ExamPrepItemDto
  sections: { item: ExamPrepItemDto; section: NoteSection }[]
}

function groupByNote(topics: TopicGroup[]): ResolvedNoteGroup[] {
  const map = new Map<string, ResolvedNoteGroup>()
  for (const topic of topics) {
    for (const item of topic.items) {
      const sections = extractSections(item.blocks)
      const section = sections[item.sectionIndex]
      if (!section) continue
      const existing = map.get(item.noteId)
      if (existing) {
        existing.sections.push({ item, section })
      } else {
        map.set(item.noteId, { noteId: item.noteId, item, sections: [{ item, section }] })
      }
    }
  }
  return [...map.values()]
}

function MaterialView({ topics }: { topics: TopicGroup[] }) {
  const noteGroups = groupByNote(topics)

  return (
    <div className="space-y-4">
      {noteGroups.map(({ noteId, item, sections }) => (
        <div key={noteId} className="rounded-lg border border-border p-4">
          <div className="flex items-center gap-2 text-sm text-text-tertiary">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
              style={{ backgroundColor: item.subjectColor }}
            />
            {item.subjectName} · {item.sectionTypeName} · {item.topicName}
            {item.gradeLevels.length > 0 ? ` · ${formatGradeLevels(item.gradeLevels)}` : ''}
          </div>
          <h2 className="mt-1 text-[15px] font-semibold text-text-primary">{item.title}</h2>
          <div className="mt-3 space-y-4 divide-y divide-border-subtle">
            {sections.map(({ item: sectionItem, section }) => (
              <div key={sectionItem.id} className="pt-4 first:pt-0">
                <h3 className="text-[13px] font-semibold text-text-secondary">{section.label}</h3>
                <div className="mt-2">
                  <SectionContent section={section} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
