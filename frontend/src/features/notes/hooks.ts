import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from './api'

export function useTopics(sectionTypeId: string) {
  return useQuery({
    queryKey: ['topics', sectionTypeId],
    queryFn: () => api.listTopics(sectionTypeId),
    enabled: Boolean(sectionTypeId),
  })
}

export function useCreateTopic(sectionTypeId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; gradeLevels?: number[] }) =>
      api.createTopic(sectionTypeId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topics', sectionTypeId] })
      queryClient.invalidateQueries({ queryKey: ['section-type-notes', sectionTypeId] })
    },
  })
}

export function useUpdateTopic(sectionTypeId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      topicId,
      data,
    }: {
      topicId: string
      data: Parameters<typeof api.updateTopic>[1]
    }) => api.updateTopic(topicId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topics', sectionTypeId] })
      queryClient.invalidateQueries({ queryKey: ['section-type-notes', sectionTypeId] })
    },
  })
}

export function useDeleteTopic(sectionTypeId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (topicId: string) => api.deleteTopic(topicId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topics', sectionTypeId] })
      queryClient.invalidateQueries({ queryKey: ['section-type-notes', sectionTypeId] })
    },
  })
}

export function useSubjectNotes(subjectId: string) {
  return useQuery({
    queryKey: ['subject-notes', subjectId],
    queryFn: () => api.listSubjectNotes(subjectId),
    enabled: Boolean(subjectId),
  })
}

export function useSectionTypeNotes(sectionTypeId: string) {
  return useQuery({
    queryKey: ['section-type-notes', sectionTypeId],
    queryFn: () => api.listSectionTypeNotes(sectionTypeId),
    enabled: Boolean(sectionTypeId),
  })
}

export function useNotes(topicId: string) {
  return useQuery({
    queryKey: ['notes', topicId],
    queryFn: () => api.listNotes(topicId),
    enabled: Boolean(topicId),
  })
}

export function useNote(noteId: string) {
  return useQuery({
    queryKey: ['note', noteId],
    queryFn: () => api.getNote(noteId),
    enabled: Boolean(noteId),
  })
}

export function useCreateNoteInTopic() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ topicId, title }: { topicId: string; title: string }) =>
      api.createNote(topicId, { title }),
    onSuccess: (_note, vars) => {
      queryClient.invalidateQueries({ queryKey: ['notes', vars.topicId] })
      queryClient.invalidateQueries({ queryKey: ['subject-notes'] })
      queryClient.invalidateQueries({ queryKey: ['section-type-notes'] })
    },
  })
}

export function useUpdateNote(noteId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof api.updateNote>[1]) => api.updateNote(noteId, data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['note', noteId] })
      queryClient.invalidateQueries({ queryKey: ['notes', updated.topicId] })
      queryClient.invalidateQueries({ queryKey: ['subject-notes'] })
      queryClient.invalidateQueries({ queryKey: ['section-type-notes'] })
    },
  })
}

export function useDeleteNoteById() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (noteId: string) => api.deleteNote(noteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] })
      queryClient.invalidateQueries({ queryKey: ['subject-notes'] })
      queryClient.invalidateQueries({ queryKey: ['section-type-notes'] })
    },
  })
}

export function useUploadFile() {
  return useMutation({ mutationFn: (file: File) => api.uploadFile(file) })
}

function useInvalidateNote(noteId: string) {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: ['note', noteId] })
}

export function useCreateTextBlock(noteId: string) {
  const invalidate = useInvalidateNote(noteId)
  return useMutation({
    mutationFn: (data: { contentJson?: unknown }) => api.createTextBlock(noteId, data),
    onSuccess: invalidate,
  })
}

export function useCreateLinkBlock(noteId: string) {
  const invalidate = useInvalidateNote(noteId)
  return useMutation({
    mutationFn: (data: { url: string }) => api.createLinkBlock(noteId, data),
    onSuccess: invalidate,
  })
}

export function useCreateVideoBlock(noteId: string) {
  const invalidate = useInvalidateNote(noteId)
  return useMutation({
    mutationFn: (data: { fileId: string }) => api.createVideoBlock(noteId, data),
    onSuccess: invalidate,
  })
}

export function useCreateImageBlock(noteId: string) {
  const invalidate = useInvalidateNote(noteId)
  return useMutation({
    mutationFn: (data: { fileId: string }) => api.createImageBlock(noteId, data),
    onSuccess: invalidate,
  })
}

export function useCreatePdfBlocks(noteId: string) {
  const invalidate = useInvalidateNote(noteId)
  return useMutation({
    mutationFn: (data: { fileId: string; pageCount: number }) => api.createPdfBlocks(noteId, data),
    onSuccess: invalidate,
  })
}

export function useUpdateBlock(noteId: string) {
  const invalidate = useInvalidateNote(noteId)
  return useMutation({
    mutationFn: ({
      blockId,
      data,
    }: {
      blockId: string
      data: Parameters<typeof api.updateBlock>[1]
    }) => api.updateBlock(blockId, data),
    onSuccess: invalidate,
  })
}

export function useDeleteBlock(noteId: string) {
  const invalidate = useInvalidateNote(noteId)
  return useMutation({
    mutationFn: (blockId: string) => api.deleteBlock(blockId),
    onSuccess: invalidate,
  })
}

export function useReorderBlocks(noteId: string) {
  const invalidate = useInvalidateNote(noteId)
  return useMutation({
    mutationFn: (orderedIds: string[]) => api.reorderBlocks(noteId, orderedIds),
    onSuccess: invalidate,
  })
}
