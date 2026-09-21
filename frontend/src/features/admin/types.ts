export interface AdminUserDto {
  id: string
  email: string
  displayName: string
  role: 'ADMIN' | 'USER'
  createdAt: string
  lastSeenAt: string | null
}

export interface AppSettingsDto {
  id: string
  registrationEnabled: boolean
}
