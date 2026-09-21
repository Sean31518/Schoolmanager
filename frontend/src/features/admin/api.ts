import { apiFetch } from '../../lib/apiClient'
import type { AdminUserDto, AppSettingsDto } from './types'

export function listUsers() {
  return apiFetch<AdminUserDto[]>('/admin/users')
}

export function createUser(data: { email: string; password: string; displayName: string }) {
  return apiFetch<AdminUserDto>('/admin/users', { method: 'POST', body: JSON.stringify(data) })
}

export function deleteUser(userId: string) {
  return apiFetch<void>(`/admin/users/${userId}`, { method: 'DELETE' })
}

export function getAppSettings() {
  return apiFetch<AppSettingsDto>('/admin/settings')
}

export function updateAppSettings(registrationEnabled: boolean) {
  return apiFetch<AppSettingsDto>('/admin/settings', {
    method: 'PATCH',
    body: JSON.stringify({ registrationEnabled }),
  })
}
