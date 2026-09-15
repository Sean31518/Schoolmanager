export interface TopicDto {
  id: string
  noteSectionTypeId: string
  name: string
  gradeLevels: number[]
  sortOrder: number
  notes?: { id: string }[]
}

export type NoteBlockType = 'TEXT' | 'PDF_PAGE' | 'VIDEO' | 'LINK'

export interface NoteBlockFileDto {
  id: string
  originalName: string
  mimeType: string
  size: number
}

export interface NoteBlockDto {
  id: string
  noteId: string
  type: NoteBlockType
  sortOrder: number
  contentJson: unknown | null
  fileId: string | null
  file: NoteBlockFileDto | null
  pageNumber: number | null
  url: string | null
  createdAt: string
  updatedAt: string
}

export interface NoteDto {
  id: string
  topicId: string
  title: string
  sortOrder: number
  createdAt: string
  updatedAt: string
  blocks: NoteBlockDto[]
}
