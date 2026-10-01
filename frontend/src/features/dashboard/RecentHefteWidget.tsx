import { Link } from 'react-router-dom'
import { formatRelativeTime } from '../../lib/relativeTime'
import { useHefte } from '../hefte/hooks'

const SHOWN = 4

/** The Hefte Goodnotes backed up most recently - i.e. the ones just written in. */
export function RecentHefteWidget() {
  const { data: hefte } = useHefte()
  const recent = [...(hefte ?? [])]
    .sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt))
    .slice(0, SHOWN)

  if (!hefte || hefte.length === 0) return null

  return (
    <div className="rounded-lg border border-border bg-bg-1">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="font-mono text-[10px] tracking-wider text-text-tertiary">ZULETZT GESCHRIEBEN</span>
        <Link to="/hefte" className="font-mono text-[10px] tracking-wider text-text-muted hover:text-text-secondary">
          ALLE HEFTE
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-2 p-2.5 sm:grid-cols-4">
        {recent.map((heft) => (
          <Link
            key={heft.id}
            to={`/hefte/${heft.id}`}
            className="flex min-w-0 flex-col gap-1.5 rounded-md border border-border-subtle px-2.5 py-2 hover:border-border"
          >
            <span className="flex items-center gap-1.5">
              <span
                className="h-[7px] w-[7px] shrink-0 rounded-[2px] bg-text-disabled"
                style={heft.subject ? { backgroundColor: heft.subject.color } : undefined}
              />
              <span className="min-w-0 flex-1 truncate font-mono text-[9px] tracking-wider text-text-tertiary">
                {(heft.subject?.name ?? 'Ohne Fach').toUpperCase()}
              </span>
            </span>
            <span className="truncate text-xs font-semibold leading-tight text-text-primary">{heft.name}</span>
            <span className="font-mono text-[9px] text-text-muted">{formatRelativeTime(heft.modifiedAt)}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
