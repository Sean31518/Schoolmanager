import { EditorContent, useEditor, type JSONContent } from '@tiptap/react'
import { EXTENSIONS } from './RichTextEditor'

export function ReadOnlyContent({ content }: { content: JSONContent }) {
  const editor = useEditor({
    extensions: EXTENSIONS,
    content,
    editable: false,
  })

  return (
    <EditorContent editor={editor} className="prose prose-sm prose-invert max-w-none" />
  )
}
