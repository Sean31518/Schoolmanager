import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from './api'

export function useFlashcards(topicId: string) {
  return useQuery({
    queryKey: ['flashcards', topicId],
    queryFn: () => api.listFlashcards(topicId),
    enabled: Boolean(topicId),
  })
}

export function useCreateFlashcard(topicId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { question: string; answer: string }) =>
      api.createFlashcard(topicId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['flashcards', topicId] }),
  })
}

export function useUpdateFlashcard(topicId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof api.updateFlashcard>[1] }) =>
      api.updateFlashcard(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['flashcards', topicId] }),
  })
}

export function useDeleteFlashcard(topicId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deleteFlashcard(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['flashcards', topicId] }),
  })
}

export function useReviewFlashcard(topicId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, result }: { id: string; result: 'known' | 'again' }) =>
      api.reviewFlashcard(id, result),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['flashcards', topicId] }),
  })
}

/** Fetches flashcards for several topics in parallel (a dynamic-length list,
 * so `useQueries` rather than calling `useFlashcards` in a loop) and reduces
 * them to a per-topic known/total count, used to derive study progress. */
export function useTopicsMastery(topicIds: string[]) {
  const results = useQueries({
    queries: topicIds.map((topicId) => ({
      queryKey: ['flashcards', topicId],
      queryFn: () => api.listFlashcards(topicId),
      enabled: Boolean(topicId),
    })),
  })

  const isLoading = results.some((r) => r.isLoading)
  const byTopic = new Map<string, { done: number; total: number }>()
  topicIds.forEach((topicId, i) => {
    const cards = results[i]?.data ?? []
    byTopic.set(topicId, { done: cards.filter((c) => c.state === 'KNOWN').length, total: cards.length })
  })

  return { isLoading, byTopic }
}
