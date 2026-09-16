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
  const deleteSectionType = useDeleteSectionType(subjectId)

  if (isLoading || !subject) {
    return <p className="text-text-tertiary">Lädt...</p>
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            className="h-[9px] w-[9px] shrink-0 rounded-[2px]"
            style={{ backgroundColor: subject.color }}
          />
          <h1 className="text-[15px] font-semibold text-text-primary">{subject.name}</h1>
        </div>
        <CreateHeftButton
          subjectId={subjectId}
          onCreated={(sectionTypeId) =>
            navigate(`/subjects/${subjectId}/sections/${sectionTypeId}`)
          }
        />
      </div>

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

function CreateHeftButton({
  subjectId,
  onCreated,
}: {
  subjectId: string
  onCreated: (sectionTypeId: string) => void
}) {
  const createSectionType = useCreateSectionType(subjectId)
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      const sectionType = await createSectionType.mutateAsync({ name })
      setName('')
      setOpen(false)
      onCreated(sectionType.id)
    } catch (err) {
      setError(
        err instanceof ApiRequestError ? err.message : 'Heft konnte nicht angelegt werden',
      )
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Neues Heft"
        className="relative z-20 flex h-[30px] w-[30px] items-center justify-center rounded-md bg-accent text-accent-ink hover:bg-accent-hover"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-[15px] w-[15px]"
        >
          <path d="M5 12h14" />
          <path d="M12 5v14" />
        </svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-20 w-64 pt-1.5">
            <form
              onSubmit={(e) => void handleCreate(e)}
              className="flex flex-col gap-2 rounded-md border border-border bg-bg-2 p-3 shadow-lg"
            >
              <label className="text-xs text-text-secondary">
                Neues Heft
                <input
                  autoFocus
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="z.B. Regelheft, Vokabelheft"
                  className="mt-1 block w-full rounded-md border border-border bg-bg-muted px-2.5 py-1.5 text-sm text-text-primary placeholder:text-text-muted"
                />
              </label>
              <button
                type="submit"
                disabled={createSectionType.isPending}
                className="self-start rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-ink disabled:opacity-50"
              >
                Anlegen
              </button>
              {error && <p className="text-xs text-red-400">{error}</p>}
            </form>
          </div>
        </>
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
