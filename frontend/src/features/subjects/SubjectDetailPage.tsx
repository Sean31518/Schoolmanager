import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CreateMenu } from '../../components/CreateMenu'
import { useDeleteSectionType, useSubject, useUpdateSectionType } from './hooks'
import type { NoteSectionTypeDto } from './types'

export function SubjectDetailPage() {
  const { subjectId = '' } = useParams()
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
        <CreateMenu subjectId={subjectId} />
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
