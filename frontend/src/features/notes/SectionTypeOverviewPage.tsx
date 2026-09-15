import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiRequestError } from '../../lib/apiClient'
import { useAuth } from '../auth/AuthContext'
import { useCreateTopic, useDeleteTopic, useTopics, useUpdateTopic } from './hooks'
import type { TopicDto } from './types'

const GRADE_LEVELS = Array.from({ length: 13 }, (_, i) => i + 1)

export function SectionTypeOverviewPage() {
  const { subjectId = '', sectionTypeId = '' } = useParams()
  const { settings } = useAuth()
  const { data: topics, isLoading } = useTopics(sectionTypeId)
  const createTopic = useCreateTopic(sectionTypeId)
  const [name, setName] = useState('')
  const [gradeLevel, setGradeLevel] = useState(settings?.currentGradeLevel ?? 5)
  const [error, setError] = useState<string | null>(null)

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await createTopic.mutateAsync({ name, gradeLevel })
      setName('')
    } catch (err) {
      setError(
        err instanceof ApiRequestError ? err.message : 'Thema konnte nicht angelegt werden',
      )
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">Themen</h1>

      <form
        onSubmit={handleCreate}
        className="mt-4 flex flex-wrap items-end gap-3 rounded-lg bg-white p-4 shadow-sm dark:bg-slate-800"
      >
        <label className="text-sm text-slate-600 dark:text-slate-300">
          Neues Thema (z.B. Wellen)
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block rounded border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          />
        </label>
        <label className="text-sm text-slate-600 dark:text-slate-300">
          Klassenstufe
          <select
            value={gradeLevel}
            onChange={(e) => setGradeLevel(Number(e.target.value))}
            className="mt-1 block rounded border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          >
            {GRADE_LEVELS.map((level) => (
              <option key={level} value={level}>
                Klasse {level}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          disabled={createTopic.isPending}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Anlegen
        </button>
        {error && <p className="w-full text-sm text-red-600 dark:text-red-400">{error}</p>}
      </form>

      {isLoading ? (
        <p className="mt-6 text-slate-400 dark:text-slate-500">Lädt...</p>
      ) : topics && topics.length > 0 ? (
        <ul className="mt-6 space-y-2">
          {topics.map((topic) => (
            <TopicRow key={topic.id} subjectId={subjectId} sectionTypeId={sectionTypeId} topic={topic} />
          ))}
        </ul>
      ) : (
        <p className="mt-6 text-slate-400 dark:text-slate-500">Noch keine Themen angelegt.</p>
      )}
    </div>
  )
}

function TopicRow({
  subjectId,
  sectionTypeId,
  topic,
}: {
  subjectId: string
  sectionTypeId: string
  topic: TopicDto
}) {
  const updateTopic = useUpdateTopic(sectionTypeId)
  const deleteTopic = useDeleteTopic(sectionTypeId)
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState(topic.name)
  const [gradeLevel, setGradeLevel] = useState(topic.gradeLevel ?? '')
  const [error, setError] = useState<string | null>(null)

  function startEditing() {
    setName(topic.name)
    setGradeLevel(topic.gradeLevel ?? '')
    setError(null)
    setIsEditing(true)
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await updateTopic.mutateAsync({
        topicId: topic.id,
        data: { name, gradeLevel: gradeLevel === '' ? null : Number(gradeLevel) },
      })
      setIsEditing(false)
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Thema konnte nicht gespeichert werden')
    }
  }

  function handleDelete() {
    if (confirm(`Thema "${topic.name}" inklusive aller Notizen löschen?`)) {
      void deleteTopic.mutateAsync(topic.id)
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
            Klassenstufe
            <select
              value={gradeLevel}
              onChange={(e) => setGradeLevel(e.target.value === '' ? '' : Number(e.target.value))}
              className="mt-1 block rounded border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="">–</option>
              {GRADE_LEVELS.map((level) => (
                <option key={level} value={level}>
                  Klasse {level}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            disabled={updateTopic.isPending}
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
      <Link
        to={`/subjects/${subjectId}/sections/${sectionTypeId}/topics/${topic.id}`}
        className="flex flex-1 items-center gap-3"
      >
        <span className="font-medium text-slate-800 dark:text-slate-100">{topic.name}</span>
        <span className="ml-auto text-xs text-slate-400 dark:text-slate-500">
          {topic.gradeLevel ? `Klasse ${topic.gradeLevel} · ` : ''}
          {topic.notes?.length ?? 0} Notiz(en)
        </span>
      </Link>
      <button
        onClick={startEditing}
        className="text-sm text-slate-400 hover:text-blue-600 dark:text-slate-500 dark:hover:text-blue-400"
      >
        Bearbeiten
      </button>
      <button
        onClick={handleDelete}
        className="text-sm text-slate-400 hover:text-red-600 dark:text-slate-500 dark:hover:text-red-400"
      >
        Löschen
      </button>
    </li>
  )
}
