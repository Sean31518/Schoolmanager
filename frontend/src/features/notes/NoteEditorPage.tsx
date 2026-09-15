import type { JSONContent } from '@tiptap/react'
import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { RichTextEditor } from './RichTextEditor'
import { useNote, useSaveNote } from './hooks'

const AUTOSAVE_DELAY_MS = 1500
const EMPTY_DOC: JSONContent = { type: 'doc', content: [] }

export function NoteEditorPage() {
  const { sectionTypeId = '', gradeLevel: gradeLevelParam = '' } = useParams()
  const gradeLevel = Number(gradeLevelParam)
  const { data: note, isLoading } = useNote(sectionTypeId, gradeLevel)
  const saveNote = useSaveNote(sectionTypeId, gradeLevel)

  const [content, setContent] = useState<JSONContent | null>(null)
  const [dirty, setDirty] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!isLoading) {
      setContent((note?.contentJson as JSONContent | undefined) ?? EMPTY_DOC)
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
      void saveNote.mutateAsync(next).then(() => setDirty(false))
    }, AUTOSAVE_DELAY_MS)
  }

  async function handleSaveNow() {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (content) {
      await saveNote.mutateAsync(content)
      setDirty(false)
    }
  }

  if (isLoading || content === null) {
    return <p className="text-slate-400 dark:text-slate-500">Lädt...</p>
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">
          Klasse {gradeLevel}
        </h1>
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
