import type { ReminderDto } from './types'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function RemindersWidget({ items }: { items: ReminderDto[] }) {
  return (
    <div className="rounded-lg bg-white p-4 shadow-sm dark:bg-slate-800">
      <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
        Nächste Termine
      </h2>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-slate-400 dark:text-slate-500">Nichts Anstehendes.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {items.map((item) => (
            <li key={`${item.kind}-${item.id}`} className="flex items-center gap-2 text-sm">
              <span
                className="h-2 w-2 flex-shrink-0 rounded-full"
                style={{ backgroundColor: item.subjectColor ?? '#94a3b8' }}
              />
              <span className="flex-1 truncate text-slate-700 dark:text-slate-200">
                {item.title}
              </span>
              <span className="flex-shrink-0 text-xs text-slate-400 dark:text-slate-500">
                {formatDate(item.date)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
