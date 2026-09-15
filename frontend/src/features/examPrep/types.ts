import type { NoteBlockDto } from '../notes/types'

export interface ExamPrepCandidateDto {
  noteId: string
  title: string
  topicId: string
  topicName: string
  gradeLevels: number[]
  blocks: NoteBlockDto[]
  sectionTypeId: string
  sectionTypeName: string
  subjectId: string
  subjectName: string
  subjectColor: string
}

export interface ExamPrepItemDto extends ExamPrepCandidateDto {
  id: string
  sectionIndex: number
  sectionLabel: string
}

export interface SaveExamPrepItem {
  noteId: string
  sectionIndex: number
  sectionLabel: string
}
