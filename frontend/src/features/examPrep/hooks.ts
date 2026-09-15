import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from './api'
import type { SaveExamPrepItem } from './types'

export function useExamPrep(eventId: string) {
  return useQuery({
    queryKey: ['exam-prep', eventId],
    queryFn: () => api.getExamPrep(eventId),
    enabled: Boolean(eventId),
  })
}

export function useExamPrepCandidates(eventId: string, allSubjects: boolean) {
  return useQuery({
    queryKey: ['exam-prep-candidates', eventId, allSubjects],
    queryFn: () => api.getExamPrepCandidates(eventId, allSubjects),
    enabled: Boolean(eventId),
  })
}

export function useSaveExamPrep(eventId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (items: SaveExamPrepItem[]) => api.saveExamPrep(eventId, items),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['exam-prep', eventId] }),
  })
}
