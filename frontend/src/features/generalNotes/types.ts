import type { DocumentLinkDto } from '../hefte/types'

export interface GeneralNoteDto {
  id: string
  title: string | null
  contentJson: unknown
  sortOrder: number
  links: DocumentLinkDto[]
}
