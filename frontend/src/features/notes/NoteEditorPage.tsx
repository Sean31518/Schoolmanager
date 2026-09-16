import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { BlockList } from './blocks/BlockList'
import { NoteListSidebar } from './NoteListSidebar'
import { useNote, useSectionTypeNotes, useUpdateNote } from './hooks'

export function NoteEditorPage() {
  const { subjectId = '', sectionTypeId = '', noteId } = useParams()
  const navigate = useNavigate()
  const { data: groups } = useSectionTypeNotes(sectionTypeId)

  // No note selected yet (landed here straight from the Heft): jump to the
  // most recently edited note so opening a Heft behaves like opening a
  // document, instead of always bouncing through an empty state first.
  useEffect(() => {
    if (noteId || !groups) return
    const allNotes = groups.flatMap((g) => g.notes)
    if (allNotes.length === 0) return
    const newest = [...allNotes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]
    navigate(`/subjects/${subjectId}/sections/${sectionTypeId}/notes/${newest.id}`, {
      replace: true,
    })
  }, [noteId, groups, subjectId, sectionTypeId, navigate])

  return (
    <div className="-m-8 flex h-[calc(100vh-4rem)] rounded-lg border border-border">
      <NoteListSidebar subjectId={subjectId} sectionTypeId={sectionTypeId} activeNoteId={noteId} />
      <div className="flex-1 min-w-0 overflow-y-auto p-8">
        {noteId ? (
          <NoteEditor noteId={noteId} />
        ) : (
          <p className="text-text-tertiary">
            Wähle eine Notiz aus der Liste oder erstelle über das Plus neben der Suche eine neue.
          </p>
        )}
      </div>
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
