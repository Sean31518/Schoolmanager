import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiRequestError } from '../../lib/apiClient'
import { useAuth } from './AuthContext'

export function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await register(email, password, displayName)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Registrierung fehlgeschlagen')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-0 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-accent font-mono text-sm font-semibold text-accent-ink">
            S
          </span>
          <span className="text-[15px] font-semibold text-text-primary">Schulmanager</span>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-border bg-bg-1 p-6 shadow-lg"
        >
          <h1 className="mb-5 text-[15px] font-semibold text-text-primary">Konto erstellen</h1>

          {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

          <label className="mb-3 block text-sm text-text-secondary">
            Name
            <input
              autoFocus
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="mt-1 block w-full rounded-md border border-border bg-bg-muted px-3 py-2 text-sm text-text-primary"
            />
          </label>

          <label className="mb-3 block text-sm text-text-secondary">
            E-Mail
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-md border border-border bg-bg-muted px-3 py-2 text-sm text-text-primary"
            />
          </label>

          <label className="mb-5 block text-sm text-text-secondary">
            Passwort (mind. 8 Zeichen)
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border border-border bg-bg-muted px-3 py-2 text-sm text-text-primary"
            />
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-accent py-2 text-sm font-semibold text-accent-ink disabled:opacity-50"
          >
            {submitting ? 'Wird erstellt...' : 'Konto erstellen'}
          </button>

          <p className="mt-4 text-center text-sm text-text-secondary">
            Bereits ein Konto?{' '}
            <Link to="/login" className="text-accent-text hover:underline">
              Anmelden
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
