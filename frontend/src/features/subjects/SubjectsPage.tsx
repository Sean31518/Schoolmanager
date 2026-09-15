import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ApiRequestError } from '../../lib/apiClient'
import { useCreateSubject, useSubjects, useUpdateSubject } from './hooks'
import type { SubjectDto } from './types'

export function SubjectsPage() {
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
      <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">Fächer</h1>

      <form
        onSubmit={handleCreate}
        className="mt-4 flex flex-wrap items-end gap-3 rounded-lg bg-white p-4 shadow-sm dark:bg-slate-800"
      >
        <label className="text-sm text-slate-600 dark:text-slate-300">
          Name
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block rounded border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          />
        </label>
        <label className="text-sm text-slate-600 dark:text-slate-300">
          Farbe
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="mt-1 block h-9 w-14 rounded border border-slate-300 dark:border-slate-600"
          />
        </label>
        <button
          type="submit"
          disabled={createSubject.isPending}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Fach anlegen
        </button>
        {error && <p className="w-full text-sm text-red-600 dark:text-red-400">{error}</p>}
      </form>

      {isLoading ? (
        <p className="mt-6 text-slate-400 dark:text-slate-500">Lädt...</p>
      ) : subjects && subjects.length > 0 ? (
        <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {subjects.map((subject) => (
            <SubjectListItem key={subject.id} subject={subject} />
          ))}
        </ul>
      ) : (
        <p className="mt-6 text-slate-400 dark:text-slate-500">Noch keine Fächer angelegt.</p>
      )}
    </div>
  )
}

function SubjectListItem({ subject }: { subject: SubjectDto }) {
  const updateSubject = useUpdateSubject(subject.id)
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

  if (isEditing) {
    return (
      <li>
        <form
          onSubmit={handleSave}
          className="flex flex-wrap items-end gap-3 rounded-lg bg-white p-4 shadow-sm dark:bg-slate-800"
        >
          <label className="text-sm text-slate-600 dark:text-slate-300">
            Name
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block rounded border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>
          <label className="text-sm text-slate-600 dark:text-slate-300">
            Farbe
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="mt-1 block h-9 w-14 rounded border border-slate-300 dark:border-slate-600"
            />
          </label>
          <button
            type="submit"
            disabled={updateSubject.isPending}
            className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Speichern
          </button>
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="rounded border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-700"
          >
            Abbrechen
          </button>
          {error && <p className="w-full text-sm text-red-600 dark:text-red-400">{error}</p>}
        </form>
      </li>
    )
  }

  return (
    <li className="flex items-center gap-3 rounded-lg bg-white p-4 shadow-sm hover:shadow dark:bg-slate-800">
      <Link to={`/subjects/${subject.id}`} className="flex flex-1 items-center gap-3">
        <span
          className="h-4 w-4 flex-shrink-0 rounded-full"
          style={{ backgroundColor: subject.color }}
        />
        <span className="font-medium text-slate-800 dark:text-slate-100">{subject.name}</span>
        <span className="ml-auto text-xs text-slate-400 dark:text-slate-500">
          {subject.noteSectionTypes.length} Notizbereich(e)
        </span>
      </Link>
      <button
        onClick={startEditing}
        className="text-sm text-slate-400 hover:text-blue-600 dark:text-slate-500 dark:hover:text-blue-400"
      >
        Bearbeiten
      </button>
    </li>
  )
}
