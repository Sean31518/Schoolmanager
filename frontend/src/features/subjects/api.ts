import { apiFetch } from '../../lib/apiClient'
import type { NoteSectionTypeDto, SubjectDto } from './types'

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

export function createSectionType(subjectId: string, data: { name: string }) {
  return apiFetch<NoteSectionTypeDto>(`/subjects/${subjectId}/section-types`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateSectionType(sectionTypeId: string, data: { name: string }) {
  return apiFetch<NoteSectionTypeDto>(`/section-types/${sectionTypeId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export function deleteSectionType(sectionTypeId: string) {
  return apiFetch<void>(`/section-types/${sectionTypeId}`, { method: 'DELETE' })
}

export function reorderSectionTypes(subjectId: string, orderedIds: string[]) {
  return apiFetch<NoteSectionTypeDto[]>(`/subjects/${subjectId}/section-types/reorder`, {
    method: 'PATCH',
    body: JSON.stringify({ orderedIds }),
  })
}
