import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiRequestError } from '../../lib/apiClient'
import { useCreateSectionType, useDeleteSectionType, useSubject } from './hooks'

export function SubjectDetailPage() {
  const { subjectId = '' } = useParams()
  const { data: subject, isLoading } = useSubject(subjectId)
  const createSectionType = useCreateSectionType(subjectId)
  const deleteSectionType = useDeleteSectionType(subjectId)
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await createSectionType.mutateAsync({ name })
      setName('')
    } catch (err) {
      setError(
        err instanceof ApiRequestError
          ? err.message
          : 'Notizbereich konnte nicht angelegt werden',
      )
    }
  }

  if (isLoading || !subject) {
    return <p className="text-slate-400">Lädt...</p>
  }

  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="h-4 w-4 rounded-full" style={{ backgroundColor: subject.color }} />
        <h1 className="text-2xl font-semibold text-slate-800">{subject.name}</h1>
      </div>

      <form
        onSubmit={handleCreate}
        className="mt-6 flex items-end gap-3 rounded-lg bg-white p-4 shadow-sm"
      >
        <label className="text-sm text-slate-600">
          Neuer Notizbereich (z.B. Regelheft, Vokabelheft)
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block rounded border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <button
          type="submit"
          disabled={createSectionType.isPending}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Anlegen
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>

      <ul className="mt-6 space-y-2">
        {subject.noteSectionTypes.map((sectionType) => (
          <li
            key={sectionType.id}
            className="flex items-center justify-between rounded-lg bg-white p-4 shadow-sm"
          >
            <Link
              to={`/subjects/${subjectId}/sections/${sectionType.id}`}
              className="font-medium text-slate-800 hover:text-blue-600"
            >
              {sectionType.name}
            </Link>
            <button
              onClick={() => void deleteSectionType.mutateAsync(sectionType.id)}
              className="text-sm text-slate-400 hover:text-red-600"
            >
              Löschen
            </button>
          </li>
        ))}
        {subject.noteSectionTypes.length === 0 && (
          <p className="text-slate-400">Noch keine Notizbereiche angelegt.</p>
        )}
      </ul>
    </div>
  )
}
