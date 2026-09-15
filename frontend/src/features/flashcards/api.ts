import { apiFetch } from '../../lib/apiClient'
import type { FlashcardDto } from './types'

export function listFlashcards(topicId: string) {
  return apiFetch<FlashcardDto[]>(`/topics/${topicId}/flashcards`)
}

export function createFlashcard(topicId: string, data: { question: string; answer: string }) {
  return apiFetch<FlashcardDto>(`/topics/${topicId}/flashcards`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateFlashcard(
  flashcardId: string,
  data: Partial<{ question: string; answer: string }>,
) {
  return apiFetch<FlashcardDto>(`/flashcards/${flashcardId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export function reviewFlashcard(flashcardId: string, result: 'known' | 'again') {
  return apiFetch<FlashcardDto>(`/flashcards/${flashcardId}/review`, {
    method: 'PATCH',
    body: JSON.stringify({ result }),
  })
}

export function deleteFlashcard(flashcardId: string) {
  return apiFetch<void>(`/flashcards/${flashcardId}`, { method: 'DELETE' })
}
