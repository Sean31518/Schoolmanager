export type SearchResultType = 'subject' | 'note' | 'homework' | 'calendarEvent' | 'generalNote'

export interface SearchResultDto {
  type: SearchResultType
  id: string
  title: string
  subtitle?: string
  url: string
}
