import { apiFetch } from '../../lib/apiClient'
import type { NoteBlockDto, NoteBlockFileDto, NoteDto, SubjectNoteSummaryDto, TopicDto } from './types'

export function listSubjectNotes(subjectId: string) {
  return apiFetch<SubjectNoteSummaryDto[]>(`/subjects/${subjectId}/notes`)
}

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

export function createNote(topicId: string, data: { title: string }) {
  return apiFetch<NoteDto>(`/topics/${topicId}/notes`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateNote(noteId: string, data: Partial<{ title: string }>) {
  return apiFetch<NoteDto>(`/notes/${noteId}`, { method: 'PATCH', body: JSON.stringify(data) })
}

export function deleteNote(noteId: string) {
  return apiFetch<void>(`/notes/${noteId}`, { method: 'DELETE' })
}

export function uploadFile(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  return apiFetch<NoteBlockFileDto>('/uploads', { method: 'POST', body: formData })
}

export function createTextBlock(noteId: string, data: { contentJson?: unknown }) {
  return apiFetch<NoteBlockDto>(`/notes/${noteId}/blocks/text`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function createLinkBlock(noteId: string, data: { url: string }) {
  return apiFetch<NoteBlockDto>(`/notes/${noteId}/blocks/link`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function createVideoBlock(noteId: string, data: { fileId: string }) {
  return apiFetch<NoteBlockDto>(`/notes/${noteId}/blocks/video`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function createPdfBlocks(noteId: string, data: { fileId: string; pageCount: number }) {
  return apiFetch<NoteBlockDto[]>(`/notes/${noteId}/blocks/pdf`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateBlock(
  blockId: string,
  data: Partial<{ contentJson: unknown; url: string }>,
) {
  return apiFetch<NoteBlockDto>(`/blocks/${blockId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export function deleteBlock(blockId: string) {
  return apiFetch<void>(`/blocks/${blockId}`, { method: 'DELETE' })
}

export function reorderBlocks(noteId: string, orderedIds: string[]) {
  return apiFetch<NoteBlockDto[]>(`/notes/${noteId}/blocks/reorder`, {
    method: 'PATCH',
    body: JSON.stringify({ orderedIds }),
  })
}
