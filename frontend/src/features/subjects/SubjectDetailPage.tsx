import { Link, useParams } from 'react-router-dom'
import { CreateMenu } from '../../components/CreateMenu'
import { SubjectDecks } from '../flashcards/SubjectDecks'
import { useHefte } from '../hefte/hooks'
import { useSubject } from './hooks'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

export function SubjectDetailPage() {
  const { subjectId = '' } = useParams()
  const { data: subject, isLoading } = useSubject(subjectId)
  const { data: hefte, isLoading: hefteLoading } = useHefte({ subjectId })

  if (isLoading || !subject) {
    return <p className="text-text-tertiary">Lädt...</p>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="h-[9px] w-[9px] shrink-0 rounded-[2px]" style={{ backgroundColor: subject.color }} />
          <h1 className="text-[15px] font-semibold text-text-primary">{subject.name}</h1>
        </div>
        <CreateMenu />
      </div>

      <section>
        <h2 className="text-[13px] font-semibold text-text-primary">Hefte</h2>
        {hefteLoading ? (
          <p className="mt-2 text-sm text-text-tertiary">Lädt...</p>
        ) : (hefte ?? []).length === 0 ? (
          <p className="mt-2 text-sm text-text-tertiary">
            Noch keine Hefte für {subject.name}. Hefte aus Goodnotes landen hier, wenn ein Ordner oder das Heft
            selbst so heißt wie das Fach - sonst unter{' '}
            <Link to="/hefte" className="text-accent-text hover:underline">
              Hefte → Ohne Fach
            </Link>
            .
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-border-subtle rounded-lg border border-border bg-bg-1">
            {(hefte ?? []).map((heft) => (
              <li key={heft.id}>
                <Link to={`/hefte/${heft.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-bg-hover/60">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-text-primary">{heft.name}</span>
                    <span className="block truncate font-mono text-[10px] text-text-muted">{heft.folderPath || '/'}</span>
                  </span>
                  <span className="shrink-0 font-mono text-[10px] text-text-tertiary">
                    {heft.pageCount} S. · {formatDate(heft.modifiedAt)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-[13px] font-semibold text-text-primary">Karteikarten</h2>
        <div className="mt-2">
          <SubjectDecks subjectId={subjectId} />
        </div>
      </section>
    </div>
  )
}
