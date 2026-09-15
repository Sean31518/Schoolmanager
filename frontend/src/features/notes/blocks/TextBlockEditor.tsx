import type { JSONContent } from '@tiptap/react'
import { useEffect, useRef } from 'react'
import { RichTextEditor } from '../RichTextEditor'

const AUTOSAVE_DELAY_MS = 1500

export function TextBlockEditor({
  blockId,
  content,
  onSave,
}: {
  blockId: string
  content: JSONContent
  onSave: (content: JSONContent) => void
}) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  function handleChange(next: JSONContent) {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => onSave(next), AUTOSAVE_DELAY_MS)
  }

  return <RichTextEditor key={blockId} content={content} onChange={handleChange} />
}
