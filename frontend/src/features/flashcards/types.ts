import type { DocumentLinkDto } from '../hefte/types'

export interface DeckDto {
  id: string
  subjectId: string
  subject: { id: string; name: string; color: string }
  name: string
  sortOrder: number
  cardCount: number
  knownCount: number
}

export interface FlashcardDto {
  id: string
  deckId: string
  question: string
  answer: string
  state: 'NEW' | 'LEARNING' | 'KNOWN'
  sortOrder: number
  lastReviewedAt: string | null
  links: DocumentLinkDto[]
}

export interface DeckDetailDto extends Omit<DeckDto, 'cardCount' | 'knownCount'> {
  flashcards: FlashcardDto[]
}
