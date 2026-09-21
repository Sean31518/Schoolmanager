import { useState, type FormEvent } from 'react'
import { ApiRequestError } from '../../lib/apiClient'
import type { TimeGridSlotType } from './types'
import {
  useCreateTimeGridSlot,
  useDeleteTimeGridSlot,
  useReorderTimeGrid,
  useTimeGrid,
} from './hooks'

function AddButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Zeitraster-Eintrag hinzufügen"
      aria-label="Zeitraster-Eintrag hinzufügen"
      className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-md bg-accent text-accent-ink hover:bg-accent-hover"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-[15px] w-[15px]"
      >
        <path d="M5 12h14" />
        <path d="M12 5v14" />
      </svg>
    </button>
  )
}

function CreateTimeGridSlotModal({ onClose }: { onClose: () => void }) {
  const createSlot = useCreateTimeGridSlot()
  const [label, setLabel] = useState('')
  const [type, setType] = useState<TimeGridSlotType>('LESSON')
  const [startTime, setStartTime] = useState('08:00')
  const [endTime, setEndTime] = useState('08:45')
  const [error, setError] = useState<string | null>(null)

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await createSlot.mutateAsync({ label, type, startTime, endTime })
      onClose()
    } catch (err) {
      setError(
        err instanceof ApiRequestError ? err.message : 'Eintrag konnte nicht angelegt werden',
      )
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <form
        onSubmit={(e) => void handleCreate(e)}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-lg border border-border bg-bg-1 p-5 shadow-lg"
      >
        <h2 className="text-[15px] font-semibold text-text-primary">Neuer Zeitraster-Eintrag</h2>

        <label className="mt-3 block text-sm text-text-secondary">
          Bezeichnung
          <input
            autoFocus
            required
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="z.B. 1. Stunde"
            className="mt-1 block w-full rounded-md border border-border bg-bg-muted px-3 py-2 text-sm text-text-primary placeholder:text-text-muted"
          />
        </label>

        <label className="mt-3 block text-sm text-text-secondary">
          Typ
          <select
            value={type}
            onChange={(e) => setType(e.target.value as TimeGridSlotType)}
            className="dark:[color-scheme:dark] mt-1 block w-full rounded-md border border-border bg-bg-muted px-3 py-2 text-sm text-text-primary"
          >
            <option value="LESSON">Stunde</option>
            <option value="BREAK">Pause</option>
          </select>
        </label>

        <div className="mt-3 flex gap-3">
          <label className="flex-1 text-sm text-text-secondary">
            Von
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="dark:[color-scheme:dark] mt-1 block w-full rounded-md border border-border bg-bg-muted px-3 py-2 text-sm text-text-primary"
            />
          </label>
          <label className="flex-1 text-sm text-text-secondary">
            Bis
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="dark:[color-scheme:dark] mt-1 block w-full rounded-md border border-border bg-bg-muted px-3 py-2 text-sm text-text-primary"
            />
          </label>
        </div>

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

        <div className="mt-5 flex items-center gap-3">
          <button
            type="submit"
            disabled={createSlot.isPending}
            className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-ink disabled:opacity-50"
          >
            Anlegen
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border px-4 py-2 text-sm text-text-secondary hover:bg-bg-hover"
          >
            Abbrechen
          </button>
        </div>
      </form>
    </div>
  )
}

export function TimeGridEditor() {
  const { data: slots, isLoading } = useTimeGrid()
  const deleteSlot = useDeleteTimeGridSlot()
  const reorderSlots = useReorderTimeGrid()
  const [showCreate, setShowCreate] = useState(false)

  function move(index: number, direction: -1 | 1) {
    if (!slots) return
    const target = index + direction
    if (target < 0 || target >= slots.length) return
    const reordered = [...slots]
    const [item] = reordered.splice(index, 1)
    reordered.splice(target, 0, item)
    void reorderSlots.mutateAsync(reordered.map((s) => s.id))
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-text-secondary">
          {slots && slots.length > 0 ? `${slots.length} Einträge` : 'Noch kein Zeitraster angelegt.'}
        </p>
        <AddButton onClick={() => setShowCreate(true)} />
      </div>

      {!isLoading && slots && slots.length > 0 && (
        <div className="mt-4 divide-y divide-border-subtle rounded-md border border-border">
          {slots.map((slot, index) => (
            <div key={slot.id} className="flex items-center gap-3 px-3 py-2 text-sm">
              <span className="w-24 shrink-0 font-mono text-xs text-text-tertiary">
                {slot.startTime}–{slot.endTime}
              </span>
              <span className="flex-1 text-text-primary">
                {slot.label}{' '}
                <span className="text-xs text-text-tertiary">
                  ({slot.type === 'LESSON' ? 'Stunde' : 'Pause'})
                </span>
              </span>
              <button
                type="button"
                onClick={() => move(index, -1)}
                className="text-text-muted hover:text-text-primary"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => move(index, 1)}
                className="text-text-muted hover:text-text-primary"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => void deleteSlot.mutateAsync(slot.id)}
                className="text-text-muted hover:text-red-400"
              >
                Löschen
              </button>
            </div>
          ))}
        </div>
      )}

      {showCreate && <CreateTimeGridSlotModal onClose={() => setShowCreate(false)} />}
    </div>
  )
}
