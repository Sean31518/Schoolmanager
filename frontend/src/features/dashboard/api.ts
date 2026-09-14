import { apiFetch } from '../../lib/apiClient'
import type { DashboardDto } from './types'

export function getDashboard() {
  return apiFetch<DashboardDto>('/dashboard')
}
