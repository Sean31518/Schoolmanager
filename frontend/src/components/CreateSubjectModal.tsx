import { useState, type FormEvent } from 'react'
import { ApiRequestError } from '../lib/apiClient'
import { SUBJECT_PALETTE } from '../lib/subjectPalette'
import { useCreateSubject } from '../features/subjects/hooks'
import type { SubjectDto } from '../features/subjects/types'

function PaletteSwatches({ onPick }: { onPick: (color: string) => void }) {
  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {SUBJECT_PALETTE.map((hex) => (
        <button
          key={hex}
          type="button"
          title={hex}
          onClick={() => onPick(hex)}
          className="h-4 w-4 rounded-sm ring-1 ring-inset ring-white/10"
          style={{ backgroundColor: hex }}
        />
      ))}
    </div>
  )
}

export function CreateSubjectModal({
  initialName = '',
  initialAlias = '',
  onClose,
  onCreated,
}: {
  initialName?: string
  initialAlias?: string
  onClose: () => void
  onCreated?: (subject: SubjectDto) => void
}) {
  const createSubject = useCreateSubject()
  const [name, setName] = useState(initialName)
  const [color, setColor] = useState('#3B82F6')
  const [iservAlias, setIservAlias] = useState(initialAlias)
  const [error, setError] = useState<string | null>(null)

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      const subject = await createSubject.mutateAsync({
        name,
        color,
        iservAlias: iservAlias.trim() || null,
      })
      onCreated?.(subject)
      onClose()
    } catch (err) {
      setError(
        err instanceof ApiRequestError ? err.message : 'Fach konnte nicht angelegt werden',
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
        <h2 className="text-[15px] font-semibold text-text-primary">Neues Fach</h2>

        <label className="mt-3 block text-sm text-text-secondary">
          Name
          <input
            autoFocus
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full rounded-md border border-border bg-bg-muted px-3 py-2 text-sm text-text-primary"
          />
        </label>

        <label className="mt-3 block text-sm text-text-secondary">
          Farbe
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="dark:[color-scheme:dark] mt-1 block h-9 w-14 rounded-md border border-border"
          />
          <PaletteSwatches onPick={setColor} />
        </label>

        <label className="mt-3 block text-sm text-text-secondary">
          IServ-Kürzel (optional)
          <input
            value={iservAlias}
            onChange={(e) => setIservAlias(e.target.value)}
            placeholder="z.B. bk3"
            title="Falls IServs Kürzel sich nicht vom Fachnamen ableiten lässt (z.B. bk3 für Kunst)"
            className="mt-1 block w-28 rounded-md border border-border bg-bg-muted px-3 py-2 text-sm text-text-primary placeholder:text-text-muted"
          />
        </label>

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

        <div className="mt-5 flex items-center gap-3">
          <button
            type="submit"
            disabled={createSubject.isPending}
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
