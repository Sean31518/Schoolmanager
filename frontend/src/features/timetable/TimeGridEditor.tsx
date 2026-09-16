import { useState, type FormEvent } from 'react'
import { ApiRequestError } from '../../lib/apiClient'
import type { TimeGridSlotType } from './types'
import {
  useCreateTimeGridSlot,
  useDeleteTimeGridSlot,
  useReorderTimeGrid,
  useTimeGrid,
} from './hooks'

export function TimeGridEditor() {
  const { data: slots, isLoading } = useTimeGrid()
  const createSlot = useCreateTimeGridSlot()
  const deleteSlot = useDeleteTimeGridSlot()
  const reorderSlots = useReorderTimeGrid()

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
      setLabel('')
    } catch (err) {
      setError(
        err instanceof ApiRequestError ? err.message : 'Eintrag konnte nicht angelegt werden',
      )
    }
  }

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
      {isLoading ? (
        <p className="text-text-tertiary">Lädt...</p>
      ) : slots && slots.length > 0 ? (
        <div className="divide-y divide-border-subtle rounded-md border border-border">
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
      ) : (
        <p className="text-text-tertiary">Noch kein Zeitraster angelegt.</p>
      )}

      <form onSubmit={handleCreate} className="mt-4 flex flex-wrap items-end gap-3">
        <label className="text-sm text-text-secondary">
          Bezeichnung
          <input
            required
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="z.B. 1. Stunde"
            className="mt-1 block rounded-md border border-border bg-bg-muted px-3 py-2 text-sm text-text-primary placeholder:text-text-muted"
          />
        </label>
        <label className="text-sm text-text-secondary">
          Typ
          <select
            value={type}
            onChange={(e) => setType(e.target.value as TimeGridSlotType)}
            className="[color-scheme:dark] mt-1 block rounded-md border border-border bg-bg-muted px-3 py-2 text-sm text-text-primary"
          >
            <option value="LESSON">Stunde</option>
            <option value="BREAK">Pause</option>
          </select>
        </label>
        <label className="text-sm text-text-secondary">
          Von
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="[color-scheme:dark] mt-1 block rounded-md border border-border bg-bg-muted px-3 py-2 text-sm text-text-primary"
          />
        </label>
        <label className="text-sm text-text-secondary">
          Bis
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="[color-scheme:dark] mt-1 block rounded-md border border-border bg-bg-muted px-3 py-2 text-sm text-text-primary"
          />
        </label>
        <button
          type="submit"
          disabled={createSlot.isPending}
          className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-ink disabled:opacity-50"
        >
          Hinzufügen
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  )
}
