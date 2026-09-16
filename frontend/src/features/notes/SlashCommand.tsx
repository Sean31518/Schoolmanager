import { Extension } from '@tiptap/core'
import { ReactRenderer } from '@tiptap/react'
import Suggestion, { type SuggestionOptions } from '@tiptap/suggestion'
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import tippy, { type Instance as TippyInstance } from 'tippy.js'
import type { Editor, Range } from '@tiptap/core'

interface CommandItem {
  title: string
  keywords: string[]
  command: (props: { editor: Editor; range: Range }) => void
}

export interface BlockActions {
  onInsertText: () => void
  onRequestPdf: () => void
  onRequestVideo: () => void
  onRequestLink: () => void
  onRequestImage: () => void
}

type BlockActionsRef = { current?: BlockActions }

function buildBlockCommands(blockActionsRef: BlockActionsRef): CommandItem[] {
  return [
    {
      title: 'Text',
      keywords: ['text', 'absatz', 'block'],
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).run()
        blockActionsRef.current?.onInsertText()
      },
    },
    {
      title: 'PDF',
      keywords: ['pdf', 'datei'],
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).run()
        blockActionsRef.current?.onRequestPdf()
      },
    },
    {
      title: 'Video',
      keywords: ['video', 'film'],
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).run()
        blockActionsRef.current?.onRequestVideo()
      },
    },
    {
      title: 'Bild',
      keywords: ['bild', 'foto', 'image'],
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).run()
        blockActionsRef.current?.onRequestImage()
      },
    },
    {
      title: 'Link',
      keywords: ['link', 'url', 'embed'],
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).run()
        blockActionsRef.current?.onRequestLink()
      },
    },
  ]
}

const COMMANDS: CommandItem[] = [
  {
    title: 'Überschrift 1',
    keywords: ['h1', 'überschrift', 'heading'],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run(),
  },
  {
    title: 'Überschrift 2',
    keywords: ['h2', 'überschrift', 'heading'],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run(),
  },
  {
    title: 'Aufzählung',
    keywords: ['liste', 'bullet', 'ul'],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleBulletList().run(),
  },
  {
    title: 'Nummerierte Liste',
    keywords: ['nummeriert', 'ol', '1'],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
  },
  {
    title: 'Aufgabenliste',
    keywords: ['aufgaben', 'todo', 'task', 'checkbox'],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleTaskList().run(),
  },
  {
    title: 'Tabelle',
    keywords: ['tabelle', 'table'],
    command: ({ editor, range }) =>
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertTable({ rows: 3, cols: 2, withHeaderRow: true })
        .run(),
  },
]

function getItems(query: string, blockActionsRef?: BlockActionsRef): CommandItem[] {
  const all = blockActionsRef?.current ? [...COMMANDS, ...buildBlockCommands(blockActionsRef)] : COMMANDS
  const q = query.toLowerCase()
  if (!q) return all
  return all.filter(
    (item) =>
      item.title.toLowerCase().includes(q) || item.keywords.some((k) => k.startsWith(q)),
  )
}

interface SlashMenuHandle {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean
}

const SlashMenu = forwardRef<
  SlashMenuHandle,
  { items: CommandItem[]; command: (item: CommandItem) => void }
>(({ items, command }, ref) => {
  const [selected, setSelected] = useState(0)

  useEffect(() => setSelected(0), [items])

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === 'ArrowDown') {
        setSelected((prev) => (prev + 1) % items.length)
        return true
      }
      if (event.key === 'ArrowUp') {
        setSelected((prev) => (prev - 1 + items.length) % items.length)
        return true
      }
      if (event.key === 'Enter') {
        if (items[selected]) command(items[selected])
        return true
      }
      return false
    },
  }))

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-2 text-sm text-slate-400 shadow-lg dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500">
        Keine Treffer
      </div>
    )
  }

  return (
    <div className="w-56 overflow-hidden rounded-lg border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-800">
      {items.map((item, index) => (
        <button
          key={item.title}
          type="button"
          onClick={() => command(item)}
          onMouseEnter={() => setSelected(index)}
          className={`block w-full rounded px-2 py-1.5 text-left text-sm ${
            index === selected
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
              : 'text-slate-700 dark:text-slate-200'
          }`}
        >
          {item.title}
        </button>
      ))}
    </div>
  )
})
SlashMenu.displayName = 'SlashMenu'

type SuggestionRender = NonNullable<SuggestionOptions<CommandItem>['render']>

const renderSlashMenu: () => ReturnType<SuggestionRender> = () => {
  let component: ReactRenderer<SlashMenuHandle> | null = null
  let popup: TippyInstance[] | null = null

  return {
    onStart: (props) => {
      component = new ReactRenderer(SlashMenu, {
        props: { items: props.items, command: (item: CommandItem) => props.command(item) },
        editor: props.editor,
      })

      if (!props.clientRect) return

      popup = tippy('body', {
        getReferenceClientRect: () => props.clientRect!()!,
        appendTo: () => document.body,
        content: component.element,
        showOnCreate: true,
        interactive: true,
        trigger: 'manual',
        placement: 'bottom-start',
      })
    },
    onUpdate(props) {
      component?.updateProps({
        items: props.items,
        command: (item: CommandItem) => props.command(item),
      })
      if (!props.clientRect || !popup) return
      popup[0]?.setProps({ getReferenceClientRect: () => props.clientRect!()! })
    },
    onKeyDown(props) {
      if (props.event.key === 'Escape') {
        popup?.[0]?.hide()
        return true
      }
      return component?.ref?.onKeyDown(props) ?? false
    },
    onExit() {
      popup?.[0]?.destroy()
      component?.destroy()
    },
  }
}

export const SlashCommand = Extension.create<{
  blockActionsRef?: BlockActionsRef
  suggestion: Partial<SuggestionOptions<CommandItem>>
}>({
  name: 'slashCommand',

  addOptions() {
    return {
      blockActionsRef: undefined,
      suggestion: {
        char: '/',
        startOfLine: false,
        command: ({
          editor,
          range,
          props,
        }: {
          editor: Editor
          range: Range
          props: CommandItem
        }) => {
          props.command({ editor, range })
        },
        items: ({ query }: { query: string }) => getItems(query),
        render: renderSlashMenu,
      } satisfies Partial<SuggestionOptions<CommandItem>>,
    }
  },

  addProseMirrorPlugins() {
    const blockActionsRef = this.options.blockActionsRef
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
        items: ({ query }: { query: string }) => getItems(query, blockActionsRef),
      }),
    ]
  },
})
