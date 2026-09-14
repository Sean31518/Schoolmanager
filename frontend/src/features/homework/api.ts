import { apiFetch } from '../../lib/apiClient'
import type { HomeworkDto } from './types'

export function createHomework(data: {
  title: string
  subjectId?: string | null
  dueDate?: string | null
}) {
  return apiFetch<HomeworkDto>('/homework', { method: 'POST', body: JSON.stringify(data) })
}

export function updateHomework(id: string, data: Partial<{ done: boolean; title: string }>) {
  return apiFetch<HomeworkDto>(`/homework/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export function deleteHomework(id: string) {
  return apiFetch<void>(`/homework/${id}`, { method: 'DELETE' })
}
