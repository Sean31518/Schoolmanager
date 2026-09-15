import type { JSONContent } from '@tiptap/react'
import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { RichTextEditor } from './RichTextEditor'
import { useNote, useUpdateNote } from './hooks'

const AUTOSAVE_DELAY_MS = 1500
const EMPTY_DOC: JSONContent = { type: 'doc', content: [] }

export function NoteEditorPage() {
  const { noteId = '' } = useParams()
  const { data: note, isLoading } = useNote(noteId)
  const updateNote = useUpdateNote(noteId)

  const [content, setContent] = useState<JSONContent | null>(null)
  const [dirty, setDirty] = useState(false)
  const [isRenaming, setIsRenaming] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!isLoading && note) {
      setContent((note.contentJson as JSONContent | undefined) ?? EMPTY_DOC)
      setTitleDraft(note.title)
      setDirty(false)
    }
  }, [isLoading, note])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  function handleChange(next: JSONContent) {
    setContent(next)
    setDirty(true)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      void updateNote.mutateAsync({ contentJson: next }).then(() => setDirty(false))
    }, AUTOSAVE_DELAY_MS)
  }

  async function handleSaveNow() {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (content) {
      await updateNote.mutateAsync({ contentJson: content })
      setDirty(false)
    }
  }

  function commitRename() {
    const trimmed = titleDraft.trim()
    setIsRenaming(false)
    if (note && trimmed && trimmed !== note.title) {
      void updateNote.mutateAsync({ title: trimmed })
    } else if (note) {
      setTitleDraft(note.title)
    }
  }

  if (isLoading || content === null || !note) {
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
              if (e.key === 'Escape') {
                setTitleDraft(note.title)
                setIsRenaming(false)
              }
            }}
            className="rounded border border-slate-300 bg-white px-2 py-1 text-2xl font-semibold text-slate-800 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          />
        ) : (
          <button
            type="button"
            onClick={() => setIsRenaming(true)}
            className="text-2xl font-semibold text-slate-800 hover:text-blue-600 dark:text-slate-100 dark:hover:text-blue-400"
          >
            {note.title}
          </button>
        )}
        <div className="flex items-center gap-3 text-sm">
          <span
            className={dirty ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400'}
          >
            {dirty ? 'Ungespeicherte Änderungen' : 'Gespeichert'}
          </span>
          <button
            onClick={() => void handleSaveNow()}
            className="rounded bg-blue-600 px-3 py-1.5 text-white"
          >
            Speichern
          </button>
        </div>
      </div>

      <div className="mt-4">
        <RichTextEditor content={content} onChange={handleChange} />
      </div>
    </div>
  )
}
