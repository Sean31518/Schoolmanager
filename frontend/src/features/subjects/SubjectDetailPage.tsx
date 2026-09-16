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
    return <p className="text-text-tertiary">Lädt...</p>
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <span
          className="h-[9px] w-[9px] shrink-0 rounded-[2px]"
          style={{ backgroundColor: subject.color }}
        />
        <h1 className="text-[15px] font-semibold text-text-primary">{subject.name}</h1>
      </div>

      <section className="rounded-lg border border-border bg-bg-1 p-4">
        <h2 className="text-[13px] font-semibold text-text-primary">Neues Heft</h2>
        <form onSubmit={handleCreate} className="mt-3 flex flex-wrap items-end gap-3">
          <label className="text-sm text-text-secondary">
            Bezeichnung (z.B. Regelheft, Vokabelheft)
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block rounded-md border border-border bg-bg-muted px-3 py-2 text-sm text-text-primary"
            />
          </label>
          <button
            type="submit"
            disabled={createSectionType.isPending}
            className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-ink disabled:opacity-50"
          >
            Anlegen
          </button>
          {error && <p className="text-sm text-red-400">{error}</p>}
        </form>
      </section>

      {subject.noteSectionTypes.length === 0 ? (
        <p className="text-text-tertiary">Noch keine Hefte angelegt.</p>
      ) : (
        <ul className="divide-y divide-border-subtle rounded-lg border border-border bg-bg-1">
          {subject.noteSectionTypes.map((sectionType) => (
            <SectionTypeRow
              key={sectionType.id}
              subjectId={subjectId}
              sectionType={sectionType}
              onDelete={() => void deleteSectionType.mutateAsync(sectionType.id)}
            />
          ))}
        </ul>
      )}
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
    <li className="flex items-center justify-between gap-3 px-4 py-3">
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
          className="rounded-md border border-border bg-bg-muted px-2 py-1 text-sm font-medium text-text-primary"
        />
      ) : (
        <Link
          to={`/subjects/${subjectId}/sections/${sectionType.id}`}
          className="text-sm font-medium text-text-primary hover:text-accent"
        >
          {sectionType.name}
        </Link>
      )}
      <div className="flex items-center gap-3 text-sm">
        <button type="button" onClick={startRenaming} className="text-accent hover:underline">
          Bearbeiten
        </button>
        <button onClick={onDelete} className="text-text-muted hover:text-red-400">
          Löschen
        </button>
      </div>
    </li>
  )
}
