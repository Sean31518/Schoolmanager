import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from './api'

export function useCalendarEvents(range: { from: string; to: string }) {
  return useQuery({
    queryKey: ['calendar-events', range.from, range.to],
    queryFn: () => api.listCalendarEvents(range),
  })
}

export function useCreateCalendarEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.createCalendarEvent,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['calendar-events'] }),
  })
}

export function useDeleteCalendarEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.deleteCalendarEvent,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['calendar-events'] }),
  })
}

export function useImportHolidays() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.importHolidays,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['calendar-events'] }),
  })
}
