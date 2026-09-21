import { useState } from 'react'
import { AddButton } from '../../components/AddButton'
import { CreateUserModal } from '../../components/CreateUserModal'
import { EditUserModal } from '../../components/EditUserModal'
import { ToggleSwitch } from '../../components/ToggleSwitch'
import { ApiRequestError } from '../../lib/apiClient'
import { useAuth } from '../auth/AuthContext'
import type { AdminUserDto } from './types'
import { useAdminUsers, useAppSettings, useDeleteUser, useUpdateAppSettings } from './hooks'

function formatLastSeen(lastSeenAt: string | null) {
  if (!lastSeenAt) return 'noch nie'
  return new Date(lastSeenAt).toLocaleString('de-DE')
}

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** exponent
  return `${exponent === 0 ? value : value.toFixed(1)} ${units[exponent]}`
}

export function AdminSettings() {
  const { user: currentUser } = useAuth()
  const { data: users, isLoading } = useAdminUsers()
  const { data: appSettings } = useAppSettings()
  const updateAppSettings = useUpdateAppSettings()
  const deleteUser = useDeleteUser()
  const [showCreate, setShowCreate] = useState(false)
  const [editingUser, setEditingUser] = useState<AdminUserDto | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleToggleRegistration() {
    if (!appSettings) return
    setError(null)
    try {
      await updateAppSettings.mutateAsync(!appSettings.registrationEnabled)
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Konnte nicht umgeschaltet werden.')
    }
  }

  function handleDelete(userId: string, email: string) {
    if (confirm(`Konto "${email}" inklusive aller Daten unwiderruflich löschen?`)) {
      setError(null)
      deleteUser.mutateAsync(userId).catch((err) => {
        setError(err instanceof ApiRequestError ? err.message : 'Konto konnte nicht gelöscht werden.')
      })
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <ToggleSwitch
          checked={appSettings?.registrationEnabled ?? false}
          onClick={() => void handleToggleRegistration()}
          disabled={!appSettings || updateAppSettings.isPending}
        />
        <div>
          <p className="text-sm text-text-primary">Registrierung erlaubt</p>
          <p className="text-xs text-text-secondary">
            Wenn aus, kann sich niemand Neues mehr selbst registrieren. Du kannst trotzdem jederzeit
            Konten hier anlegen.
          </p>
        </div>
      </div>

      <div className="border-t border-border-subtle pt-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-text-secondary">
            {users ? `${users.length} ${users.length === 1 ? 'Konto' : 'Konten'}` : 'Lädt...'}
          </p>
          <AddButton onClick={() => setShowCreate(true)} label="Konto anlegen" />
        </div>

        {isLoading ? (
          <p className="mt-4 text-text-tertiary">Lädt...</p>
        ) : users && users.length > 0 ? (
          <ul className="mt-4 divide-y divide-border-subtle rounded-md border border-border">
            {users.map((u) => (
              <li key={u.id} className="flex items-center gap-3 px-3 py-2.5 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-text-primary">
                    {u.displayName}{' '}
                    <span className="font-normal text-text-tertiary">({u.email})</span>
                    {u.role === 'ADMIN' && (
                      <span className="ml-1.5 rounded-[3px] bg-accent/20 px-[5px] py-px font-mono text-[9px] font-semibold tracking-wider text-accent-text">
                        ADMIN
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-text-tertiary">
                    Zuletzt online: {formatLastSeen(u.lastSeenAt)} · {formatBytes(u.storageBytes)}
                  </p>
                </div>
                {u.id !== currentUser?.id && (
                  <div className="flex shrink-0 items-center gap-3">
                    <button
                      onClick={() => setEditingUser(u)}
                      className="text-text-muted hover:text-text-primary"
                    >
                      Bearbeiten
                    </button>
                    <button
                      onClick={() => handleDelete(u.id, u.email)}
                      className="text-text-muted hover:text-red-400"
                    >
                      Löschen
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {showCreate && <CreateUserModal onClose={() => setShowCreate(false)} />}
      {editingUser && (
        <EditUserModal user={editingUser} onClose={() => setEditingUser(null)} />
      )}
    </div>
  )
}
