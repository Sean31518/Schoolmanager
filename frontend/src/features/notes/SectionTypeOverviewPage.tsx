import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useNotes } from './hooks'

export function SectionTypeOverviewPage() {
  const { subjectId = '', sectionTypeId = '' } = useParams()
  const navigate = useNavigate()
  const { data: notes, isLoading } = useNotes(sectionTypeId)
  const [newGrade, setNewGrade] = useState('')

  const existingGrades = [...new Set((notes ?? []).map((n) => n.gradeLevel))].sort(
    (a, b) => a - b,
  )

  function handleOpenGrade(e: FormEvent) {
    e.preventDefault()
    const grade = Number(newGrade)
    if (Number.isInteger(grade) && grade >= 1 && grade <= 13) {
      navigate(`/subjects/${subjectId}/sections/${sectionTypeId}/${grade}`)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">Klassenstufen</h1>

      {isLoading ? (
        <p className="mt-4 text-slate-400 dark:text-slate-500">Lädt...</p>
      ) : existingGrades.length > 0 ? (
        <ul className="mt-4 flex flex-wrap gap-2">
          {existingGrades.map((grade) => (
            <li key={grade}>
              <Link
                to={`/subjects/${subjectId}/sections/${sectionTypeId}/${grade}`}
                className="block rounded-lg bg-white px-4 py-2 shadow-sm hover:shadow dark:bg-slate-800 dark:text-slate-100"
              >
                Klasse {grade}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-slate-400 dark:text-slate-500">Noch keine Klassenstufe angelegt.</p>
      )}

      <form onSubmit={handleOpenGrade} className="mt-6 flex items-end gap-3">
        <label className="text-sm text-slate-600 dark:text-slate-300">
          Neue Klassenstufe
          <input
            type="number"
            min={1}
            max={13}
            required
            value={newGrade}
            onChange={(e) => setNewGrade(e.target.value)}
            className="mt-1 block w-24 rounded border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          />
        </label>
        <button
          type="submit"
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white"
        >
          Öffnen / Anlegen
        </button>
      </form>
    </div>
  )
}
