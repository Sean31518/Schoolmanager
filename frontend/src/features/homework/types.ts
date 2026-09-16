export interface HomeworkSubtaskDto {
  id: string
  homeworkId: string
  title: string
  done: boolean
  sortOrder: number
}

export interface LinkedNoteDto {
  id: string
  title: string
  topicId: string
  topicName: string
  sectionTypeId: string
  sectionTypeName: string
  subjectId: string
  subjectName: string
  subjectColor: string
}

export interface HomeworkDto {
  id: string
  title: string
  subjectId: string | null
  subject: { id: string; name: string; color: string } | null
  dueDate: string | null
  done: boolean
  note: string | null
  linkedNoteId: string | null
  linkedNote: LinkedNoteDto | null
  subtasks: HomeworkSubtaskDto[]
}
