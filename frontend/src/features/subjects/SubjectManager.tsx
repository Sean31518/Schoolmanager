import { useState, type FormEvent } from 'react'
import { ApiRequestError } from '../../lib/apiClient'
import { SUBJECT_PALETTE } from '../../lib/subjectPalette'
import { useCreateSubject, useDeleteSubject, useSubjects, useUpdateSubject } from './hooks'
import type { SubjectDto } from './types'

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

export function SubjectManager() {
  const { data: subjects, isLoading } = useSubjects()
  const createSubject = useCreateSubject()
  const [name, setName] = useState('')
  const [color, setColor] = useState('#3B82F6')
  const [error, setError] = useState<string | null>(null)

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await createSubject.mutateAsync({ name, color })
      setName('')
    } catch (err) {
      setError(
        err instanceof ApiRequestError ? err.message : 'Fach konnte nicht angelegt werden',
      )
    }
  }

  return (
    <div>
      <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3">
        <label className="text-sm text-text-secondary">
          Name
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block rounded-md border border-border bg-bg-muted px-3 py-2 text-sm text-text-primary"
          />
        </label>
        <label className="text-sm text-text-secondary">
          Farbe
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="[color-scheme:dark] mt-1 block h-9 w-14 rounded-md border border-border"
          />
          <PaletteSwatches onPick={setColor} />
        </label>
        <button
          type="submit"
          disabled={createSubject.isPending}
          className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-ink disabled:opacity-50"
        >
          Fach anlegen
        </button>
        {error && <p className="w-full text-sm text-red-400">{error}</p>}
      </form>

      {isLoading ? (
        <p className="mt-4 text-text-tertiary">Lädt...</p>
      ) : subjects && subjects.length > 0 ? (
        <ul className="mt-4 divide-y divide-border-subtle rounded-md border border-border">
          {subjects.map((subject) => (
            <SubjectManagerRow key={subject.id} subject={subject} />
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-text-tertiary">Noch keine Fächer angelegt.</p>
      )}
    </div>
  )
}

function SubjectManagerRow({ subject }: { subject: SubjectDto }) {
  const updateSubject = useUpdateSubject(subject.id)
  const deleteSubject = useDeleteSubject()
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState(subject.name)
  const [color, setColor] = useState(subject.color)
  const [error, setError] = useState<string | null>(null)

  function startEditing() {
    setName(subject.name)
    setColor(subject.color)
    setError(null)
    setIsEditing(true)
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await updateSubject.mutateAsync({ name, color })
      setIsEditing(false)
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Fach konnte nicht gespeichert werden')
    }
  }

  function handleDelete() {
    if (confirm(`"${subject.name}" inklusive aller Notizbereiche und Notizen löschen?`)) {
      void deleteSubject.mutateAsync(subject.id)
    }
  }

  if (isEditing) {
    return (
      <li className="p-3">
        <form onSubmit={handleSave} className="flex flex-wrap items-end gap-3">
          <label className="text-sm text-text-secondary">
            Name
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block rounded-md border border-border bg-bg-muted px-3 py-2 text-sm text-text-primary"
            />
          </label>
          <label className="text-sm text-text-secondary">
            Farbe
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="[color-scheme:dark] mt-1 block h-9 w-14 rounded-md border border-border"
            />
            <PaletteSwatches onPick={setColor} />
          </label>
          <button
            type="submit"
            disabled={updateSubject.isPending}
            className="rounded-md bg-accent px-3 py-2 text-sm font-semibold text-accent-ink disabled:opacity-50"
          >
            Speichern
          </button>
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="rounded-md border border-border px-3 py-2 text-sm text-text-secondary hover:bg-bg-hover"
          >
            Abbrechen
          </button>
          {error && <p className="w-full text-sm text-red-400">{error}</p>}
        </form>
      </li>
    )
  }

  return (
    <li className="flex items-center gap-3 px-3 py-2.5 text-sm">
      <span
        className="h-[9px] w-[9px] shrink-0 rounded-[2px]"
        style={{ backgroundColor: subject.color }}
      />
      <span className="font-medium text-text-primary">{subject.name}</span>
      <span className="ml-auto flex items-center gap-3">
        <button onClick={startEditing} className="text-text-muted hover:text-accent">
          Bearbeiten
        </button>
        <button onClick={handleDelete} className="text-text-muted hover:text-red-400">
          Löschen
        </button>
      </span>
    </li>
  )
}
