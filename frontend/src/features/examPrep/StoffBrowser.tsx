import { useState } from 'react'
import { formatGradeLevels } from '../../lib/gradeLevel'
import { listNotes } from '../notes/api'
import { useNotes, useTopics } from '../notes/hooks'
import type { NoteDto } from '../notes/types'
import { useSubjects } from '../subjects/hooks'
import { useSaveExamPrep } from './hooks'
import { extractSections } from './sections'
import { SectionContent } from './SectionContent'
import type { SaveExamPrepItem } from './types'

export type StoffSelection = Map<string, Map<number, string>>

function mergeAllSections(selection: StoffSelection, notes: NoteDto[]): StoffSelection {
  const next = new Map(selection)
  for (const note of notes) {
    const sections = extractSections(note.blocks)
    if (sections.length === 0) continue
    const forNote = new Map(next.get(note.id) ?? [])
    for (const section of sections) {
      forNote.set(section.index, section.label)
    }
    next.set(note.id, forNote)
  }
  return next
}

function removeAllSections(selection: StoffSelection, notes: NoteDto[]): StoffSelection {
  const next = new Map(selection)
  for (const note of notes) {
    next.delete(note.id)
  }
  return next
}

function isFullySelected(selection: StoffSelection, notes: NoteDto[]): boolean {
  for (const note of notes) {
    const sections = extractSections(note.blocks)
    if (sections.length === 0) continue
    const forNote = selection.get(note.id)
    if (!forNote) return false
    for (const section of sections) {
      if (!forNote.has(section.index)) return false
    }
  }
  return true
}

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
  const [bulkLoading, setBulkLoading] = useState(false)

  function toggleWholeTopic(topicNotes: NoteDto[]) {
    setSelection((prev) =>
      isFullySelected(prev, topicNotes)
        ? removeAllSections(prev, topicNotes)
        : mergeAllSections(prev, topicNotes),
    )
  }

  async function toggleWholeSectionType() {
    if (!topics || topics.length === 0) return
    setBulkLoading(true)
    try {
      const notesPerTopic = await Promise.all(topics.map((t) => listNotes(t.id)))
      const allNotes = notesPerTopic.flat()
      setSelection((prev) =>
        isFullySelected(prev, allNotes)
          ? removeAllSections(prev, allNotes)
          : mergeAllSections(prev, allNotes),
      )
    } finally {
      setBulkLoading(false)
    }
  }

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
        className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-lg border border-border bg-bg-1 shadow-lg"
      >
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="text-[15px] font-semibold text-text-primary">Stoff hinzufügen</h2>
          <button onClick={onClose} className="text-sm text-text-muted hover:text-text-primary">
            Schließen
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1 border-b border-border px-4 py-2 text-sm">
          <button
            onClick={() => {
              setSubjectId(null)
              setSectionTypeId(null)
              setTopicId(null)
              setNoteId(null)
            }}
            className="text-accent hover:underline"
          >
            Fächer
          </button>
          {subject && (
            <>
              <span className="text-text-muted">/</span>
              <button
                onClick={() => {
                  setSectionTypeId(null)
                  setTopicId(null)
                  setNoteId(null)
                }}
                className="text-accent hover:underline"
              >
                {subject.name}
              </button>
            </>
          )}
          {sectionType && (
            <>
              <span className="text-text-muted">/</span>
              <button
                onClick={() => {
                  setTopicId(null)
                  setNoteId(null)
                }}
                className="text-accent hover:underline"
              >
                {sectionType.name}
              </button>
            </>
          )}
          {topic && (
            <>
              <span className="text-text-muted">/</span>
              <button onClick={() => setNoteId(null)} className="text-accent hover:underline">
                {topic.name}
              </button>
            </>
          )}
          {note && (
            <>
              <span className="text-text-muted">/</span>
              <span className="text-text-secondary">{note.title}</span>
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
                  className="flex w-full items-center gap-2 rounded-md p-2 text-left hover:bg-bg-hover"
                >
                  <span
                    className="h-[9px] w-[9px] shrink-0 rounded-[2px]"
                    style={{ backgroundColor: s.color }}
                  />
                  <span className="text-text-secondary">{s.name}</span>
                </button>
              ))}
              {subjects?.length === 0 && (
                <p className="text-sm text-text-tertiary">Keine Fächer angelegt.</p>
              )}
            </div>
          )}

          {subjectId && !sectionTypeId && (
            <div className="space-y-1">
              {(subject?.noteSectionTypes ?? []).map((st) => (
                <button
                  key={st.id}
                  onClick={() => setSectionTypeId(st.id)}
                  className="block w-full rounded-md p-2 text-left text-text-secondary hover:bg-bg-hover"
                >
                  {st.name}
                </button>
              ))}
              {subject && subject.noteSectionTypes.length === 0 && (
                <p className="text-sm text-text-tertiary">Keine Notizbereiche.</p>
              )}
            </div>
          )}

          {sectionTypeId && !topicId && (
            <div className="space-y-1">
              {topics && topics.length > 0 && (
                <button
                  onClick={() => void toggleWholeSectionType()}
                  disabled={bulkLoading}
                  className="mb-1 block w-full rounded-md border border-dashed border-accent/40 p-2 text-left text-sm text-accent hover:bg-accent/10 disabled:opacity-50"
                >
                  {bulkLoading ? 'Lädt...' : 'Alle Themen dieses Hefts an-/abwählen'}
                </button>
              )}
              {(topics ?? []).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTopicId(t.id)}
                  className="flex w-full items-center justify-between rounded-md p-2 text-left text-text-secondary hover:bg-bg-hover"
                >
                  <span>{t.name}</span>
                  <span className="text-xs text-text-tertiary">
                    {t.gradeLevels.length > 0 ? `${formatGradeLevels(t.gradeLevels)} · ` : ''}
                    {t.notes?.length ?? 0} Notiz(en)
                  </span>
                </button>
              ))}
              {topics?.length === 0 && <p className="text-sm text-text-tertiary">Keine Themen.</p>}
            </div>
          )}

          {topicId && !noteId && (
            <div className="space-y-1">
              {notes && notes.length > 0 && (
                <button
                  onClick={() => toggleWholeTopic(notes)}
                  className="mb-1 block w-full rounded-md border border-dashed border-accent/40 p-2 text-left text-sm text-accent hover:bg-accent/10"
                >
                  {isFullySelected(selection, notes)
                    ? 'Alle Notizen dieses Themas abwählen'
                    : 'Alle Notizen dieses Themas auswählen'}
                </button>
              )}
              {(notes ?? []).map((n) => (
                <button
                  key={n.id}
                  onClick={() => setNoteId(n.id)}
                  className="flex w-full items-center justify-between rounded-md p-2 text-left text-text-secondary hover:bg-bg-hover"
                >
                  <span>{n.title}</span>
                  {(selection.get(n.id)?.size ?? 0) > 0 && (
                    <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs text-accent">
                      {selection.get(n.id)?.size} ausgewählt
                    </span>
                  )}
                </button>
              ))}
              {notes?.length === 0 && <p className="text-sm text-text-tertiary">Keine Notizen.</p>}
            </div>
          )}

          {note && <NotePreview note={note} selection={selection} onToggle={toggleSection} />}
        </div>

        <div className="flex items-center justify-between border-t border-border p-4">
          <span className="text-sm text-text-tertiary">
            {selectedCount} Abschnitt(e) ausgewählt
            {saveError && <span className="ml-2 text-red-400">{saveError}</span>}
          </span>
          <button
            onClick={() => void handleFinish()}
            disabled={saving}
            className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-ink disabled:opacity-50"
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
    return <p className="text-sm text-text-tertiary">Diese Notiz ist leer.</p>
  }

  return (
    <div className="space-y-3">
      {sections.map((section) => (
        <div key={section.index} className="rounded-lg border border-border-subtle p-3">
          <label className="flex items-center gap-2 text-sm font-medium text-text-secondary">
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
