import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMediaQuery } from '../../lib/useMediaQuery'
import { BlockList } from './blocks/BlockList'
import { NoteListSidebar } from './NoteListSidebar'
import { useNote, useSectionTypeNotes, useUpdateNote } from './hooks'

export function NoteEditorPage() {
  const { subjectId = '', sectionTypeId = '', noteId } = useParams()
  const navigate = useNavigate()
  const { data: groups } = useSectionTypeNotes(sectionTypeId)
  const isDesktop = useMediaQuery('(min-width: 768px)')

  // No note selected yet (landed here straight from the Heft): jump to the
  // most recently edited note so opening a Heft behaves like opening a
  // document, instead of always bouncing through an empty state first. Only
  // on desktop, where both panes show at once — on mobile this would fight
  // the back button, which clears noteId specifically to show the list.
  useEffect(() => {
    if (noteId || !groups || !isDesktop) return
    const allNotes = groups.flatMap((g) => g.notes)
    if (allNotes.length === 0) return
    const newest = [...allNotes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]
    navigate(`/subjects/${subjectId}/sections/${sectionTypeId}/notes/${newest.id}`, {
      replace: true,
    })
  }, [noteId, groups, subjectId, sectionTypeId, navigate, isDesktop])

  // On mobile, show one pane at a time (list, or the open note) instead of
  // squeezing both side by side; desktop always shows both.
  const showSidebar = isDesktop || !noteId
  const showContent = isDesktop || !!noteId

  return (
    <div className="-m-4 md:-m-8 flex h-[calc(var(--app-100vh)-3.5rem)] md:h-[var(--app-100vh)] rounded-none md:rounded-lg border-0 md:border md:border-border">
      {showSidebar && (
        <NoteListSidebar subjectId={subjectId} sectionTypeId={sectionTypeId} activeNoteId={noteId} />
      )}
      {showContent && (
        <div className="min-w-0 flex-1 overflow-y-auto p-4 md:p-8">
          {!isDesktop && (
            <Link
              to={`/subjects/${subjectId}/sections/${sectionTypeId}`}
              className="mb-3 flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
              >
                <path d="m15 18-6-6 6-6" />
              </svg>
              Zurück zur Übersicht
            </Link>
          )}
          {noteId ? (
            <NoteEditor noteId={noteId} />
          ) : (
            <p className="text-text-tertiary">
              Wähle eine Notiz aus der Liste oder erstelle über das Plus neben der Suche eine neue.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function NoteEditor({ noteId }: { noteId: string }) {
  const { data: note, isLoading } = useNote(noteId)
  const updateNote = useUpdateNote(noteId)

  const [isRenaming, setIsRenaming] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')

  function startRenaming() {
    if (!note) return
    setTitleDraft(note.title)
    setIsRenaming(true)
  }

  function commitRename() {
    const trimmed = titleDraft.trim()
    setIsRenaming(false)
    if (note && trimmed && trimmed !== note.title) {
      void updateNote.mutateAsync({ title: trimmed })
    }
  }

  if (isLoading || !note) {
    return <p className="text-text-tertiary">Lädt...</p>
  }

  return (
    <>
      <div className="flex items-center justify-between">
        {isRenaming ? (
          <input
            autoFocus
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename()
              if (e.key === 'Escape') setIsRenaming(false)
            }}
            className="rounded-md border border-border bg-bg-muted px-2 py-1 text-2xl font-semibold text-text-primary"
          />
        ) : (
          <button
            type="button"
            onClick={startRenaming}
            className="text-2xl font-semibold text-text-primary hover:text-accent-text"
          >
            {note.title}
          </button>
        )}
      </div>

      <div className="mt-4">
        <BlockList key={noteId} noteId={noteId} blocks={note.blocks} />
      </div>
    </>
  )
}
