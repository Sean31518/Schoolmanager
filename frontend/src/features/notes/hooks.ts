import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from './api'

export function useNotes(sectionTypeId: string) {
  return useQuery({
    queryKey: ['notes', sectionTypeId],
    queryFn: () => api.listNotes(sectionTypeId),
    enabled: Boolean(sectionTypeId),
  })
}

export function useNote(sectionTypeId: string, gradeLevel: number) {
  return useQuery({
    queryKey: ['notes', sectionTypeId, gradeLevel],
    queryFn: () => api.getNote(sectionTypeId, gradeLevel),
    enabled: Boolean(sectionTypeId) && Number.isInteger(gradeLevel),
  })
}

export function useSaveNote(sectionTypeId: string, gradeLevel: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (contentJson: unknown) => api.upsertNote(sectionTypeId, gradeLevel, contentJson),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', sectionTypeId] })
    },
  })
}
