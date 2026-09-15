import { Link } from 'react-router-dom'
import { useSubjects } from './hooks'

export function SubjectsPage() {
  const { data: subjects, isLoading } = useSubjects()

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">Fächer</h1>
        <Link
          to="/settings"
          className="text-sm text-blue-600 hover:underline dark:text-blue-400"
        >
          Fächer verwalten
        </Link>
      </div>

      {isLoading ? (
        <p className="mt-6 text-slate-400 dark:text-slate-500">Lädt...</p>
      ) : subjects && subjects.length > 0 ? (
        <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {subjects.map((subject) => (
            <li key={subject.id}>
              <Link
                to={`/subjects/${subject.id}`}
                className="flex items-center gap-3 rounded-lg bg-white p-4 shadow-sm hover:shadow dark:bg-slate-800"
              >
                <span
                  className="h-4 w-4 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: subject.color }}
                />
                <span className="font-medium text-slate-800 dark:text-slate-100">
                  {subject.name}
                </span>
                <span className="ml-auto text-xs text-slate-400 dark:text-slate-500">
                  {subject.noteSectionTypes.length} Notizbereich(e)
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-6 text-slate-400 dark:text-slate-500">
          Noch keine Fächer angelegt.{' '}
          <Link to="/settings" className="text-blue-600 hover:underline dark:text-blue-400">
            Jetzt anlegen
          </Link>
        </p>
      )}
    </div>
  )
}
