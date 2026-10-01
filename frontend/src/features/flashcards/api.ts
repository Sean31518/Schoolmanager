import { apiFetch } from '../../lib/apiClient'
import type { LinkInput } from '../hefte/types'
import type { DeckDetailDto, DeckDto, FlashcardDto } from './types'

export function listDecks(subjectId?: string) {
  return apiFetch<DeckDto[]>(subjectId ? `/subjects/${subjectId}/decks` : '/decks')
}

export function createDeck(subjectId: string, name: string) {
  return apiFetch<DeckDto>(`/subjects/${subjectId}/decks`, {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
}

export function getDeck(deckId: string) {
  return apiFetch<DeckDetailDto>(`/decks/${deckId}`)
}

export function updateDeck(deckId: string, data: Partial<{ name: string; subjectId: string }>) {
  return apiFetch<DeckDto>(`/decks/${deckId}`, { method: 'PATCH', body: JSON.stringify(data) })
}

export function deleteDeck(deckId: string) {
  return apiFetch<void>(`/decks/${deckId}`, { method: 'DELETE' })
}

export function createFlashcard(
  deckId: string,
  data: { question: string; answer: string; links?: LinkInput[] },
) {
  return apiFetch<FlashcardDto>(`/decks/${deckId}/flashcards`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateFlashcard(
  id: string,
  data: Partial<{ question: string; answer: string; links: LinkInput[] }>,
) {
  return apiFetch<FlashcardDto>(`/flashcards/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
}

export function reviewFlashcard(id: string, result: 'known' | 'again') {
  return apiFetch<FlashcardDto>(`/flashcards/${id}/review`, {
    method: 'POST',
    body: JSON.stringify({ result }),
  })
}

export function deleteFlashcard(id: string) {
  return apiFetch<void>(`/flashcards/${id}`, { method: 'DELETE' })
}
