import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiRequestError } from '../../lib/apiClient'
import {
  useCreateSectionType,
  useDeleteSectionType,
  useSubject,
  useUpdateSectionType,
} from './hooks'
import type { NoteSectionTypeDto } from './types'

export function SubjectDetailPage() {
  const { subjectId = '' } = useParams()
  const navigate = useNavigate()
  const { data: subject, isLoading } = useSubject(subjectId)
  const createSectionType = useCreateSectionType(subjectId)
  const deleteSectionType = useDeleteSectionType(subjectId)
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      const sectionType = await createSectionType.mutateAsync({ name })
      navigate(`/subjects/${subjectId}/sections/${sectionType.id}`)
    } catch (err) {
      setError(
        err instanceof ApiRequestError
          ? err.message
          : 'Notizbereich konnte nicht angelegt werden',
      )
    }
  }

  if (isLoading || !subject) {
    return <p className="text-slate-400 dark:text-slate-500">Lädt...</p>
  }

  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="h-4 w-4 rounded-full" style={{ backgroundColor: subject.color }} />
        <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">
          {subject.name}
        </h1>
      </div>

      <form
        onSubmit={handleCreate}
        className="mt-6 flex items-end gap-3 rounded-lg bg-white p-4 shadow-sm dark:bg-slate-800"
      >
        <label className="text-sm text-slate-600 dark:text-slate-300">
          Neuer Notizbereich (z.B. Regelheft, Vokabelheft)
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block rounded border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          />
        </label>
        <button
          type="submit"
          disabled={createSectionType.isPending}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Anlegen
        </button>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      </form>

      <ul className="mt-6 space-y-2">
        {subject.noteSectionTypes.map((sectionType) => (
          <SectionTypeRow
            key={sectionType.id}
            subjectId={subjectId}
            sectionType={sectionType}
            onDelete={() => void deleteSectionType.mutateAsync(sectionType.id)}
          />
        ))}
        {subject.noteSectionTypes.length === 0 && (
          <p className="text-slate-400 dark:text-slate-500">Noch keine Notizbereiche angelegt.</p>
        )}
      </ul>
    </div>
  )
}

function SectionTypeRow({
  subjectId,
  sectionType,
  onDelete,
}: {
  subjectId: string
  sectionType: NoteSectionTypeDto
  onDelete: () => void
}) {
  const updateSectionType = useUpdateSectionType(subjectId)
  const [isRenaming, setIsRenaming] = useState(false)
  const [nameDraft, setNameDraft] = useState(sectionType.name)

  function startRenaming() {
    setNameDraft(sectionType.name)
    setIsRenaming(true)
  }

  function commitRename() {
    const trimmed = nameDraft.trim()
    setIsRenaming(false)
    if (trimmed && trimmed !== sectionType.name) {
      void updateSectionType.mutateAsync({ sectionTypeId: sectionType.id, data: { name: trimmed } })
    } else {
      setNameDraft(sectionType.name)
    }
  }

  return (
    <li className="flex items-center justify-between rounded-lg bg-white p-4 shadow-sm dark:bg-slate-800">
      {isRenaming ? (
        <input
          autoFocus
          value={nameDraft}
          onChange={(e) => setNameDraft(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitRename()
            if (e.key === 'Escape') {
              setNameDraft(sectionType.name)
              setIsRenaming(false)
            }
          }}
          className="rounded border border-slate-300 bg-white px-2 py-1 font-medium text-slate-800 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
        />
      ) : (
        <Link
          to={`/subjects/${subjectId}/sections/${sectionType.id}`}
          className="font-medium text-slate-800 hover:text-blue-600 dark:text-slate-100 dark:hover:text-blue-400"
        >
          {sectionType.name}
        </Link>
      )}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={startRenaming}
          className="text-sm text-blue-600 hover:underline dark:text-blue-400"
        >
          Bearbeiten
        </button>
        <button
          onClick={onDelete}
          className="text-sm text-slate-400 hover:text-red-600 dark:text-slate-500 dark:hover:text-red-400"
        >
          Löschen
        </button>
      </div>
    </li>
  )
}
