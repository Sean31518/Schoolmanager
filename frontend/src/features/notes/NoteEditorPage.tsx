import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { BlockList } from './blocks/BlockList'
import { NoteListSidebar } from './NoteListSidebar'
import { useNote, useUpdateNote } from './hooks'

export function NoteEditorPage() {
  const { subjectId = '', noteId = '' } = useParams()
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

  return (
    <div className="-m-8 flex h-[calc(100vh-4rem)] rounded-lg border border-border">
      <NoteListSidebar subjectId={subjectId} activeNoteId={noteId} />

      <div className="flex-1 min-w-0 overflow-y-auto p-8">
        {isLoading || !note ? (
          <p className="text-text-tertiary">Lädt...</p>
        ) : (
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
                  className="text-2xl font-semibold text-text-primary hover:text-accent"
                >
                  {note.title}
                </button>
              )}
            </div>

            <div className="mt-4">
              <BlockList key={noteId} noteId={noteId} blocks={note.blocks} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
