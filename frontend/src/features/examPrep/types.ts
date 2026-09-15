export interface ExamPrepCandidateDto {
  noteId: string
  gradeLevel: number
  contentJson: unknown
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
