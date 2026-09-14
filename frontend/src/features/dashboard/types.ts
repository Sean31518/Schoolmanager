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

export interface CalendarEventDto {
  id: string
  title: string
  type: string
  startDate: string
  endDate: string | null
  allDay: boolean
}

export interface DashboardDto {
  currentGradeLevel: number
  quickLinks: QuickLinkDto[]
  upcomingHomework: HomeworkDto[]
  upcomingEvents: CalendarEventDto[]
  generalNotes: GeneralNoteDto[]
}
