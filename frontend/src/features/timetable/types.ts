export type TimeGridSlotType = 'LESSON' | 'BREAK'

export interface TimeGridSlotDto {
  id: string
  userId: string
  label: string
  type: TimeGridSlotType
  startTime: string
  endTime: string
  sortOrder: number
}

export interface TimetableSlotDto {
  id: string
  userId: string
  weekday: string
  timeGridSlotId: string
  subjectId: string | null
  room: string | null
  note: string | null
  subject: { id: string; name: string; color: string } | null
}

export interface TimetableResponse {
  timeGridSlots: TimeGridSlotDto[]
  timetableSlots: TimetableSlotDto[]
}
