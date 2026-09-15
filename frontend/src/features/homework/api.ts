import { apiFetch } from '../../lib/apiClient'
import type { HomeworkDto, HomeworkSubtaskDto } from './types'

export function createHomework(data: {
  title: string
  subjectId?: string | null
  dueDate?: string | null
}) {
  return apiFetch<HomeworkDto>('/homework', { method: 'POST', body: JSON.stringify(data) })
}

export function updateHomework(
  id: string,
  data: Partial<{
    done: boolean
    title: string
    subjectId: string | null
    dueDate: string | null
  }>,
) {
  return apiFetch<HomeworkDto>(`/homework/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export function deleteHomework(id: string) {
  return apiFetch<void>(`/homework/${id}`, { method: 'DELETE' })
}

export function createSubtask(homeworkId: string, title: string) {
  return apiFetch<HomeworkSubtaskDto>(`/homework/${homeworkId}/subtasks`, {
    method: 'POST',
    body: JSON.stringify({ title }),
  })
}

export function updateSubtask(
  subtaskId: string,
  data: Partial<{ title: string; done: boolean }>,
) {
  return apiFetch<HomeworkSubtaskDto>(`/homework/subtasks/${subtaskId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export function deleteSubtask(subtaskId: string) {
  return apiFetch<void>(`/homework/subtasks/${subtaskId}`, { method: 'DELETE' })
}
