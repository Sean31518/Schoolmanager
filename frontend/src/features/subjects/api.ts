import { apiFetch } from '../../lib/apiClient'
import type { SubjectDto } from './types'

export function listSubjects() {
  return apiFetch<SubjectDto[]>('/subjects')
}

export function createSubject(data: { name: string; color: string; iservAlias?: string | null }) {
  return apiFetch<SubjectDto>('/subjects', { method: 'POST', body: JSON.stringify(data) })
}

export function getSubject(subjectId: string) {
  return apiFetch<SubjectDto>(`/subjects/${subjectId}`)
}

export function updateSubject(
  subjectId: string,
  data: Partial<{ name: string; color: string; iservAlias: string | null }>,
) {
  return apiFetch<SubjectDto>(`/subjects/${subjectId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export function deleteSubject(subjectId: string) {
  return apiFetch<void>(`/subjects/${subjectId}`, { method: 'DELETE' })
}
