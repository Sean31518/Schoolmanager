import { apiFetch } from '../../lib/apiClient'
import type { CalendarEventDto, CalendarEventType, ImportHolidaysResult } from './types'

export function listCalendarEvents(params: { from: string; to: string }) {
  const query = new URLSearchParams(params)
  return apiFetch<CalendarEventDto[]>(`/calendar-events?${query.toString()}`)
}

export function createCalendarEvent(data: {
  title: string
  type: Extract<CalendarEventType, 'MANUAL' | 'EXAM'>
  startDate: string
  endDate?: string | null
  subjectId?: string | null
  note?: string | null
}) {
  return apiFetch<CalendarEventDto>('/calendar-events', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function deleteCalendarEvent(id: string) {
  return apiFetch<void>(`/calendar-events/${id}`, { method: 'DELETE' })
}

export function importHolidays(data: { year: number; federalState?: string }) {
  return apiFetch<ImportHolidaysResult>('/calendar-events/import-holidays', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}
