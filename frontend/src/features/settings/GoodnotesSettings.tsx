import { useState, type FormEvent } from 'react'
import { formatRelativeTime } from '../../lib/relativeTime'
import { ApiRequestError } from '../../lib/apiClient'
import { useAuth } from '../auth/AuthContext'
import {
  useAppPasswords,
  useCreateAppPassword,
  useDeleteAppPassword,
  useSettings,
  useUpdateSettings,
} from './hooks'

function CopyValue({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <span className="flex min-w-0 items-center gap-2">
      <code className="min-w-0 truncate rounded bg-bg-muted px-1.5 py-0.5 font-mono text-xs text-text-primary">{value}</code>
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard?.writeText(value).then(() => {
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
          })
        }}
        className="shrink-0 text-xs text-accent-text hover:underline"
      >
        {copied ? 'Kopiert' : 'Kopieren'}
      </button>
    </span>
  )
}

/** Goodnotes Auto-Backup → WebDAV into Schulmanager: where to point it,
 * with which credentials, and how many PDF versions to keep. */
export function GoodnotesSettings() {
  const { user } = useAuth()
  const { data, isLoading } = useAppPasswords()
  const createPassword = useCreateAppPassword()
  const deletePassword = useDeleteAppPassword()
  const { data: settings } = useSettings()
  const updateSettings = useUpdateSettings()
  const [label, setLabel] = useState('iPad')
  const [created, setCreated] = useState<{ label: string; password: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      const result = await createPassword.mutateAsync(label.trim() || 'iPad')
      setCreated({ label: result.label, password: result.password })
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'App-Passwort konnte nicht erstellt werden')
    }
  }

  return (
    <div className="space-y-4 text-sm">
      <p className="text-text-secondary">
        Goodnotes sichert deine Hefte automatisch als PDF hierher. Ordner und Hefte, die so heißen wie ein Fach,
        landen direkt beim Fach.
      </p>

      <ol className="list-decimal space-y-1 pl-5 text-text-secondary">
        <li>Unten ein App-Passwort erstellen.</li>
        <li>
          In Goodnotes: Einstellungen → Backup → Auto-Backup → <strong>WebDAV</strong>.
        </li>
        <li>Server, Benutzername und App-Passwort eintragen.</li>
        <li>
          Als Format <strong>PDF</strong> wählen (das Goodnotes-Format wird hier nicht gespeichert).
        </li>
      </ol>

      <dl className="space-y-2 rounded-md border border-border p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <dt className="text-text-tertiary">Server</dt>
          <dd className="min-w-0">
            {data?.davUrl ? (
              <CopyValue value={data.davUrl} />
            ) : (
              <span className="text-xs text-text-muted">
                nicht konfiguriert (DAV_PUBLIC_URL) - die Adresse deines Reverse-Proxys für den WebDAV-Port
              </span>
            )}
          </dd>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <dt className="text-text-tertiary">Benutzername</dt>
          <dd className="min-w-0">{user?.email && <CopyValue value={user.email} />}</dd>
        </div>
      </dl>

      {created && (
        <div className="rounded-md border border-accent/40 bg-accent/10 p-3">
          <p className="text-text-primary">
            App-Passwort für <strong>{created.label}</strong> - wird nur jetzt angezeigt:
          </p>
          <div className="mt-2">
            <CopyValue value={created.password} />
          </div>
          <button type="button" onClick={() => setCreated(null)} className="mt-2 text-xs text-text-tertiary hover:underline">
            Ich habe es eingetragen
          </button>
        </div>
      )}

      <div>
        <h3 className="font-medium text-text-primary">App-Passwörter</h3>
        {isLoading ? (
          <p className="mt-1 text-text-tertiary">Lädt...</p>
        ) : (data?.passwords ?? []).length === 0 ? (
          <p className="mt-1 text-text-tertiary">Noch keins erstellt.</p>
        ) : (
          <ul className="mt-2 divide-y divide-border-subtle rounded-md border border-border">
            {data!.passwords.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-3 py-2">
                <span className="min-w-0 flex-1 truncate text-text-primary">{p.label}</span>
                <span className="shrink-0 text-xs text-text-tertiary">
                  {p.lastUsedAt ? `zuletzt benutzt ${formatRelativeTime(p.lastUsedAt).toLowerCase()}` : 'noch nie benutzt'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`App-Passwort "${p.label}" widerrufen? Goodnotes kann dann nicht mehr sichern, bis du ein neues einträgst.`)) {
                      deletePassword.mutate(p.id)
                    }
                  }}
                  className="shrink-0 text-xs text-text-muted hover:text-red-400"
                >
                  Widerrufen
                </button>
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={(e) => void handleCreate(e)} className="mt-2 flex gap-2">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Gerät, z. B. iPad"
            className="min-w-0 flex-1 rounded-md border border-border bg-bg-muted px-3 py-1.5 text-sm text-text-primary"
          />
          <button
            type="submit"
            disabled={createPassword.isPending}
            className="rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-accent-ink disabled:opacity-50"
          >
            Erstellen
          </button>
        </form>
        {error && <p className="mt-2 text-red-400">{error}</p>}
      </div>

      {settings && (
        <label className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-text-secondary">
            Ältere PDF-Versionen pro Heft behalten
            <span className="block text-xs text-text-tertiary">Zum Nachschauen, falls in Goodnotes etwas verloren geht.</span>
          </span>
          <select
            value={settings.davVersionsToKeep}
            onChange={(e) => updateSettings.mutate({ davVersionsToKeep: Number(e.target.value) })}
            className="rounded-md border border-border bg-bg-muted px-2 py-1 text-sm text-text-primary"
          >
            {[1, 2, 3, 5, 10].map((n) => (
              <option key={n} value={n}>
                {n === 1 ? 'nur aktuelle' : `${n} Versionen`}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  )
}
