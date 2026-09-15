import { apiFetch } from '../../lib/apiClient'
import type { ExamPrepCandidateDto, ExamPrepItemDto, SaveExamPrepItem } from './types'

export function getExamPrep(eventId: string) {
  return apiFetch<{ items: ExamPrepItemDto[] }>(`/calendar-events/${eventId}/exam-prep`)
}

export function saveExamPrep(eventId: string, items: SaveExamPrepItem[]) {
  return apiFetch<{ items: ExamPrepItemDto[] }>(`/calendar-events/${eventId}/exam-prep`, {
    method: 'PUT',
    body: JSON.stringify({ items }),
  })
}

export function getExamPrepCandidates(eventId: string, allSubjects: boolean) {
  const query = allSubjects ? '?allSubjects=true' : ''
  return apiFetch<ExamPrepCandidateDto[]>(
    `/calendar-events/${eventId}/exam-prep/candidates${query}`,
  )
}
