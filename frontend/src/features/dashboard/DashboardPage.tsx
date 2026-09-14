import { useAuth } from '../auth/AuthContext'

export function DashboardPage() {
  const { user, settings, logout } = useAuth()

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-3xl rounded-lg bg-white p-8 shadow">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-800">
            Hallo, {user?.displayName}
          </h1>
          <button
            onClick={() => void logout()}
            className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
          >
            Abmelden
          </button>
        </div>
        <p className="mt-4 text-slate-500">
          Aktuelle Klassenstufe: {settings?.currentGradeLevel} · Bundesland:{' '}
          {settings?.federalState}
        </p>
      </div>
    </div>
  )
}
