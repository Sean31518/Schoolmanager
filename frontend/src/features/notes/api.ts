import { ApiRequestError, apiFetch } from '../../lib/apiClient'
import type { NoteDto } from './types'

export function listNotes(sectionTypeId: string) {
  return apiFetch<NoteDto[]>(`/section-types/${sectionTypeId}/notes`)
}

export async function getNote(
  sectionTypeId: string,
  gradeLevel: number,
): Promise<NoteDto | null> {
  try {
    return await apiFetch<NoteDto>(`/section-types/${sectionTypeId}/notes/${gradeLevel}`)
  } catch (err) {
    if (err instanceof ApiRequestError && err.status === 404) {
      return null
    }
    throw err
  }
}

export function upsertNote(sectionTypeId: string, gradeLevel: number, contentJson: unknown) {
  return apiFetch<NoteDto>(`/section-types/${sectionTypeId}/notes/${gradeLevel}`, {
    method: 'PUT',
    body: JSON.stringify({ contentJson }),
  })
}
