export interface TopicDto {
  id: string
  noteSectionTypeId: string
  name: string
  gradeLevels: number[]
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
