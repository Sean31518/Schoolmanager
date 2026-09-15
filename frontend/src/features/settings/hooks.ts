import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../auth/AuthContext'
import * as api from './api'

export function useSettings() {
  return useQuery({ queryKey: ['settings'], queryFn: api.getSettings })
}

export function useUpdateSettings() {
  const queryClient = useQueryClient()
  const { refreshMe } = useAuth()
  return useMutation({
    mutationFn: api.updateSettings,
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      await refreshMe()
    },
  })
}
