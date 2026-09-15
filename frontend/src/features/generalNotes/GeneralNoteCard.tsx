import type { JSONContent } from '@tiptap/react'
import { useEffect, useRef, useState } from 'react'
import { RichTextEditor } from '../notes/RichTextEditor'
import type { GeneralNoteDto } from './types'
import { useDeleteGeneralNote, useUpdateGeneralNote } from './hooks'

const AUTOSAVE_DELAY_MS = 1500
const EMPTY_DOC: JSONContent = { type: 'doc', content: [] }

export function GeneralNoteCard({ note }: { note: GeneralNoteDto }) {
  const updateNote = useUpdateGeneralNote()
  const deleteNote = useDeleteGeneralNote()
  const [title, setTitle] = useState(note.title ?? '')
  const [content, setContent] = useState<JSONContent>(
    (note.contentJson as JSONContent | undefined) ?? EMPTY_DOC,
  )
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  function scheduleSave(next: { title?: string; contentJson?: JSONContent }) {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      void updateNote.mutateAsync({ id: note.id, data: next })
    }, AUTOSAVE_DELAY_MS)
  }

  return (
    <div className="rounded-md border border-border-subtle p-3">
      <div className="flex items-center justify-between gap-2">
        <input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value)
            scheduleSave({ title: e.target.value })
          }}
          placeholder="Titel (optional)"
          className="w-full border-none bg-transparent text-sm font-medium text-text-primary placeholder:text-text-muted focus:outline-none"
        />
        <button
          onClick={() => void deleteNote.mutateAsync(note.id)}
          className="shrink-0 text-xs text-text-muted hover:text-red-400"
        >
          Löschen
        </button>
      </div>
      <div className="mt-2">
        <RichTextEditor
          content={content}
          onChange={(next) => {
            setContent(next)
            scheduleSave({ contentJson: next })
          }}
        />
      </div>
    </div>
  )
}
