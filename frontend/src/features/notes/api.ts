import { apiFetch } from '../../lib/apiClient'
import type { NoteDto, TopicDto } from './types'

export function listTopics(sectionTypeId: string) {
  return apiFetch<TopicDto[]>(`/section-types/${sectionTypeId}/topics`)
}

export function createTopic(
  sectionTypeId: string,
  data: { name: string; gradeLevels?: number[] },
) {
  return apiFetch<TopicDto>(`/section-types/${sectionTypeId}/topics`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateTopic(
  topicId: string,
  data: Partial<{ name: string; gradeLevels: number[] }>,
) {
  return apiFetch<TopicDto>(`/topics/${topicId}`, { method: 'PATCH', body: JSON.stringify(data) })
}

export function deleteTopic(topicId: string) {
  return apiFetch<void>(`/topics/${topicId}`, { method: 'DELETE' })
}

export function listNotes(topicId: string) {
  return apiFetch<NoteDto[]>(`/topics/${topicId}/notes`)
}

export function getNote(noteId: string) {
  return apiFetch<NoteDto>(`/notes/${noteId}`)
}

export function createNote(topicId: string, data: { title: string; contentJson?: unknown }) {
  return apiFetch<NoteDto>(`/topics/${topicId}/notes`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateNote(
  noteId: string,
  data: Partial<{ title: string; contentJson: unknown }>,
) {
  return apiFetch<NoteDto>(`/notes/${noteId}`, { method: 'PATCH', body: JSON.stringify(data) })
}

export function deleteNote(noteId: string) {
  return apiFetch<void>(`/notes/${noteId}`, { method: 'DELETE' })
}
