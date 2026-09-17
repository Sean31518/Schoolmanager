import { useQuery } from '@tanstack/react-query'
import { useDebouncedValue } from '../../lib/useDebouncedValue'
import { searchAll } from './api'

export function useGlobalSearch(query: string) {
  const debounced = useDebouncedValue(query.trim(), 200)
  return useQuery({
    queryKey: ['search', debounced],
    queryFn: () => searchAll(debounced),
    enabled: debounced.length >= 2,
  })
}
