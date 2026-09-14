import { useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from './api'

export function useCreateHomework() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.createHomework,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
  })
}

export function useToggleHomeworkDone() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) =>
      api.updateHomework(id, { done }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
  })
}

export function useDeleteHomework() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.deleteHomework,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
  })
}
