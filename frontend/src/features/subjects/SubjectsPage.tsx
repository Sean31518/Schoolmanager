import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ApiRequestError } from '../../lib/apiClient'
import { useCreateSubject, useSubjects } from './hooks'

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
      <h1 className="text-2xl font-semibold text-slate-800">Fächer</h1>

      <form
        onSubmit={handleCreate}
        className="mt-4 flex flex-wrap items-end gap-3 rounded-lg bg-white p-4 shadow-sm"
      >
        <label className="text-sm text-slate-600">
          Name
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block rounded border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm text-slate-600">
          Farbe
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="mt-1 block h-9 w-14 rounded border border-slate-300"
          />
        </label>
        <button
          type="submit"
          disabled={createSubject.isPending}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Fach anlegen
        </button>
        {error && <p className="w-full text-sm text-red-600">{error}</p>}
      </form>

      {isLoading ? (
        <p className="mt-6 text-slate-400">Lädt...</p>
      ) : subjects && subjects.length > 0 ? (
        <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {subjects.map((subject) => (
            <li key={subject.id}>
              <Link
                to={`/subjects/${subject.id}`}
                className="flex items-center gap-3 rounded-lg bg-white p-4 shadow-sm hover:shadow"
              >
                <span
                  className="h-4 w-4 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: subject.color }}
                />
                <span className="font-medium text-slate-800">{subject.name}</span>
                <span className="ml-auto text-xs text-slate-400">
                  {subject.noteSectionTypes.length} Notizbereich(e)
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-6 text-slate-400">Noch keine Fächer angelegt.</p>
      )}
    </div>
  )
}
