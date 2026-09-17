import { apiFetch } from '../../lib/apiClient'
import type { SearchResultDto } from './types'

export function searchAll(query: string) {
  return apiFetch<SearchResultDto[]>(`/search?q=${encodeURIComponent(query)}`)
}
