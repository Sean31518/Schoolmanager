export interface TopicDto {
  id: string
  noteSectionTypeId: string
  name: string
  gradeLevel: number | null
  sortOrder: number
  notes?: { id: string }[]
}

export interface NoteDto {
  id: string
  topicId: string
  title: string
  contentJson: unknown
  sortOrder: number
  createdAt: string
  updatedAt: string
}
