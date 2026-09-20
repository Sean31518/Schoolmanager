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
    iservHost: string | null
    iservUsername: string | null
    iservPassword: string
    iservClass: string | null
    iservActive: boolean
  }>,
) {
  return apiFetch<SettingsDto>('/settings', { method: 'PATCH', body: JSON.stringify(data) })
}

export function disconnectIserv() {
  return apiFetch<SettingsDto>('/settings/iserv', { method: 'DELETE' })
}

export function syncIservNow() {
  return apiFetch<SettingsDto>('/settings/iserv/sync', { method: 'POST' })
}
