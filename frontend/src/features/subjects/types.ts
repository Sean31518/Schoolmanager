export interface NoteSectionTypeDto {
  id: string
  subjectId: string
  name: string
  sortOrder: number
}

export interface SubjectDto {
  id: string
  userId: string
  name: string
  color: string
  noteSectionTypes: NoteSectionTypeDto[]
}
