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
    <div className="rounded-lg border border-border bg-bg-1">
      <div className="border-b border-border px-3 py-2 font-mono text-[10px] tracking-wider text-text-tertiary">
        NÄCHSTE TERMINE
      </div>
      {items.length === 0 ? (
        <p className="px-3 py-3 text-sm text-text-tertiary">Nichts Anstehendes.</p>
      ) : (
        <ul>
          {items.map((item) => (
            <li
              key={`${item.kind}-${item.id}`}
              className="flex items-center gap-2.5 border-b border-border-subtle px-3 py-2.5 text-sm last:border-b-0"
            >
              <span
                className="h-[22px] w-[3px] shrink-0 rounded-[2px]"
                style={{ backgroundColor: item.subjectColor ?? '#6f6d65' }}
              />
              <span className="flex-1 truncate text-text-primary">{item.title}</span>
              <span className="shrink-0 font-mono text-[10px] text-text-tertiary">
                {formatDate(item.date)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
