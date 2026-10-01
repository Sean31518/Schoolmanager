import { useState, type FormEvent } from 'react'
import { HeftPickerModal } from '../hefte/HeftPickerModal'
import { LinkChips } from '../hefte/HeftLinks'
import { linksToDrafts } from '../hefte/links'
import { toLinkInputs, type DraftLink } from '../hefte/types'
import { useSubjects } from '../subjects/hooks'
import {
  useCreateSubtask,
  useDeleteHomework,
  useDeleteSubtask,
  useToggleHomeworkDone,
  useUpdateHomework,
  useUpdateSubtask,
} from './hooks'
import type { HomeworkDto, HomeworkSubtaskDto } from './types'

export function HomeworkWidget({ items }: { items: HomeworkDto[] }) {
  return (
    <div className="rounded-lg border border-border bg-bg-1">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="font-mono text-[10px] tracking-wider text-text-tertiary">
          HAUSAUFGABEN
        </span>
        {items.length > 0 && (
          <span className="rounded-[4px] border border-accent/40 px-1.5 py-px font-mono text-[10px] text-accent-text">
            {items.filter((hw) => !hw.done).length} OFFEN
          </span>
        )}
      </div>
      {items.length === 0 && (
        <p className="px-3 py-3 text-sm text-text-tertiary">Keine offenen Hausaufgaben.</p>
      )}
      {items.map((hw) => (
        <HomeworkItem key={hw.id} hw={hw} />
      ))}
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
    <div className="border-b border-border-subtle px-3 py-2 text-sm">
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={() => void toggleDone.mutateAsync({ id: hw.id, done: !hw.done })}
          className={
            hw.done
              ? 'flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[4px] bg-accent text-accent-ink'
              : 'h-3.5 w-3.5 shrink-0 rounded-[4px] border-[1.5px] border-text-disabled'
          }
        >
          {hw.done && (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="h-2.5 w-2.5">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          )}
        </button>
        {hw.subject && (
          <span
            className="h-[7px] w-[7px] shrink-0 rounded-[2px]"
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
            className="flex-1 rounded-md border border-border bg-bg-muted px-1 py-0.5 text-sm text-text-primary"
          />
        ) : (
          <button
            type="button"
            onClick={() => setIsRenaming(true)}
            className={
              hw.done
                ? 'flex-1 truncate text-left text-text-muted line-through'
                : 'flex-1 truncate text-left text-text-primary'
            }
          >
            {hw.title}
          </button>
        )}
        <select
          value={hw.subjectId ?? ''}
          onChange={(e) =>
            void updateHomework.mutateAsync({
              id: hw.id,
              data: { subjectId: e.target.value || null },
            })
          }
          className="rounded border-none bg-transparent text-[10px] text-text-muted focus:outline-none"
        >
          <option value="">Fach</option>
          {(subjects ?? []).map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={hw.dueDate ? hw.dueDate.slice(0, 10) : ''}
          onChange={(e) =>
            void updateHomework.mutateAsync({
              id: hw.id,
              data: { dueDate: e.target.value || null },
            })
          }
          title="Fällig am"
          className="dark:[color-scheme:dark] shrink-0 rounded border-none bg-transparent font-mono text-[10px] text-text-tertiary focus:outline-none"
        />
        <button
          type="button"
          onClick={() => setShowSubtasks((v) => !v)}
          className="shrink-0 rounded-[4px] bg-bg-hover px-1.5 py-px font-mono text-[10px] text-text-tertiary hover:text-text-primary"
        >
          {hw.subtasks.length > 0 ? `${doneSubtasks}/${hw.subtasks.length}` : '+'}
        </button>
        <HeftLinkButton hw={hw} />
        <button
          onClick={() => void deleteHomework.mutateAsync(hw.id)}
          className="shrink-0 text-text-muted hover:text-red-400"
        >
          ×
        </button>
      </div>

      <LinkChips
        links={hw.links}
        className="mt-1.5 ml-6"
        onRemove={(linkId) =>
          void updateHomework.mutateAsync({
            id: hw.id,
            data: { links: toLinkInputs(linksToDrafts(hw.links).filter((l) => l.id !== linkId)) },
          })
        }
      />

      {showSubtasks && (
        <div className="mt-2 ml-6 space-y-1 border-l border-border-subtle pl-3">
          {hw.subtasks.map((subtask) => (
            <SubtaskRow key={subtask.id} subtask={subtask} />
          ))}
          <form onSubmit={handleAddSubtask} className="flex items-center gap-2">
            <input
              value={subtaskTitle}
              onChange={(e) => setSubtaskTitle(e.target.value)}
              placeholder="Neue Unteraufgabe"
              className="flex-1 rounded-md border border-border bg-bg-muted px-2 py-1 text-xs text-text-primary placeholder:text-text-muted"
            />
            <button type="submit" className="text-xs text-accent-text hover:underline">
              Hinzufügen
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

function HeftLinkButton({ hw }: { hw: HomeworkDto }) {
  const [open, setOpen] = useState(false)
  const updateHomework = useUpdateHomework()

  function add(link: DraftLink) {
    setOpen(false)
    void updateHomework.mutateAsync({
      id: hw.id,
      data: { links: toLinkInputs([...linksToDrafts(hw.links), link]) },
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Heft oder Seiten verknüpfen"
        className={
          hw.links.length > 0
            ? 'shrink-0 text-accent-text'
            : 'shrink-0 text-text-muted hover:text-text-primary'
        }
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-3.5 w-3.5"
        >
          <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
        </svg>
      </button>
      {open && <HeftPickerModal subjectId={hw.subjectId} onPick={add} onClose={() => setOpen(false)} />}
    </>
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
          className="flex-1 rounded-md border border-border bg-bg-muted px-1 py-0.5 text-xs text-text-primary"
        />
      ) : (
        <button
          type="button"
          onClick={() => setIsRenaming(true)}
          className={
            subtask.done
              ? 'flex-1 text-left text-xs text-text-muted line-through'
              : 'flex-1 text-left text-xs text-text-secondary'
          }
        >
          {subtask.title}
        </button>
      )}
      <button
        onClick={() => void deleteSubtask.mutateAsync(subtask.id)}
        className="text-xs text-text-muted hover:text-red-400"
      >
        ×
      </button>
    </div>
  )
}
