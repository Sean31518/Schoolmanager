import { Link } from 'react-router-dom'
import { useSubjects } from './hooks'

export function SubjectsPage() {
  const { data: subjects, isLoading } = useSubjects()

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-[15px] font-semibold text-text-primary">Fächer</h1>
        <Link to="/settings" className="text-sm text-accent-text hover:underline">
          Fächer verwalten
        </Link>
      </div>

      {isLoading ? (
        <p className="text-text-tertiary">Lädt...</p>
      ) : subjects && subjects.length > 0 ? (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {subjects.map((subject) => (
            <li key={subject.id}>
              <Link
                to={`/subjects/${subject.id}`}
                className="flex items-center gap-3 rounded-lg border border-border bg-bg-1 p-4 hover:border-text-disabled"
              >
                <span
                  className="h-[9px] w-[9px] shrink-0 rounded-[2px]"
                  style={{ backgroundColor: subject.color }}
                />
                <span className="font-medium text-text-primary">{subject.name}</span>
                <span className="ml-auto font-mono text-[10px] text-text-tertiary">
                  {subject.noteSectionTypes.length} HEFT(E)
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-text-tertiary">
          Noch keine Fächer angelegt.{' '}
          <Link to="/settings" className="text-accent-text hover:underline">
            Jetzt anlegen
          </Link>
        </p>
      )}
    </div>
  )
}
