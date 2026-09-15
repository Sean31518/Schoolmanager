export type CalendarEventType = 'MANUAL' | 'EXAM' | 'HOLIDAY' | 'PUBLIC_HOLIDAY'

export interface CalendarEventDto {
  id: string
  title: string
  type: CalendarEventType
  startDate: string
  endDate: string | null
  allDay: boolean
  subjectId: string | null
  subject: { id: string; name: string; color: string } | null
  color: string | null
  note: string | null
}

export interface ImportHolidaysResult {
  imported: number
  updated: number
  skipped: number
  errors: string[]
}
