import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { formatRelativeTime } from '../../lib/relativeTime'
import { useSubject } from '../subjects/hooks'
import {
  useCreateNoteInTopic,
  useCreateTopic,
  useDeleteNoteById,
  useDeleteTopic,
  useSectionTypeNotes,
  useUpdateTopic,
} from './hooks'
import type { SectionTypeNoteGroupDto } from './types'

export function NoteListSidebar({
  subjectId,
  sectionTypeId,
  activeNoteId,
}: {
  subjectId: string
  sectionTypeId: string
  activeNoteId?: string
}) {
  const { data: subject } = useSubject(subjectId)
  const { data: groups, isLoading } = useSectionTypeNotes(sectionTypeId)
  const [query, setQuery] = useState('')

  const sectionType = subject?.noteSectionTypes.find((st) => st.id === sectionTypeId)

  const q = query.trim().toLowerCase()
  const filteredGroups = (groups ?? [])
    .map((group) => ({
      ...group,
      notes: q
        ? group.notes.filter(
            (note) =>
              note.title.toLowerCase().includes(q) || group.topicName.toLowerCase().includes(q),
          )
        : group.notes,
    }))
    .filter((group) => !q || group.notes.length > 0)

  return (
    <div className="flex w-[264px] shrink-0 flex-col border-r border-border">
      <div className="flex flex-col gap-2 border-b border-border p-3.5">
        <Link
          to={`/subjects/${subjectId}`}
          className="flex items-center gap-2 text-text-primary hover:text-accent"
        >
          {subject && (
            <span
              className="h-[9px] w-[9px] shrink-0 rounded-[2px]"
              style={{ backgroundColor: subject.color }}
            />
          )}
          <span className="truncate text-sm font-semibold">{subject?.name}</span>
        </Link>
        <div className="flex items-center gap-1.5">
          <label className="flex flex-1 items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs text-text-muted focus-within:border-text-disabled">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-[13px] w-[13px] shrink-0"
            >
              <path d="m21 21-4.34-4.34" />
              <circle cx="11" cy="11" r="8" />
            </svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`In ${sectionType?.name ?? 'Heft'} suchen`}
              className="w-full bg-transparent text-xs text-text-primary placeholder:text-text-muted focus:outline-none"
            />
          </label>
          <QuickCreateMenu subjectId={subjectId} sectionTypeId={sectionTypeId} groups={groups ?? []} />
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {isLoading && <p className="p-3 text-xs text-text-tertiary">Lädt...</p>}
        {!isLoading && filteredGroups.length === 0 && (
          <p className="p-3 text-xs text-text-tertiary">Keine Themen/Notizen gefunden.</p>
        )}
        {filteredGroups.map((group) => (
          <TopicGroup
            key={group.topicId}
            subjectId={subjectId}
            sectionTypeId={sectionTypeId}
            group={group}
            activeNoteId={activeNoteId}
          />
        ))}
      </div>
    </div>
  )
}

