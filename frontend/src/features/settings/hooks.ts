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
      queryClient.invalidateQueries({ queryKey: ['timetable'] })
      await refreshMe()
    },
  })
}

export function useDisconnectIserv() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.disconnectIserv,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['timetable'] })
    },
  })
}

export function useSyncIservNow() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.syncIservNow,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['timetable'] })
    },
  })
}

export function useAppPasswords() {
  return useQuery({ queryKey: ['app-passwords'], queryFn: api.listAppPasswords })
}

export function useCreateAppPassword() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.createAppPassword,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['app-passwords'] }),
  })
}

export function useDeleteAppPassword() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.deleteAppPassword,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['app-passwords'] }),
  })
}
