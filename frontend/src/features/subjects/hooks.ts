import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from './api'

export function useSubjects() {
  return useQuery({ queryKey: ['subjects'], queryFn: api.listSubjects })
}

export function useSubject(subjectId: string) {
  return useQuery({
    queryKey: ['subjects', subjectId],
    queryFn: () => api.getSubject(subjectId),
    enabled: Boolean(subjectId),
  })
}

export function useCreateSubject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.createSubject,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['subjects'] }),
  })
}

export function useUpdateSubject(subjectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof api.updateSubject>[1]) =>
      api.updateSubject(subjectId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['subjects'] }),
  })
}

export function useDeleteSubject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.deleteSubject,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['subjects'] }),
  })
}

export function useCreateSectionType(subjectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string }) => api.createSectionType(subjectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects', subjectId] })
      queryClient.invalidateQueries({ queryKey: ['subjects'] })
    },
  })
}

export function useUpdateSectionType(subjectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      sectionTypeId,
      data,
    }: {
      sectionTypeId: string
      data: Parameters<typeof api.updateSectionType>[1]
    }) => api.updateSectionType(sectionTypeId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects', subjectId] })
      queryClient.invalidateQueries({ queryKey: ['subjects'] })
    },
  })
}

export function useDeleteSectionType(subjectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (sectionTypeId: string) => api.deleteSectionType(sectionTypeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects', subjectId] })
      queryClient.invalidateQueries({ queryKey: ['subjects'] })
    },
  })
}
