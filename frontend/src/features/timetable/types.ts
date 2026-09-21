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

export type IservVertretungType = 'CANCELLED' | 'CHANGED' | 'NORMAL'

export interface IservOverlayEntryDto {
  weekday: string
  timeGridSlotId: string
  type: IservVertretungType
  subjectName: string | null
  room: string | null
  startTime: string | null
  endTime: string | null
  teacherName: string | null
  teacherAcronym: string | null
  courseName: string | null
}

export interface TimetableResponse {
  timeGridSlots: TimeGridSlotDto[]
  timetableSlots: TimetableSlotDto[]
  iservOverlay: IservOverlayEntryDto[]
  iservActive: boolean
}
