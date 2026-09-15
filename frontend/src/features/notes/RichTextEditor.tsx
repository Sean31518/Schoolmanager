import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import Table from '@tiptap/extension-table'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import TableRow from '@tiptap/extension-table-row'
import TaskItem from '@tiptap/extension-task-item'
import TaskList from '@tiptap/extension-task-list'
import { EditorContent, useEditor, type Editor, type JSONContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useState, type FormEvent } from 'react'
import 'tippy.js/dist/tippy.css'
import { SlashCommand } from './SlashCommand'

interface RichTextEditorProps {
  content: JSONContent
  onChange: (content: JSONContent) => void
}

export const EXTENSIONS = [
  StarterKit,
  Link.configure({ openOnClick: false }),
  Placeholder.configure({ placeholder: 'Hier tippen... ("/" für Befehle)' }),
  Table.configure({ resizable: true }),
  TableRow,
  TableHeader,
  TableCell,
  TaskList,
  TaskItem.configure({ nested: true }),
  SlashCommand,
]

export function RichTextEditor({ content, onChange }: RichTextEditorProps) {
  // `content` is only used as the editor's initial value on mount, deliberately
  // never re-synced afterward: TipTap fires onUpdate per transaction (i.e. per
  // keystroke), so feeding `content` back in via setContent on every prop
  // change raced against live typing and clobbered just-typed characters and
  // structural changes (headings/lists) with a stale snapshot. Callers that
  // need to load a different document into a fresh editor (e.g. switching
  // notes) should remount this component with a different `key` instead.
  const editor = useEditor({
    extensions: EXTENSIONS,
    content,
    onUpdate: ({ editor }) => onChange(editor.getJSON()),
  })

  return (
    <div className="rounded-lg border border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800">
      <EditorToolbar editor={editor} />
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none px-4 py-3 focus:outline-none dark:prose-invert"
      />
    </div>
  )
}

function EditorToolbar({ editor }: { editor: Editor | null }) {
  const [showTablePicker, setShowTablePicker] = useState(false)
  const [rows, setRows] = useState(3)
  const [cols, setCols] = useState(2)

  if (!editor) return null

  const buttons = [
    {
      label: 'Fett',
      onClick: () => editor.chain().focus().toggleBold().run(),
      isActive: editor.isActive('bold'),
    },
    {
      label: 'Kursiv',
      onClick: () => editor.chain().focus().toggleItalic().run(),
      isActive: editor.isActive('italic'),
    },
    {
      label: 'H1',
      onClick: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
      isActive: editor.isActive('heading', { level: 1 }),
    },
    {
      label: 'H2',
      onClick: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      isActive: editor.isActive('heading', { level: 2 }),
    },
    {
      label: '• Liste',
      onClick: () => editor.chain().focus().toggleBulletList().run(),
      isActive: editor.isActive('bulletList'),
    },
    {
      label: '1. Liste',
      onClick: () => editor.chain().focus().toggleOrderedList().run(),
      isActive: editor.isActive('orderedList'),
    },
    {
      label: '☑ Aufgaben',
      onClick: () => editor.chain().focus().toggleTaskList().run(),
      isActive: editor.isActive('taskList'),
    },
  ]

  function insertTable(e: FormEvent) {
    e.preventDefault()
    editor!.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run()
    setShowTablePicker(false)
  }

  const inTable = editor.isActive('table')

  return (
    <div className="border-b border-slate-200 dark:border-slate-700">
      <div className="flex flex-wrap items-center gap-1 p-2">
        {buttons.map((btn) => (
          <button
            key={btn.label}
            type="button"
            onClick={btn.onClick}
            className={`rounded px-2 py-1 text-xs ${
              btn.isActive
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            {btn.label}
          </button>
        ))}

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowTablePicker((v) => !v)}
            className={`rounded px-2 py-1 text-xs ${
              inTable
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            Tabelle
          </button>
          {showTablePicker && (
            <form
              onSubmit={insertTable}
              className="absolute left-0 top-full z-10 mt-1 flex items-end gap-2 rounded-lg border border-slate-200 bg-white p-3 shadow-lg dark:border-slate-700 dark:bg-slate-800"
            >
              <label className="text-xs text-slate-600 dark:text-slate-300">
                Zeilen
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={rows}
                  onChange={(e) => setRows(Math.min(20, Math.max(1, Number(e.target.value))))}
                  className="mt-1 block w-16 rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                />
              </label>
              <label className="text-xs text-slate-600 dark:text-slate-300">
                Spalten
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={cols}
                  onChange={(e) => setCols(Math.min(10, Math.max(1, Number(e.target.value))))}
                  className="mt-1 block w-16 rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                />
              </label>
              <button
                type="submit"
                className="rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white"
              >
                Einfügen
              </button>
              <button
                type="button"
                onClick={() => setShowTablePicker(false)}
                className="rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
              >
                Abbrechen
              </button>
            </form>
          )}
        </div>
      </div>

      {inTable && (
        <div className="flex flex-wrap items-center gap-1 border-t border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-900/50">
          <span className="text-xs text-slate-400 dark:text-slate-500">Tabelle:</span>
          <button
            type="button"
            onClick={() => editor.chain().focus().addRowAfter().run()}
            className="rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Zeile +
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().deleteRow().run()}
            className="rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Zeile −
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().addColumnAfter().run()}
            className="rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Spalte +
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().deleteColumn().run()}
            className="rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Spalte −
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().deleteTable().run()}
            className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
          >
            Tabelle löschen
          </button>
        </div>
      )}
    </div>
  )
}