function TopicGroup({
  subjectId,
  sectionTypeId,
  group,
  activeNoteId,
}: {
  subjectId: string
  sectionTypeId: string
  group: SectionTypeNoteGroupDto
  activeNoteId?: string
}) {
  const updateTopic = useUpdateTopic(sectionTypeId)
  const deleteTopic = useDeleteTopic(sectionTypeId)
  const createNote = useCreateNoteInTopic()
  const deleteNote = useDeleteNoteById()
  const navigate = useNavigate()

  const [isRenaming, setIsRenaming] = useState(false)
  const [nameDraft, setNameDraft] = useState(group.topicName)

  function commitRename() {
    const trimmed = nameDraft.trim()
    setIsRenaming(false)
    if (trimmed && trimmed !== group.topicName) {
      void updateTopic.mutateAsync({ topicId: group.topicId, data: { name: trimmed } })
    } else {
      setNameDraft(group.topicName)
    }
  }

  function handleDeleteTopic() {
    if (confirm(`Thema "${group.topicName}" inklusive aller Notizen löschen?`)) {
      void deleteTopic.mutateAsync(group.topicId)
    }
  }

  async function handleCreateNote() {
    const note = await createNote.mutateAsync({ topicId: group.topicId, title: 'Neue Notiz' })
    navigate(`/subjects/${subjectId}/sections/${sectionTypeId}/notes/${note.id}`)
  }

  function handleDeleteNote(noteId: string) {
    if (confirm('Notiz wirklich löschen?')) {
      void deleteNote.mutateAsync(noteId)
    }
  }

  return (
    <div className="group/topic">
      <div className="flex items-center gap-1 px-3.5 pt-2.5 pb-1">
        {isRenaming ? (
          <input
            autoFocus
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename()
              if (e.key === 'Escape') {
                setNameDraft(group.topicName)
                setIsRenaming(false)
              }
            }}
            className="flex-1 rounded border border-border bg-bg-muted px-1 py-0.5 font-mono text-[10px] tracking-wider text-text-primary"
          />
        ) : (
          <button
            type="button"
            onClick={() => setIsRenaming(true)}
            title="Zum Umbenennen klicken"
            className="flex-1 truncate text-left font-mono text-[10px] tracking-wider text-text-tertiary hover:text-text-secondary"
          >
            {group.topicName.toUpperCase()}
          </button>
        )}
        <button
          type="button"
          onClick={() => void handleCreateNote()}
          title="Neue Notiz in diesem Thema"
          className="hidden h-5 w-5 shrink-0 items-center justify-center rounded-[4px] text-text-muted hover:bg-bg-hover hover:text-accent group-hover/topic:flex"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3.5 w-3.5"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
        <button
          type="button"
          onClick={handleDeleteTopic}
          title="Thema löschen"
          className="hidden h-5 w-5 shrink-0 items-center justify-center rounded-[4px] text-text-muted hover:bg-bg-hover hover:text-red-400 group-hover/topic:flex"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3.5 w-3.5"
          >
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {group.notes.length === 0 && (
        <p className="px-3.5 pb-2 text-[11px] text-text-muted">Noch keine Notizen.</p>
      )}
      {group.notes.map((note) => {
        const isActive = note.id === activeNoteId
        return (
          <div key={note.id} className="group/note relative">
            <Link
              to={`/subjects/${subjectId}/sections/${sectionTypeId}/notes/${note.id}`}
              className={
                isActive
                  ? 'block border-t border-border-subtle bg-bg-hover py-2 pl-6 pr-8 shadow-[inset_3px_0_0_var(--color-accent)]'
                  : 'block border-t border-border-subtle py-2 pl-6 pr-8 hover:bg-bg-hover/50'
              }
            >
              <div
                className={
                  isActive
                    ? 'truncate text-[12.5px] font-semibold text-text-primary'
                    : 'truncate text-[12.5px] font-medium text-text-secondary'
                }
              >
                {note.title}
              </div>
              <div className="mt-0.5 font-mono text-[10px] text-text-muted">
                {formatRelativeTime(note.updatedAt)}
              </div>
            </Link>
            <button
              type="button"
              onClick={() => handleDeleteNote(note.id)}
              title="Notiz löschen"
              className="absolute right-2 top-1/2 hidden h-5 w-5 -translate-y-1/2 items-center justify-center rounded-[4px] text-text-muted hover:bg-bg-hover hover:text-red-400 group-hover/note:flex"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-3.5 w-3.5"
              >
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        )
      })}
    </div>
  )
}

function QuickCreateMenu({
  subjectId,
  sectionTypeId,
  groups,
}: {
  subjectId: string
  sectionTypeId: string
  groups: SectionTypeNoteGroupDto[]
}) {
  const [open, setOpen] = useState(false)
  const [newTopicName, setNewTopicName] = useState('')
  const createTopic = useCreateTopic(sectionTypeId)
  const createNote = useCreateNoteInTopic()
  const navigate = useNavigate()

  async function handlePickTopic(topicId: string) {
    setOpen(false)
    const note = await createNote.mutateAsync({ topicId, title: 'Neue Notiz' })
    navigate(`/subjects/${subjectId}/sections/${sectionTypeId}/notes/${note.id}`)
  }

  async function handleCreateTopic(e: FormEvent) {
    e.preventDefault()
    const name = newTopicName.trim()
    if (!name) return
    await createTopic.mutateAsync({ name })
    setNewTopicName('')
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Neue Notiz erstellen"
        className="relative z-20 flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-md border border-border text-text-secondary hover:border-text-disabled hover:text-text-primary"
      >
        +
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-20 mt-1 w-56 rounded-lg border border-border bg-bg-2 p-1.5 shadow-lg">
            <div className="px-1.5 pb-1 font-mono text-[9px] tracking-wider text-text-muted">
              NEUE NOTIZ IN...
            </div>
            {groups.length === 0 && (
              <p className="px-1.5 pb-1.5 text-xs text-text-tertiary">Noch keine Themen.</p>
            )}
            {groups.map((group) => (
              <button
                key={group.topicId}
                type="button"
                onClick={() => void handlePickTopic(group.topicId)}
                className="block w-full truncate rounded-md px-1.5 py-1 text-left text-xs text-text-secondary hover:bg-bg-hover"
              >
                {group.topicName}
              </button>
            ))}
            <div className="my-1.5 h-px bg-border" />
            <form onSubmit={(e) => void handleCreateTopic(e)} className="flex items-center gap-1">
              <input
                autoFocus
                value={newTopicName}
                onChange={(e) => setNewTopicName(e.target.value)}
                placeholder="Neues Thema..."
                className="w-full min-w-0 flex-1 rounded-md border border-border bg-bg-muted px-2 py-1 text-xs text-text-primary placeholder:text-text-muted"
              />
              <button
                type="submit"
                className="shrink-0 rounded-md bg-accent px-2 py-1 text-xs font-semibold text-accent-ink"
              >
                +
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  )
}
