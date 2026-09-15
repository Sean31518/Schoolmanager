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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['topics', sectionTypeId] }),
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['topics', sectionTypeId] }),
  })
}

export function useDeleteTopic(sectionTypeId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (topicId: string) => api.deleteTopic(topicId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['topics', sectionTypeId] }),
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

export function useCreateNote(topicId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { title: string; contentJson?: unknown }) =>
      api.createNote(topicId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notes', topicId] }),
  })
}

export function useUpdateNote(noteId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof api.updateNote>[1]) => api.updateNote(noteId, data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['note', noteId] })
      queryClient.invalidateQueries({ queryKey: ['notes', updated.topicId] })
    },
  })
}

export function useDeleteNote(topicId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (noteId: string) => api.deleteNote(noteId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notes', topicId] }),
  })
}
