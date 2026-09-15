import { useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from './api'

export function useCreateHomework() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.createHomework,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
  })
}

export function useUpdateHomework() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof api.updateHomework>[1] }) =>
      api.updateHomework(id, data),
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

export function useCreateSubtask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ homeworkId, title }: { homeworkId: string; title: string }) =>
      api.createSubtask(homeworkId, title),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
  })
}

export function useUpdateSubtask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      subtaskId,
      data,
    }: {
      subtaskId: string
      data: Parameters<typeof api.updateSubtask>[1]
    }) => api.updateSubtask(subtaskId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
  })
}

export function useDeleteSubtask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.deleteSubtask,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
  })
}
