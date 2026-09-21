import { useState, type FormEvent } from 'react'
import { useUpdateUser } from '../features/admin/hooks'
import type { AdminUserDto } from '../features/admin/types'
import { ApiRequestError } from '../lib/apiClient'
import { ToggleSwitch } from './ToggleSwitch'

export function EditUserModal({
  user,
  onClose,
}: {
  user: AdminUserDto
  onClose: () => void
}) {
  const updateUser = useUpdateUser()
  const [displayName, setDisplayName] = useState(user.displayName)
  const [email, setEmail] = useState(user.email)
  const [role, setRole] = useState(user.role)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await updateUser.mutateAsync({
        userId: user.id,
        data: {
          ...(displayName !== user.displayName ? { displayName } : {}),
          ...(email !== user.email ? { email } : {}),
          ...(role !== user.role ? { role } : {}),
          ...(password.trim() ? { password: password.trim() } : {}),
        },
      })
      onClose()
    } catch (err) {
      setError(
        err instanceof ApiRequestError ? err.message : 'Konto konnte nicht aktualisiert werden',
      )
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <form
        onSubmit={(e) => void handleSave(e)}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-lg border border-border bg-bg-1 p-5 shadow-lg"
      >
        <h2 className="text-[15px] font-semibold text-text-primary">Konto bearbeiten</h2>

        <label className="mt-3 block text-sm text-text-secondary">
          Name
          <input
            autoFocus
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="mt-1 block w-full rounded-md border border-border bg-bg-muted px-3 py-2 text-sm text-text-primary"
          />
        </label>

        <label className="mt-3 block text-sm text-text-secondary">
          E-Mail
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full rounded-md border border-border bg-bg-muted px-3 py-2 text-sm text-text-primary"
          />
        </label>

        <label className="mt-3 block text-sm text-text-secondary">
          Neues Passwort (optional)
          <input
            type="password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="leer lassen, um es nicht zu ändern"
            className="mt-1 block w-full rounded-md border border-border bg-bg-muted px-3 py-2 text-sm text-text-primary placeholder:text-text-muted"
          />
        </label>

        <div className="mt-4 flex items-center gap-3">
          <ToggleSwitch
            checked={role === 'ADMIN'}
            onClick={() => setRole(role === 'ADMIN' ? 'USER' : 'ADMIN')}
          />
          <p className="text-sm text-text-primary">Admin-Rechte</p>
        </div>

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

        <div className="mt-5 flex items-center gap-3">
          <button
            type="submit"
            disabled={updateUser.isPending}
            className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-ink disabled:opacity-50"
          >
            Speichern
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border px-4 py-2 text-sm text-text-secondary hover:bg-bg-hover"
          >
            Abbrechen
          </button>
        </div>
      </form>
    </div>
  )
}
