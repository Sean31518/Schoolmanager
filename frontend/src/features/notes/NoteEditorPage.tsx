import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { BlockList } from './blocks/BlockList'
import { useNote, useUpdateNote } from './hooks'

export function NoteEditorPage() {
  const { noteId = '' } = useParams()
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
    return <p className="text-slate-400 dark:text-slate-500">Lädt...</p>
  }

  return (
    <div>
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
            className="rounded border border-slate-300 bg-white px-2 py-1 text-2xl font-semibold text-slate-800 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          />
        ) : (
          <button
            type="button"
            onClick={startRenaming}
            className="text-2xl font-semibold text-slate-800 hover:text-blue-600 dark:text-slate-100 dark:hover:text-blue-400"
          >
            {note.title}
          </button>
        )}
      </div>

      <div className="mt-4">
        <BlockList key={noteId} noteId={noteId} blocks={note.blocks} />
      </div>
    </div>
  )
}
