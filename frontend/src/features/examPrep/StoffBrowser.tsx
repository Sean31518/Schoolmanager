import { useState } from 'react'
import { formatGradeLevels } from '../../lib/gradeLevel'
import { useNotes, useTopics } from '../notes/hooks'
import type { NoteDto } from '../notes/types'
import { useSubjects } from '../subjects/hooks'
import { useSaveExamPrep } from './hooks'
import { extractSections } from './sections'
import { SectionContent } from './SectionContent'
import type { SaveExamPrepItem } from './types'

export type StoffSelection = Map<string, Map<number, string>>

export function StoffBrowser({
  eventId,
  initialSelection,
  onClose,
}: {
  eventId: string
  initialSelection: StoffSelection
  onClose: () => void
}) {
  const [subjectId, setSubjectId] = useState<string | null>(null)
  const [sectionTypeId, setSectionTypeId] = useState<string | null>(null)
  const [topicId, setTopicId] = useState<string | null>(null)
  const [noteId, setNoteId] = useState<string | null>(null)
  const [selection, setSelection] = useState<StoffSelection>(() => new Map(initialSelection))
  const [saveError, setSaveError] = useState<string | null>(null)

  const { data: subjects } = useSubjects()
  const subject = subjects?.find((s) => s.id === subjectId)
  const sectionType = subject?.noteSectionTypes.find((st) => st.id === sectionTypeId)
  const { data: topics } = useTopics(sectionTypeId ?? '')
  const topic = topics?.find((t) => t.id === topicId)
  const { data: notes } = useNotes(topicId ?? '')
  const note = notes?.find((n) => n.id === noteId)

  const saveExamPrep = useSaveExamPrep(eventId)
  const [saving, setSaving] = useState(false)

  function toggleSection(targetNoteId: string, sectionIndex: number, label: string) {
    setSelection((prev) => {
      const next = new Map(prev)
      const forNote = new Map(next.get(targetNoteId) ?? [])
      if (forNote.has(sectionIndex)) {
        forNote.delete(sectionIndex)
      } else {
        forNote.set(sectionIndex, label)
      }
      if (forNote.size === 0) next.delete(targetNoteId)
      else next.set(targetNoteId, forNote)
      return next
    })
  }

  const selectedCount = [...selection.values()].reduce((sum, m) => sum + m.size, 0)

  async function handleFinish() {
    setSaveError(null)
    const items: SaveExamPrepItem[] = []
    for (const [nId, sections] of selection) {
      for (const [sectionIndex, sectionLabel] of sections) {
        items.push({ noteId: nId, sectionIndex, sectionLabel })
      }
    }
    setSaving(true)
    try {
      await saveExamPrep.mutateAsync(items)
      onClose()
    } catch {
      setSaveError('Auswahl konnte nicht gespeichert werden')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-lg bg-white shadow-lg dark:bg-slate-800"
      >
        <div className="flex items-center justify-between border-b border-slate-200 p-4 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            Stoff hinzufügen
          </h2>
          <button
            onClick={onClose}
            className="text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            Schließen
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 px-4 py-2 text-sm dark:border-slate-700">
          <button
            onClick={() => {
              setSubjectId(null)
              setSectionTypeId(null)
              setTopicId(null)
              setNoteId(null)
            }}
            className="text-blue-600 hover:underline dark:text-blue-400"
          >
            Fächer
          </button>
          {subject && (
            <>
              <span className="text-slate-400">/</span>
              <button
                onClick={() => {
                  setSectionTypeId(null)
                  setTopicId(null)
                  setNoteId(null)
                }}
                className="text-blue-600 hover:underline dark:text-blue-400"
              >
                {subject.name}
              </button>
            </>
          )}
          {sectionType && (
            <>
              <span className="text-slate-400">/</span>
              <button
                onClick={() => {
                  setTopicId(null)
                  setNoteId(null)
                }}
                className="text-blue-600 hover:underline dark:text-blue-400"
              >
                {sectionType.name}
              </button>
            </>
          )}
          {topic && (
            <>
              <span className="text-slate-400">/</span>
              <button
                onClick={() => setNoteId(null)}
                className="text-blue-600 hover:underline dark:text-blue-400"
              >
                {topic.name}
              </button>
            </>
          )}
          {note && (
            <>
              <span className="text-slate-400">/</span>
              <span className="text-slate-600 dark:text-slate-300">{note.title}</span>
            </>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {!subjectId && (
            <div className="space-y-1">
              {(subjects ?? []).map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSubjectId(s.id)}
                  className="flex w-full items-center gap-2 rounded p-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  <span
                    className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: s.color }}
                  />
                  <span className="text-slate-700 dark:text-slate-200">{s.name}</span>
                </button>
              ))}
              {subjects?.length === 0 && (
                <p className="text-sm text-slate-400 dark:text-slate-500">Keine Fächer angelegt.</p>
              )}
            </div>
          )}

          {subjectId && !sectionTypeId && (
            <div className="space-y-1">
              {(subject?.noteSectionTypes ?? []).map((st) => (
                <button
                  key={st.id}
                  onClick={() => setSectionTypeId(st.id)}
                  className="block w-full rounded p-2 text-left text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  {st.name}
                </button>
              ))}
              {subject && subject.noteSectionTypes.length === 0 && (
                <p className="text-sm text-slate-400 dark:text-slate-500">Keine Notizbereiche.</p>
              )}
            </div>
          )}

          {sectionTypeId && !topicId && (
            <div className="space-y-1">
              {(topics ?? []).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTopicId(t.id)}
                  className="flex w-full items-center justify-between rounded p-2 text-left text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <span>{t.name}</span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    {t.gradeLevels.length > 0 ? `${formatGradeLevels(t.gradeLevels)} · ` : ''}
                    {t.notes?.length ?? 0} Notiz(en)
                  </span>
                </button>
              ))}
              {topics?.length === 0 && (
                <p className="text-sm text-slate-400 dark:text-slate-500">Keine Themen.</p>
              )}
            </div>
          )}

          {topicId && !noteId && (
            <div className="space-y-1">
              {(notes ?? []).map((n) => (
                <button
                  key={n.id}
                  onClick={() => setNoteId(n.id)}
                  className="flex w-full items-center justify-between rounded p-2 text-left text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <span>{n.title}</span>
                  {(selection.get(n.id)?.size ?? 0) > 0 && (
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                      {selection.get(n.id)?.size} ausgewählt
                    </span>
                  )}
                </button>
              ))}
              {notes?.length === 0 && (
                <p className="text-sm text-slate-400 dark:text-slate-500">Keine Notizen.</p>
              )}
            </div>
          )}

          {note && <NotePreview note={note} selection={selection} onToggle={toggleSection} />}
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 p-4 dark:border-slate-700">
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {selectedCount} Abschnitt(e) ausgewählt
            {saveError && <span className="ml-2 text-red-600 dark:text-red-400">{saveError}</span>}
          </span>
          <button
            onClick={() => void handleFinish()}
            disabled={saving}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Fertig
          </button>
        </div>
      </div>
    </div>
  )
}

function NotePreview({
  note,
  selection,
  onToggle,
}: {
  note: NoteDto
  selection: StoffSelection
  onToggle: (noteId: string, sectionIndex: number, label: string) => void
}) {
  const sections = extractSections(note.blocks)
  const selectedForNote = selection.get(note.id) ?? new Map()

  if (sections.length === 0) {
    return <p className="text-sm text-slate-400 dark:text-slate-500">Diese Notiz ist leer.</p>
  }

  return (
    <div className="space-y-3">
      {sections.map((section) => (
        <div
          key={section.index}
          className="rounded-lg border border-slate-200 p-3 dark:border-slate-700"
        >
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            <input
              type="checkbox"
              checked={selectedForNote.has(section.index)}
              onChange={() => onToggle(note.id, section.index, section.label)}
            />
            {section.label}
          </label>
          <div className="mt-2 max-h-64 overflow-y-auto">
            <SectionContent section={section} />
          </div>
        </div>
      ))}
    </div>
  )
}
