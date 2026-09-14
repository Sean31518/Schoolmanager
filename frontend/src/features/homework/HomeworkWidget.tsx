import { useState, type FormEvent } from 'react'
import type { HomeworkDto } from './types'
import { useCreateHomework, useDeleteHomework, useToggleHomeworkDone } from './hooks'

export function HomeworkWidget({ items }: { items: HomeworkDto[] }) {
  const createHomework = useCreateHomework()
  const toggleDone = useToggleHomeworkDone()
  const deleteHomework = useDeleteHomework()
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    await createHomework.mutateAsync({ title, dueDate: dueDate || null })
    setTitle('')
    setDueDate('')
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-800">Hausaufgaben</h2>
      <ul className="mt-3 space-y-2">
        {items.map((hw) => (
          <li
            key={hw.id}
            className="flex items-center gap-3 rounded border border-slate-200 px-3 py-2 text-sm"
          >
            <input
              type="checkbox"
              checked={hw.done}
              onChange={(e) =>
                void toggleDone.mutateAsync({ id: hw.id, done: e.target.checked })
              }
            />
            {hw.subject && (
              <span
                className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                style={{ backgroundColor: hw.subject.color }}
              />
            )}
            <span
              className={hw.done ? 'flex-1 text-slate-400 line-through' : 'flex-1 text-slate-700'}
            >
              {hw.title}
            </span>
            {hw.dueDate && (
              <span className="text-xs text-slate-400">
                {new Date(hw.dueDate).toLocaleDateString('de-DE')}
              </span>
            )}
            <button
              onClick={() => void deleteHomework.mutateAsync(hw.id)}
              className="text-xs text-slate-400 hover:text-red-600"
            >
              ×
            </button>
          </li>
        ))}
        {items.length === 0 && (
          <p className="text-sm text-slate-400">Keine offenen Hausaufgaben.</p>
        )}
      </ul>

      <form onSubmit={handleAdd} className="mt-3 flex flex-wrap items-end gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Neue Hausaufgabe"
          className="min-w-[160px] flex-1 rounded border border-slate-300 px-3 py-1.5 text-sm"
        />
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="rounded border border-slate-300 px-3 py-1.5 text-sm"
        />
        <button
          type="submit"
          className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white"
        >
          Hinzufügen
        </button>
      </form>
    </div>
  )
}
