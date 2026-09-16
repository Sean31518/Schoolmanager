import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { formatGradeLevels } from '../../lib/gradeLevel'
import { useExams } from '../calendar/hooks'
import { FlashcardManager } from '../flashcards/FlashcardManager'
import { useExamPrep, useSaveExamPrep } from './hooks'
import { SectionContent } from './SectionContent'
import { extractSections } from './sections'
import { StoffBrowser, type StoffSelection } from './StoffBrowser'
import type { ExamPrepItemDto, SaveExamPrepItem } from './types'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function groupByTopic(items: ExamPrepItemDto[]) {
  const map = new Map<string, { topicId: string; topicName: string; subjectColor: string }>()
  for (const item of items) {
    if (!map.has(item.topicId)) {
      map.set(item.topicId, {
        topicId: item.topicId,
        topicName: item.topicName,
        subjectColor: item.subjectColor,
      })
    }
  }
  return [...map.values()]
}

export function ExamPrepPage() {
  const { eventId = '' } = useParams()
  const { data: exams } = useExams()
  const exam = exams?.find((e) => e.id === eventId)

  const { data: existing, isLoading } = useExamPrep(eventId)
  const saveExamPrep = useSaveExamPrep(eventId)
  const [browserOpen, setBrowserOpen] = useState(false)

  function currentSelection(): StoffSelection {
    const map: StoffSelection = new Map()
    for (const item of existing?.items ?? []) {
      const forNote = map.get(item.noteId) ?? new Map<number, string>()
      forNote.set(item.sectionIndex, item.sectionLabel)
      map.set(item.noteId, forNote)
    }
    return map
  }

  async function removeItem(itemId: string) {
    const items: SaveExamPrepItem[] = (existing?.items ?? [])
      .filter((item) => item.id !== itemId)
      .map((item) => ({
        noteId: item.noteId,
        sectionIndex: item.sectionIndex,
        sectionLabel: item.sectionLabel,
      }))
    await saveExamPrep.mutateAsync(items)
  }

  if (isLoading) {
    return <p className="text-text-tertiary">Lädt...</p>
  }

  const topics = groupByTopic(existing?.items ?? [])

  return (
    <div className="space-y-6">
      <div>
        <Link to="/exams" className="text-sm text-accent-text hover:underline">
          ← Klausuren
        </Link>
        <h1 className="mt-1 text-[15px] font-semibold text-text-primary">
          {exam ? exam.title : 'Klausurvorbereitung'}
        </h1>
        {exam && <p className="text-sm text-text-tertiary">{formatDate(exam.startDate)}</p>}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => setBrowserOpen(true)}
          className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-ink"
        >
          + Stoff hinzufügen
        </button>
        {(existing?.items.length ?? 0) > 0 && (
          <Link to={`/exams/${eventId}`} className="text-sm text-accent-text hover:underline">
            Zur Lernansicht →
          </Link>
        )}
      </div>

      {!existing || existing.items.length === 0 ? (
        <p className="text-text-tertiary">
          Noch kein Stoff ausgewählt. Mit "Stoff hinzufügen" durch deine Hefte browsen.
        </p>
      ) : (
        <>
          <div className="space-y-3">
            {existing.items.map((item) => {
              const sections = extractSections(item.blocks)
              const section = sections[item.sectionIndex]
              return (
                <div key={item.id} className="rounded-lg border border-border bg-bg-1 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-[9px] w-[9px] shrink-0 rounded-[2px]"
                        style={{ backgroundColor: item.subjectColor }}
                      />
                      <div>
                        <div className="font-medium text-text-primary">
                          {item.subjectName} · {item.sectionTypeName} · {item.topicName} ·{' '}
                          {item.title}
                          {item.gradeLevels.length > 0
                            ? ` · ${formatGradeLevels(item.gradeLevels)}`
                            : ''}
                        </div>
                        <div className="text-sm text-text-tertiary">{item.sectionLabel}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => void removeItem(item.id)}
                      className="shrink-0 text-sm text-text-muted hover:text-red-400"
                    >
                      Entfernen
                    </button>
                  </div>
                  {section && (
                    <div className="mt-2 max-h-64 overflow-y-auto">
                      <SectionContent section={section} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div>
            <h2 className="mb-2 text-[13px] font-semibold text-text-primary">Karteikarten</h2>
            <div className="space-y-2">
              {topics.map((topic) => (
                <FlashcardManager
                  key={topic.topicId}
                  topicId={topic.topicId}
                  topicName={topic.topicName}
                  subjectColor={topic.subjectColor}
                />
              ))}
            </div>
          </div>
        </>
      )}

      {browserOpen && (
        <StoffBrowser
          eventId={eventId}
          initialSelection={currentSelection()}
          onClose={() => setBrowserOpen(false)}
        />
      )}
    </div>
  )
}
