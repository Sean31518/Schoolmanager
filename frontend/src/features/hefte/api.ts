import { apiFetch } from '../../lib/apiClient'
import type { DocumentLinkDto, HeftDto } from './types'

export interface HefteFilter {
  archived?: 'active' | 'archived' | 'all'
  /** A subject id, or 'none' for "Ohne Fach". */
  subjectId?: string
}

export function listHefte(filter: HefteFilter = {}) {
  const params = new URLSearchParams()
  if (filter.archived) params.set('archived', filter.archived)
  if (filter.subjectId) params.set('subjectId', filter.subjectId)
  const query = params.toString()
  return apiFetch<HeftDto[]>(`/hefte${query ? `?${query}` : ''}`)
}

export function getHeft(id: string) {
  return apiFetch<HeftDto>(`/hefte/${id}`)
}

export function setHeftArchived(id: string, archived: boolean) {
  return apiFetch<HeftDto>(`/hefte/${id}`, { method: 'PATCH', body: JSON.stringify({ archived }) })
}

/** A PDF URL for pdf.js, carrying its own token valid for this Heft only. */
export function getHeftViewUrl(id: string) {
  return apiFetch<{ url: string }>(`/hefte/${id}/view-url`, { method: 'POST' })
}

export function assignFolderSubject(folderPath: string, subjectId: string | null) {
  return apiFetch<void>('/hefte/folders/subject', {
    method: 'PUT',
    body: JSON.stringify({ folderPath, subjectId }),
  })
}

export function confirmLink(id: string) {
  return apiFetch<DocumentLinkDto>(`/links/${id}/confirm`, { method: 'POST' })
}
