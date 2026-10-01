import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from './api'

export function useHefte(filter: api.HefteFilter = {}) {
  return useQuery({
    queryKey: ['hefte', filter.archived ?? 'active', filter.subjectId ?? 'all'],
    queryFn: () => api.listHefte(filter),
  })
}

export function useHeft(id: string | undefined) {
  return useQuery({
    queryKey: ['hefte', 'one', id],
    queryFn: () => api.getHeft(id!),
    enabled: Boolean(id),
  })
}

export function useSetHeftArchived() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, archived }: { id: string; archived: boolean }) =>
      api.setHeftArchived(id, archived),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['hefte'] }),
  })
}

export function useAssignFolderSubject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ folderPath, subjectId }: { folderPath: string; subjectId: string | null }) =>
      api.assignFolderSubject(folderPath, subjectId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['hefte'] }),
  })
}

/** Links live inside homework/events/notes/cards, so everything that shows
 * them is refetched after a confirmation. */
export function useConfirmLink() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.confirmLink,
    onSuccess: () => {
      for (const key of ['dashboard', 'calendar-events', 'decks', 'homework']) {
        void queryClient.invalidateQueries({ queryKey: [key] })
      }
    },
  })
}
