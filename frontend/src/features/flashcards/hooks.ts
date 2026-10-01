import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from './api'

export function useDecks(subjectId?: string) {
  return useQuery({
    queryKey: ['decks', 'list', subjectId ?? 'all'],
    queryFn: () => api.listDecks(subjectId),
  })
}

export function useDeck(deckId: string | undefined) {
  return useQuery({
    queryKey: ['decks', 'one', deckId],
    queryFn: () => api.getDeck(deckId!),
    enabled: Boolean(deckId),
  })
}

/** Every deck/card mutation refreshes all deck queries - counts shown on
 * lists depend on the cards inside. */
function useDeckMutation<TVars, TResult>(fn: (vars: TVars) => Promise<TResult>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['decks'] }),
  })
}

export const useCreateDeck = () =>
  useDeckMutation(({ subjectId, name }: { subjectId: string; name: string }) => api.createDeck(subjectId, name))
export const useUpdateDeck = () =>
  useDeckMutation(({ deckId, data }: { deckId: string; data: Parameters<typeof api.updateDeck>[1] }) =>
    api.updateDeck(deckId, data),
  )
export const useDeleteDeck = () => useDeckMutation(api.deleteDeck)
export const useCreateFlashcard = () =>
  useDeckMutation(({ deckId, data }: { deckId: string; data: Parameters<typeof api.createFlashcard>[1] }) =>
    api.createFlashcard(deckId, data),
  )
export const useUpdateFlashcard = () =>
  useDeckMutation(({ id, data }: { id: string; data: Parameters<typeof api.updateFlashcard>[1] }) =>
    api.updateFlashcard(id, data),
  )
export const useReviewFlashcard = () =>
  useDeckMutation(({ id, result }: { id: string; result: 'known' | 'again' }) => api.reviewFlashcard(id, result))
export const useDeleteFlashcard = () => useDeckMutation(api.deleteFlashcard)
