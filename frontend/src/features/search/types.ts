export type SearchResultType = 'subject' | 'heft' | 'homework' | 'calendarEvent' | 'generalNote'

export interface SearchResultDto {
  type: SearchResultType
  id: string
  title: string
  subtitle?: string
  url: string
}
