import { useState, type FormEvent } from 'react'
import { ApiRequestError } from '../lib/apiClient'
import { useCreateSectionType } from '../features/subjects/hooks'

export function CreateHeftModal({
  subjectId,
  onClose,
  onCreated,
}: {
  subjectId: string
  onClose: () => void
  onCreated?: (sectionTypeId: string) => void
}) {
  const createSectionType = useCreateSectionType(subjectId)
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      const sectionType = await createSectionType.mutateAsync({ name })
      onCreated?.(sectionType.id)
      onClose()
    } catch (err) {
      setError(
        err instanceof ApiRequestError ? err.message : 'Heft konnte nicht angelegt werden',
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
        <h2 className="text-[15px] font-semibold text-text-primary">Neues Heft</h2>

        <label className="mt-3 block text-sm text-text-secondary">
          Bezeichnung
          <input
            autoFocus
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="z.B. Regelheft, Vokabelheft"
            className="mt-1 block w-full rounded-md border border-border bg-bg-muted px-3 py-2 text-sm text-text-primary placeholder:text-text-muted"
          />
        </label>

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

        <div className="mt-5 flex items-center gap-3">
          <button
            type="submit"
            disabled={createSectionType.isPending}
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
