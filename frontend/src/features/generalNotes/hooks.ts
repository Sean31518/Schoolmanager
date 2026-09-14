import { useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from './api'

export function useCreateGeneralNote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.createGeneralNote,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
  })
}

export function useUpdateGeneralNote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string
      data: Parameters<typeof api.updateGeneralNote>[1]
    }) => api.updateGeneralNote(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
  })
}

export function useDeleteGeneralNote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.deleteGeneralNote,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
  })
}
