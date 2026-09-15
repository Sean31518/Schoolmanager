import { useState, type FormEvent } from 'react'
import { useSubjects } from '../subjects/hooks'
import {
  useCreateHomework,
  useCreateSubtask,
  useDeleteHomework,
  useDeleteSubtask,
  useToggleHomeworkDone,
  useUpdateHomework,
  useUpdateSubtask,
} from './hooks'
import type { HomeworkDto, HomeworkSubtaskDto } from './types'

export function HomeworkWidget({ items }: { items: HomeworkDto[] }) {
  const createHomework = useCreateHomework()
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const { data: subjects } = useSubjects()

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    await createHomework.mutateAsync({
      title,
      dueDate: dueDate || null,
      subjectId: subjectId || null,
    })
    setTitle('')
    setDueDate('')
    setSubjectId('')
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Hausaufgaben</h2>
      <ul className="mt-3 space-y-2">
        {items.map((hw) => (
          <HomeworkItem key={hw.id} hw={hw} />
        ))}
        {items.length === 0 && (
          <p className="text-sm text-slate-400 dark:text-slate-500">Keine offenen Hausaufgaben.</p>
        )}
      </ul>

      <form onSubmit={handleAdd} className="mt-3 flex flex-wrap items-end gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Neue Hausaufgabe"
          className="min-w-[160px] flex-1 rounded border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
        />
        <select
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
          className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
        >
          <option value="">Fach (optional)</option>
          {(subjects ?? []).map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
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

function HomeworkItem({ hw }: { hw: HomeworkDto }) {
  const { data: subjects } = useSubjects()
  const toggleDone = useToggleHomeworkDone()
  const updateHomework = useUpdateHomework()
  const deleteHomework = useDeleteHomework()
  const createSubtask = useCreateSubtask()

  const [isRenaming, setIsRenaming] = useState(false)
  const [titleDraft, setTitleDraft] = useState(hw.title)
  const [subtaskTitle, setSubtaskTitle] = useState('')
  const [showSubtasks, setShowSubtasks] = useState(hw.subtasks.length > 0)

  function commitRename() {
    const trimmed = titleDraft.trim()
    setIsRenaming(false)
    if (trimmed && trimmed !== hw.title) {
      void updateHomework.mutateAsync({ id: hw.id, data: { title: trimmed } })
    } else {
      setTitleDraft(hw.title)
    }
  }

  async function handleAddSubtask(e: FormEvent) {
    e.preventDefault()
    if (!subtaskTitle.trim()) return
    await createSubtask.mutateAsync({ homeworkId: hw.id, title: subtaskTitle })
    setSubtaskTitle('')
  }

  const doneSubtasks = hw.subtasks.filter((s) => s.done).length

  return (
    <li className="rounded border border-slate-200 px-3 py-2 text-sm dark:border-slate-700">
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={hw.done}
          onChange={(e) => void toggleDone.mutateAsync({ id: hw.id, done: e.target.checked })}
        />
        <select
          value={hw.subjectId ?? ''}
          onChange={(e) =>
            void updateHomework.mutateAsync({
              id: hw.id,
              data: { subjectId: e.target.value || null },
            })
          }
          className="rounded border-none bg-transparent text-xs text-slate-400 hover:text-slate-600 focus:outline-none dark:text-slate-500 dark:hover:text-slate-300"
        >
          <option value="">Fach</option>
          {(subjects ?? []).map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        {hw.subject && (
          <span
            className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
            style={{ backgroundColor: hw.subject.color }}
          />
        )}
        {isRenaming ? (
          <input
            autoFocus
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename()
              if (e.key === 'Escape') {
                setTitleDraft(hw.title)
                setIsRenaming(false)
              }
            }}
            className="flex-1 rounded border border-slate-300 bg-white px-1 py-0.5 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          />
        ) : (
          <button
            type="button"
            onClick={() => setIsRenaming(true)}
            className={
              hw.done
                ? 'flex-1 text-left text-slate-400 line-through dark:text-slate-500'
                : 'flex-1 text-left text-slate-700 hover:text-blue-600 dark:text-slate-200 dark:hover:text-blue-400'
            }
          >
            {hw.title}
          </button>
        )}
        {hw.dueDate && (
          <span className="text-xs text-slate-400 dark:text-slate-500">
            {new Date(hw.dueDate).toLocaleDateString('de-DE')}
          </span>
        )}
        <button
          type="button"
          onClick={() => setShowSubtasks((v) => !v)}
          className="text-xs text-slate-400 hover:text-blue-600 dark:text-slate-500 dark:hover:text-blue-400"
        >
          {hw.subtasks.length > 0 ? `${doneSubtasks}/${hw.subtasks.length}` : '+ Unteraufgaben'}
        </button>
        <button
          onClick={() => void deleteHomework.mutateAsync(hw.id)}
          className="text-xs text-slate-400 hover:text-red-600 dark:text-slate-500 dark:hover:text-red-400"
        >
          ×
        </button>
      </div>

      {showSubtasks && (
        <div className="mt-2 ml-6 space-y-1 border-l border-slate-200 pl-3 dark:border-slate-700">
          {hw.subtasks.map((subtask) => (
            <SubtaskRow key={subtask.id} subtask={subtask} />
          ))}
          <form onSubmit={handleAddSubtask} className="flex items-center gap-2">
            <input
              value={subtaskTitle}
              onChange={(e) => setSubtaskTitle(e.target.value)}
              placeholder="Neue Unteraufgabe"
              className="flex-1 rounded border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            />
            <button
              type="submit"
              className="text-xs text-blue-600 hover:underline dark:text-blue-400"
            >
              Hinzufügen
            </button>
          </form>
        </div>
      )}
    </li>
  )
}

function SubtaskRow({ subtask }: { subtask: HomeworkSubtaskDto }) {
  const updateSubtask = useUpdateSubtask()
  const deleteSubtask = useDeleteSubtask()
  const [isRenaming, setIsRenaming] = useState(false)
  const [titleDraft, setTitleDraft] = useState(subtask.title)

  function commitRename() {
    const trimmed = titleDraft.trim()
    setIsRenaming(false)
    if (trimmed && trimmed !== subtask.title) {
      void updateSubtask.mutateAsync({ subtaskId: subtask.id, data: { title: trimmed } })
    } else {
      setTitleDraft(subtask.title)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="checkbox"
        checked={subtask.done}
        onChange={(e) =>
          void updateSubtask.mutateAsync({
            subtaskId: subtask.id,
            data: { done: e.target.checked },
          })
        }
      />
      {isRenaming ? (
        <input
          autoFocus
          value={titleDraft}
          onChange={(e) => setTitleDraft(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitRename()
            if (e.key === 'Escape') {
              setTitleDraft(subtask.title)
              setIsRenaming(false)
            }
          }}
          className="flex-1 rounded border border-slate-300 bg-white px-1 py-0.5 text-xs dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
        />
      ) : (
        <button
          type="button"
          onClick={() => setIsRenaming(true)}
          className={
            subtask.done
              ? 'flex-1 text-left text-xs text-slate-400 line-through dark:text-slate-500'
              : 'flex-1 text-left text-xs text-slate-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400'
          }
        >
          {subtask.title}
        </button>
      )}
      <button
        onClick={() => void deleteSubtask.mutateAsync(subtask.id)}
        className="text-xs text-slate-400 hover:text-red-600 dark:text-slate-500 dark:hover:text-red-400"
      >
        ×
      </button>
    </div>
  )
}
