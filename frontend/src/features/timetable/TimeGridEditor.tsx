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
    <div className="rounded-lg bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-800">Zeitraster</h2>

      {isLoading ? (
        <p className="mt-3 text-slate-400">Lädt...</p>
      ) : (
        <ul className="mt-3 space-y-1">
          {(slots ?? []).map((slot, index) => (
            <li
              key={slot.id}
              className="flex items-center gap-3 rounded border border-slate-200 px-3 py-2 text-sm"
            >
              <span className="w-24 text-slate-500">
                {slot.startTime}–{slot.endTime}
              </span>
              <span className="flex-1">
                {slot.label}{' '}
                <span className="text-xs text-slate-400">
                  ({slot.type === 'LESSON' ? 'Stunde' : 'Pause'})
                </span>
              </span>
              <button
                type="button"
                onClick={() => move(index, -1)}
                className="text-slate-400 hover:text-slate-700"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => move(index, 1)}
                className="text-slate-400 hover:text-slate-700"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => void deleteSlot.mutateAsync(slot.id)}
                className="text-slate-400 hover:text-red-600"
              >
                Löschen
              </button>
            </li>
          ))}
          {slots && slots.length === 0 && (
            <p className="text-slate-400">Noch kein Zeitraster angelegt.</p>
          )}
        </ul>
      )}

      <form onSubmit={handleCreate} className="mt-4 flex flex-wrap items-end gap-3">
        <label className="text-sm text-slate-600">
          Bezeichnung
          <input
            required
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="z.B. 1. Stunde"
            className="mt-1 block rounded border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm text-slate-600">
          Typ
          <select
            value={type}
            onChange={(e) => setType(e.target.value as TimeGridSlotType)}
            className="mt-1 block rounded border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="LESSON">Stunde</option>
            <option value="BREAK">Pause</option>
          </select>
        </label>
        <label className="text-sm text-slate-600">
          Von
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="mt-1 block rounded border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm text-slate-600">
          Bis
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="mt-1 block rounded border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <button
          type="submit"
          disabled={createSlot.isPending}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Hinzufügen
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  )
}
