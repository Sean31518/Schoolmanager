import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSubjects } from '../subjects/hooks'
import { useAssignFolderSubject, useHefte, useSetHeftArchived } from './hooks'
import type { HeftDto } from './types'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

export function HeftePage() {
  const [showArchived, setShowArchived] = useState(false)
  const { data: hefte, isLoading } = useHefte({ archived: showArchived ? 'archived' : 'active' })

  const { bySubject, unassignedByFolder } = useMemo(() => {
    const bySubject = new Map<string, { name: string; color: string; hefte: HeftDto[] }>()
    const unassignedByFolder = new Map<string, HeftDto[]>()
    for (const heft of hefte ?? []) {
      if (heft.subject) {
        if (!bySubject.has(heft.subject.id)) bySubject.set(heft.subject.id, { ...heft.subject, hefte: [] })
        bySubject.get(heft.subject.id)!.hefte.push(heft)
      } else {
        if (!unassignedByFolder.has(heft.folderPath)) unassignedByFolder.set(heft.folderPath, [])
        unassignedByFolder.get(heft.folderPath)!.push(heft)
      }
    }
    return {
      bySubject: [...bySubject.values()].sort((a, b) => a.name.localeCompare(b.name, 'de')),
      unassignedByFolder: [...unassignedByFolder.entries()].sort(([a], [b]) => a.localeCompare(b, 'de')),
    }
  }, [hefte])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[15px] font-semibold text-text-primary">Hefte</h1>
        <div className="flex rounded-md border border-border p-0.5 text-xs">
          {[false, true].map((archived) => (
            <button
              key={String(archived)}
              type="button"
              onClick={() => setShowArchived(archived)}
              className={`rounded px-2.5 py-1 ${
                showArchived === archived ? 'bg-bg-hover font-medium text-text-primary' : 'text-text-tertiary hover:text-text-secondary'
              }`}
            >
              {archived ? 'Archiv' : 'Aktuell'}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <p className="text-text-tertiary">Lädt...</p>}
      {!isLoading && (hefte ?? []).length === 0 && (
        <p className="text-text-tertiary">
          {showArchived ? (
            'Keine archivierten Hefte.'
          ) : (
            <>
              Noch keine Hefte. Goodnotes sichert sie hierher, sobald das Auto-Backup eingerichtet ist{' '}
              <Link to="/settings" className="text-accent-text hover:underline">
                (Einstellungen → Goodnotes)
              </Link>
              .
            </>
          )}
        </p>
      )}

      {bySubject.map((group) => (
        <section key={group.name}>
          <h2 className="flex items-center gap-2 text-[13px] font-semibold text-text-primary">
            <span className="h-[9px] w-[9px] rounded-[2px]" style={{ backgroundColor: group.color }} />
            {group.name}
          </h2>
          <HeftList hefte={group.hefte} />
        </section>
      ))}

      {unassignedByFolder.length > 0 && (
        <section>
          <h2 className="text-[13px] font-semibold text-text-primary">Ohne Fach</h2>
          <p className="mt-1 text-xs text-text-tertiary">
            Kein Ordner und kein Heftname passt zu einem Fach. Weise einem Ordner ein Fach zu - das gilt dann für
            alles darin, auch für später hinzukommende Hefte.
          </p>
          <div className="mt-3 space-y-4">
            {unassignedByFolder.map(([folderPath, folderHefte]) => (
              <div key={folderPath}>
                <FolderAssignRow folderPath={folderPath} />
                <HeftList hefte={folderHefte} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function FolderAssignRow({ folderPath }: { folderPath: string }) {
  const { data: subjects } = useSubjects()
  const assign = useAssignFolderSubject()
  // Every level of the path can take the assignment; the deepest is the
  // obvious default, an outer one covers more.
  const levels = folderPath.split('/').map((_, i, parts) => parts.slice(0, i + 1).join('/'))
  const [level, setLevel] = useState(folderPath)

  if (!folderPath) {
    return <p className="font-mono text-[11px] text-text-tertiary">/ (oberste Ebene - Heft umbenennen oder in einen Ordner legen)</p>
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={level}
        onChange={(e) => setLevel(e.target.value)}
        className="max-w-full rounded-md border border-border bg-bg-muted px-2 py-1 font-mono text-[11px] text-text-secondary"
      >
        {levels.map((l) => (
          <option key={l} value={l}>
            {l}
          </option>
        ))}
      </select>
      <select
        value=""
        disabled={assign.isPending}
        onChange={(e) => e.target.value && assign.mutate({ folderPath: level, subjectId: e.target.value })}
        className="rounded-md border border-border bg-bg-muted px-2 py-1 text-xs text-text-secondary"
      >
        <option value="">Fach zuweisen...</option>
        {(subjects ?? []).map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
    </div>
  )
}

function HeftList({ hefte }: { hefte: HeftDto[] }) {
  const setArchived = useSetHeftArchived()
  const assign = useAssignFolderSubject()

  return (
    <ul className="mt-2 divide-y divide-border-subtle rounded-lg border border-border bg-bg-1">
      {hefte.map((heft) => (
        <li key={heft.id} className="flex items-center gap-3 px-4 py-2.5">
          <Link to={`/hefte/${heft.id}`} className="min-w-0 flex-1">
            <span className="block truncate text-sm text-text-primary hover:underline">{heft.name}</span>
            <span className="block truncate font-mono text-[10px] text-text-muted">
              {heft.folderPath || '/'}
              {heft.subjectSource === 'manual' && ' · Fach von Hand zugewiesen'}
            </span>
          </Link>
          <span className="hidden shrink-0 font-mono text-[10px] text-text-tertiary sm:inline">
            {heft.processing ? 'wird verarbeitet' : `${heft.pageCount} S.`} · {formatDate(heft.modifiedAt)}
          </span>
          {heft.subjectSource === 'manual' && heft.subjectFolderPath && (
            <button
              type="button"
              onClick={() => assign.mutate({ folderPath: heft.subjectFolderPath!, subjectId: null })}
              title={`Zuweisung für ${heft.subjectFolderPath} aufheben`}
              className="shrink-0 text-xs text-text-muted hover:text-text-secondary"
            >
              Zuweisung aufheben
            </button>
          )}
          <button
            type="button"
            onClick={() => setArchived.mutate({ id: heft.id, archived: !heft.archived })}
            title={heft.archived ? 'Wiederherstellen' : 'Archivieren (z. B. wenn in Goodnotes gelöscht)'}
            className="shrink-0 text-xs text-text-muted hover:text-text-secondary"
          >
            {heft.archived ? 'Wiederherstellen' : 'Archivieren'}
          </button>
        </li>
      ))}
    </ul>
  )
}
