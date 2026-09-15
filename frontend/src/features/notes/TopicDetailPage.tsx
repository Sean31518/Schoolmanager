import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiRequestError } from '../../lib/apiClient'
import { useCreateNote, useDeleteNote, useNotes } from './hooks'

export function TopicDetailPage() {
  const { subjectId = '', sectionTypeId = '', topicId = '' } = useParams()
  const navigate = useNavigate()
  const { data: notes, isLoading } = useNotes(topicId)
  const createNote = useCreateNote(topicId)
  const deleteNote = useDeleteNote(topicId)
  const [title, setTitle] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      const note = await createNote.mutateAsync({ title })
      navigate(`/subjects/${subjectId}/sections/${sectionTypeId}/topics/${topicId}/notes/${note.id}`)
    } catch (err) {
      setError(
        err instanceof ApiRequestError ? err.message : 'Notiz konnte nicht angelegt werden',
      )
    }
  }

  return (
    <div>
      <Link
        to={`/subjects/${subjectId}/sections/${sectionTypeId}`}
        className="text-sm text-blue-600 hover:underline dark:text-blue-400"
      >
        ← Themen
      </Link>
      <h1 className="mt-1 text-2xl font-semibold text-slate-800 dark:text-slate-100">Notizen</h1>

      <form
        onSubmit={handleCreate}
        className="mt-4 flex items-end gap-3 rounded-lg bg-white p-4 shadow-sm dark:bg-slate-800"
      >
        <label className="text-sm text-slate-600 dark:text-slate-300">
          Neue Notiz (Titel)
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 block rounded border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          />
        </label>
        <button
          type="submit"
          disabled={createNote.isPending}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Anlegen
        </button>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      </form>

      {isLoading ? (
        <p className="mt-6 text-slate-400 dark:text-slate-500">Lädt...</p>
      ) : notes && notes.length > 0 ? (
        <ul className="mt-6 space-y-2">
          {notes.map((note) => (
            <li
              key={note.id}
              className="flex items-center justify-between rounded-lg bg-white p-4 shadow-sm hover:shadow dark:bg-slate-800"
            >
              <Link
                to={`/subjects/${subjectId}/sections/${sectionTypeId}/topics/${topicId}/notes/${note.id}`}
                className="font-medium text-slate-800 hover:text-blue-600 dark:text-slate-100 dark:hover:text-blue-400"
              >
                {note.title}
              </Link>
              <button
                onClick={() => void deleteNote.mutateAsync(note.id)}
                className="text-sm text-slate-400 hover:text-red-600 dark:text-slate-500 dark:hover:text-red-400"
              >
                Löschen
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-6 text-slate-400 dark:text-slate-500">Noch keine Notizen in diesem Thema.</p>
      )}
    </div>
  )
}
