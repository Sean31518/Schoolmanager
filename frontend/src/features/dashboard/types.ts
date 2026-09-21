import type { GeneralNoteDto } from '../generalNotes/types'
import type { HomeworkDto } from '../homework/types'

export interface ReminderDto {
  kind: 'homework' | 'event'
  id: string
  title: string
  date: string
  subjectName: string | null
  subjectColor: string | null
}

export interface TimetableSlotSummaryDto {
  type: 'LESSON' | 'BREAK'
  label: string
  startTime: string
  endTime: string
  subjectName: string | null
  subjectColor: string | null
  /** Set when an IServ-synced Vertretung applies to this exact date. */
  vertretung?: 'CANCELLED' | 'CHANGED'
  room?: string | null
  teacherName?: string | null
  courseName?: string | null
}

export interface RecentlyViewedNoteDto {
  id: string
  title: string
  lastViewedAt: string
  topicId: string
  topicName: string
  sectionTypeId: string
  sectionTypeName: string
  subjectId: string
  subjectName: string
  subjectColor: string
}

export interface DashboardDto {
  currentGradeLevel: number
  upcomingHomework: HomeworkDto[]
  generalNotes: GeneralNoteDto[]
  upcomingReminders: ReminderDto[]
  todayTimetable: TimetableSlotSummaryDto[]
  tomorrowTimetable: TimetableSlotSummaryDto[]
  todayLabel: string
  tomorrowLabel: string
  recentlyViewedNotes: RecentlyViewedNoteDto[]
}
