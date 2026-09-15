import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { formatGradeLevels } from '../../lib/gradeLevel'
import { useExams } from '../calendar/hooks'
import { useExamPrep, useExamPrepCandidates, useSaveExamPrep } from './hooks'
import { extractSections } from './sections'
import type { ExamPrepCandidateDto, SaveExamPrepItem } from './types'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function ExamPrepPage() {
  const { eventId = '' } = useParams()
  const { data: exams } = useExams()
  const exam = exams?.find((e) => e.id === eventId)

  const [allSubjects, setAllSubjects] = useState(false)
  const { data: candidates, isLoading: candidatesLoading } = useExamPrepCandidates(
    eventId,
    allSubjects,
  )
  const { data: existing, isLoading: existingLoading } = useExamPrep(eventId)
  const saveExamPrep = useSaveExamPrep(eventId)

  const [selection, setSelection] = useState<Map<string, Set<number>>>(new Map())
  const [initialized, setInitialized] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (existing && !initialized) {
      const map = new Map<string, Set<number>>()
      for (const item of existing.items) {
        const set = map.get(item.noteId) ?? new Set<number>()
        set.add(item.sectionIndex)
        map.set(item.noteId, set)
      }
      setSelection(map)
      setInitialized(true)
    }
  }, [existing, initialized])

  // Notes may currently be filtered out of `candidates` (e.g. a different
  // subject while "alle Fächer" is off) but must still be included on save
  // if they were already selected, so this merges both sources.
  const noteLookup = useMemo(() => {
    const map = new Map<string, ExamPrepCandidateDto>()
    for (const item of existing?.items ?? []) map.set(item.noteId, item)
    for (const candidate of candidates ?? []) map.set(candidate.noteId, candidate)
    return map
  }, [existing, candidates])

  function toggleSection(noteId: string, sectionIndex: number) {
    setSaved(false)
    setSelection((prev) => {
      const next = new Map(prev)
      const set = new Set(next.get(noteId) ?? [])
      if (set.has(sectionIndex)) {
        set.delete(sectionIndex)
      } else {
        set.add(sectionIndex)
      }
      if (set.size === 0) {
        next.delete(noteId)
      } else {
        next.set(noteId, set)
      }
      return next
    })
  }

  const selectedCount = useMemo(
    () => [...selection.values()].reduce((sum, set) => sum + set.size, 0),
    [selection],
  )

  async function handleSave() {
    const items: SaveExamPrepItem[] = []
    for (const [noteId, indexes] of selection) {
      const note = noteLookup.get(noteId)
      if (!note) continue
      const sections = extractSections(note.blocks)
      for (const index of indexes) {
        const section = sections[index]
        if (section) {
          items.push({ noteId, sectionIndex: index, sectionLabel: section.label })
        }
      }
    }
    await saveExamPrep.mutateAsync(items)
    setSaved(true)
  }

  if (existingLoading || candidatesLoading) {
    return <p className="text-slate-400 dark:text-slate-500">Lädt...</p>
  }

  return (
    <div className="space-y-6">
      <div>
        <Link to="/exams" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
          ← Klausuren
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-slate-800 dark:text-slate-100">
          {exam ? exam.title : 'Klausurvorbereitung'}
        </h1>
        {exam && (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {formatDate(exam.startDate)}
          </p>
        )}
      </div>

      {exam?.subjectId && (
        <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <input
            type="checkbox"
            checked={allSubjects}
            onChange={(e) => setAllSubjects(e.target.checked)}
          />
          Notizen aus allen Fächern anzeigen (nicht nur {exam.subject?.name})
        </label>
      )}

      {!candidates || candidates.length === 0 ? (
        <p className="text-slate-400 dark:text-slate-500">Keine Notizen mit Inhalt gefunden.</p>
      ) : (
        <div className="space-y-3">
          {candidates.map((candidate) => {
            const sections = extractSections(candidate.blocks)
            if (sections.length === 0) return null
            const selectedIndexes = selection.get(candidate.noteId) ?? new Set<number>()
            return (
              <div
                key={candidate.noteId}
                className="rounded-lg bg-white p-4 shadow-sm dark:bg-slate-800"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: candidate.subjectColor }}
                  />
                  <div>
                    <div className="font-medium text-slate-800 dark:text-slate-100">
                      {candidate.subjectName} · {candidate.sectionTypeName} · {candidate.topicName}
                    </div>
                    <div className="text-xs text-slate-400 dark:text-slate-500">
                      {candidate.title}
                      {candidate.gradeLevels.length > 0
                        ? ` · ${formatGradeLevels(candidate.gradeLevels)}`
                        : ''}
                    </div>
                  </div>
                </div>
                <ul className="mt-2 space-y-1">
                  {sections.map((section) => (
                    <li key={section.index}>
                      <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                        <input
                          type="checkbox"
                          checked={selectedIndexes.has(section.index)}
                          onChange={() => toggleSection(candidate.noteId, section.index)}
                        />
                        {section.label}
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={() => void handleSave()}
          disabled={saveExamPrep.isPending}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Auswahl speichern ({selectedCount})
        </button>
        {(saved || (existing?.items.length ?? 0) > 0) && (
          <Link
            to={`/exams/${eventId}/study`}
            className="text-sm text-blue-600 hover:underline dark:text-blue-400"
          >
            Zur Lernansicht →
          </Link>
        )}
      </div>
    </div>
  )
}
