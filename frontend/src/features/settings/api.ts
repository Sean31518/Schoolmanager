import { apiFetch } from '../../lib/apiClient'
import type { SettingsDto } from '../auth/types'

export function getSettings() {
  return apiFetch<SettingsDto>('/settings')
}

export function updateSettings(
  data: Partial<{
    currentGradeLevel: number
    currentSchoolYearLabel: string | null
    federalState: string
  }>,
) {
  return apiFetch<SettingsDto>('/settings', { method: 'PATCH', body: JSON.stringify(data) })
}
