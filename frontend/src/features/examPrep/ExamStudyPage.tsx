import type { JSONContent } from '@tiptap/react'
import { Link, useParams } from 'react-router-dom'
import { ReadOnlyContent } from '../notes/ReadOnlyContent'
import { useExamPrep } from './hooks'
import { extractSections, type NoteSection } from './sections'
import type { ExamPrepItemDto } from './types'

interface ResolvedItem {
  item: ExamPrepItemDto
  section: NoteSection
}

export function ExamStudyPage() {
  const { eventId = '' } = useParams()
  const { data, isLoading } = useExamPrep(eventId)

  if (isLoading || !data) {
    return <p className="text-slate-400 dark:text-slate-500">Lädt...</p>
  }

  const resolved: ResolvedItem[] = []
  for (const item of data.items) {
    const sections = extractSections(item.contentJson as JSONContent)
    const section = sections[item.sectionIndex]
    if (section) resolved.push({ item, section })
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          to={`/exams/${eventId}`}
          className="text-sm text-blue-600 hover:underline dark:text-blue-400"
        >
          ← Auswahl bearbeiten
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-slate-800 dark:text-slate-100">
          Lernansicht
        </h1>
      </div>

      {resolved.length === 0 ? (
        <p className="text-slate-400 dark:text-slate-500">
          Noch keine Inhalte ausgewählt.{' '}
          <Link
            to={`/exams/${eventId}`}
            className="text-blue-600 hover:underline dark:text-blue-400"
          >
            Jetzt auswählen
          </Link>
        </p>
      ) : (
        <div className="space-y-4">
          {resolved.map(({ item, section }) => (
            <div
              key={item.id}
              className="rounded-lg bg-white p-4 shadow-sm dark:bg-slate-800"
            >
              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <span
                  className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: item.subjectColor }}
                />
                {item.subjectName} · {item.sectionTypeName} · Klasse {item.gradeLevel}
              </div>
              <h2 className="mt-1 text-lg font-semibold text-slate-800 dark:text-slate-100">
                {section.label}
              </h2>
              <div className="mt-2">
                <ReadOnlyContent content={section.content} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
