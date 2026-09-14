import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from './api'

export function useTimeGrid() {
  return useQuery({ queryKey: ['time-grid'], queryFn: api.listTimeGrid })
}

export function useCreateTimeGridSlot() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.createTimeGridSlot,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-grid'] })
      queryClient.invalidateQueries({ queryKey: ['timetable'] })
    },
  })
}

export function useDeleteTimeGridSlot() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.deleteTimeGridSlot,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-grid'] })
      queryClient.invalidateQueries({ queryKey: ['timetable'] })
    },
  })
}

export function useReorderTimeGrid() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.reorderTimeGrid,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['time-grid'] }),
  })
}

export function useTimetable() {
  return useQuery({ queryKey: ['timetable'], queryFn: api.getTimetable })
}

export function useSetTimetableCell() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      weekday,
      timeGridSlotId,
      subjectId,
    }: {
      weekday: string
      timeGridSlotId: string
      subjectId: string | null
    }) => api.upsertTimetableSlot(weekday, timeGridSlotId, { subjectId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['timetable'] }),
  })
}
