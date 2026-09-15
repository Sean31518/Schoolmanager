import { Navigate, useParams } from 'react-router-dom'
import { useExamPrep } from './hooks'
import { ExamStudyPage } from './ExamStudyPage'

/** Once an exam has material, the study view is the default landing page;
 * editing the selection happens at /edit instead. With nothing selected yet
 * there's nothing to study, so go straight to the picker. */
export function ExamPage() {
  const { eventId = '' } = useParams()
  const { data, isLoading } = useExamPrep(eventId)

  if (isLoading) {
    return <p className="text-slate-400 dark:text-slate-500">Lädt...</p>
  }

  if (!data || data.items.length === 0) {
    return <Navigate to={`/exams/${eventId}/edit`} replace />
  }

  return <ExamStudyPage />
}
