export interface AdminUserDto {
  id: string
  email: string
  displayName: string
  role: 'ADMIN' | 'USER'
  createdAt: string
  lastSeenAt: string | null
  storageBytes: number
}

export interface UpdateUserInput {
  displayName?: string
  email?: string
  role?: 'ADMIN' | 'USER'
  password?: string
}

export interface AppSettingsDto {
  id: string
  registrationEnabled: boolean
}
