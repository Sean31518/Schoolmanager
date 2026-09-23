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
  /** Local Subject this IServ-sourced lesson resolved to, if any - null with
   * rawSubjectCode set means IServ's subject isn't linked to a Subject yet. */
  subjectId: string | null
  subjectColor: string | null
  rawSubjectCode: string | null
  /** room/teacherName/teacherAcronym are the original/standard values; the
   * substitute* fields are only set when a substitution actually reports a
   * *different* room/teacher, so Raumwechsel/Lehrerwechsel can be shown as
   * "original durchgestrichen, Vertretung daneben" rather than one value
   * silently replacing the other. */
  room: string | null
  substituteRoom: string | null
  startTime: string | null
  endTime: string | null
  teacherName: string | null
  teacherAcronym: string | null
  substituteTeacherName: string | null
  substituteTeacherAcronym: string | null
  courseName: string | null
}

export interface TimetableResponse {
  timeGridSlots: TimeGridSlotDto[]
  timetableSlots: TimetableSlotDto[]
  iservOverlay: IservOverlayEntryDto[]
  iservActive: boolean
}
