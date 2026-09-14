import { apiFetch } from '../../lib/apiClient'
import type { GeneralNoteDto } from './types'

export function createGeneralNote(data: { title?: string | null; contentJson: unknown }) {
  return apiFetch<GeneralNoteDto>('/general-notes', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateGeneralNote(
  id: string,
  data: Partial<{ title: string | null; contentJson: unknown }>,
) {
  return apiFetch<GeneralNoteDto>(`/general-notes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export function deleteGeneralNote(id: string) {
  return apiFetch<void>(`/general-notes/${id}`, { method: 'DELETE' })
}
