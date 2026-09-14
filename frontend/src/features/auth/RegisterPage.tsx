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
      setError(
        err instanceof ApiRequestError ? err.message : 'Registrierung fehlgeschlagen',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-lg bg-white p-8 shadow"
      >
        <h1 className="mb-6 text-xl font-semibold text-slate-800">Konto erstellen</h1>

        {error && (
          <p className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <label className="mb-3 block text-sm text-slate-600">
          Name
          <input
            type="text"
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
          />
        </label>

        <label className="mb-3 block text-sm text-slate-600">
          E-Mail
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
          />
        </label>

        <label className="mb-6 block text-sm text-slate-600">
          Passwort (mind. 8 Zeichen)
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
          />
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded bg-blue-600 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {submitting ? 'Wird erstellt...' : 'Konto erstellen'}
        </button>

        <p className="mt-4 text-center text-sm text-slate-500">
          Bereits ein Konto?{' '}
          <Link to="/login" className="text-blue-600 hover:underline">
            Anmelden
          </Link>
        </p>
      </form>
    </div>
  )
}
