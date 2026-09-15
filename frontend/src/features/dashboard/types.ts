import type { GeneralNoteDto } from '../generalNotes/types'
import type { HomeworkDto } from '../homework/types'

export interface QuickLinkDto {
  subjectId: string
  subjectName: string
  color: string
  sectionTypeId: string
  sectionTypeName: string
  hasContent: boolean
}

export interface ReminderDto {
  kind: 'homework' | 'event'
  id: string
  title: string
  date: string
  subjectName: string | null
  subjectColor: string | null
}

export interface TimetableSlotSummaryDto {
  label: string
  startTime: string
  endTime: string
  subjectName: string
  subjectColor: string
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
  quickLinks: QuickLinkDto[]
  upcomingHomework: HomeworkDto[]
  generalNotes: GeneralNoteDto[]
  upcomingReminders: ReminderDto[]
  todayTimetable: TimetableSlotSummaryDto[]
  tomorrowTimetable: TimetableSlotSummaryDto[]
  recentlyViewedNotes: RecentlyViewedNoteDto[]
}
