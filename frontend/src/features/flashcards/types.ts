export type FlashcardState = 'NEW' | 'LEARNING' | 'KNOWN'

export interface FlashcardDto {
  id: string
  topicId: string
  question: string
  answer: string
  state: FlashcardState
  sortOrder: number
  lastReviewedAt: string | null
  createdAt: string
  updatedAt: string
}
