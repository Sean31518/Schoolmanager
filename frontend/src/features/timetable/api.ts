import { apiFetch } from '../../lib/apiClient'
import type { TimeGridSlotDto, TimeGridSlotType, TimetableResponse } from './types'

export function listTimeGrid() {
  return apiFetch<TimeGridSlotDto[]>('/time-grid')
}

export function createTimeGridSlot(data: {
  label: string
  type: TimeGridSlotType
  startTime: string
  endTime: string
}) {
  return apiFetch<TimeGridSlotDto>('/time-grid', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function deleteTimeGridSlot(id: string) {
  return apiFetch<void>(`/time-grid/${id}`, { method: 'DELETE' })
}

export function reorderTimeGrid(orderedIds: string[]) {
  return apiFetch<TimeGridSlotDto[]>('/time-grid/reorder', {
    method: 'PATCH',
    body: JSON.stringify({ orderedIds }),
  })
}

export function getTimetable() {
  return apiFetch<TimetableResponse>('/timetable')
}

export function upsertTimetableSlot(
  weekday: string,
  timeGridSlotId: string,
  data: { subjectId: string | null },
) {
  return apiFetch(`/timetable/${weekday}/${timeGridSlotId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}
