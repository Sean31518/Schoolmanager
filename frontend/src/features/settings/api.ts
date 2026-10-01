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
    davVersionsToKeep: number
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

export interface AppPasswordDto {
  id: string
  label: string
  createdAt: string
  lastUsedAt: string | null
}

export function listAppPasswords() {
  return apiFetch<{ davUrl: string | null; passwords: AppPasswordDto[] }>('/app-passwords')
}

/** The returned password is shown exactly once - only its hash is stored. */
export function createAppPassword(label: string) {
  return apiFetch<AppPasswordDto & { password: string }>('/app-passwords', {
    method: 'POST',
    body: JSON.stringify({ label }),
  })
}

export function deleteAppPassword(id: string) {
  return apiFetch<void>(`/app-passwords/${id}`, { method: 'DELETE' })
}
