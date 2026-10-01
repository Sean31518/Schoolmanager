import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CreateSubjectModal } from '../../components/CreateSubjectModal'
import { vertretungLabel } from '../../lib/vertretungLabel'
import { useHefte } from '../hefte/hooks'
import { useSyncIservNow } from '../settings/hooks'
import type { IservVertretungType } from './types'

export interface LessonDetailData {
  subjectName: string
  subjectColor: string | null
  dayLabel: string
  startTime: string | null
  endTime: string | null
  room: string | null
  substituteRoom?: string | null
  teacherName: string | null
  substituteTeacherName?: string | null
  courseName: string | null
  vertretung?: IservVertretungType
  /** Set (with subjectId null) when this lesson came from IServ but isn't
   * linked to a local Subject yet - lets the modal offer to create one. */
  subjectId?: string | null
  rawSubjectCode?: string | null
}

const FALLBACK_COLOR = '#71717a'

export function LessonDetailModal({
  lesson,
  onClose,
}: {
  lesson: LessonDetailData
  onClose: () => void
}) {
  const color = lesson.subjectColor ?? FALLBACK_COLOR
  const isCancelled = lesson.vertretung === 'CANCELLED'
  const isChanged = lesson.vertretung === 'CHANGED'
  const isUnlinked = !lesson.subjectId && Boolean(lesson.rawSubjectCode)
  const roomChanged = Boolean(lesson.substituteRoom)
  const teacherChanged = Boolean(lesson.substituteTeacherName)
  const label = vertretungLabel(isCancelled, roomChanged, teacherChanged)
  const [showCreate, setShowCreate] = useState(false)
  const syncNow = useSyncIservNow()

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-sm overflow-hidden rounded-lg border border-border bg-bg-1 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-1.5 shrink-0" style={{ backgroundColor: color }} />
        <div className="flex-1 p-4">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-base font-semibold text-text-primary">{lesson.subjectName}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Schließen"
              className="shrink-0 rounded-md p-1 text-text-tertiary hover:bg-bg-hover hover:text-text-primary"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                <path strokeLinecap="round" d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="mt-0.5 text-xs text-text-tertiary">{lesson.dayLabel}</p>

          {(isCancelled || isChanged) && (
            <div
              className={`mt-3 rounded-md px-3 py-2 text-sm font-medium ${
                isCancelled ? 'bg-red-400/15 text-red-400' : 'bg-accent/15 text-accent-text'
              }`}
            >
              {isCancelled
                ? 'Diese Stunde entfällt.'
                : label === 'RAUMWECHSEL'
                  ? 'Raumwechsel für diese Stunde.'
                  : label === 'LEHRERWECHSEL'
                    ? 'Lehrerwechsel für diese Stunde.'
                    : 'Vertretung für diese Stunde.'}
            </div>
          )}

          <dl className="mt-3 space-y-2 text-sm">
            {(lesson.startTime || lesson.endTime) && (
              <div className="flex justify-between gap-3">
                <dt className="text-text-secondary">Zeit</dt>
                <dd className="text-text-primary">
                  {lesson.startTime ?? '?'}–{lesson.endTime ?? '?'}
                </dd>
              </div>
            )}
            {lesson.teacherName && (
              <div className="flex justify-between gap-3">
                <dt className="text-text-secondary">Lehrkraft</dt>
                <dd className="text-right text-text-primary">
                  {teacherChanged ? (
                    <>
                      <span className="text-text-tertiary line-through">{lesson.teacherName}</span>{' '}
                      {lesson.substituteTeacherName}
                    </>
                  ) : (
                    lesson.teacherName
                  )}
                </dd>
              </div>
            )}
            {lesson.courseName && (
              <div className="flex justify-between gap-3">
                <dt className="text-text-secondary">Kurs</dt>
                <dd className="text-right text-text-primary">{lesson.courseName}</dd>
              </div>
            )}
            {lesson.room && (
              <div className="flex justify-between gap-3">
                <dt className="text-text-secondary">Raum</dt>
                <dd className="text-text-primary">
                  {roomChanged ? (
                    <>
                      <span className="text-text-tertiary line-through">{lesson.room}</span>{' '}
                      {lesson.substituteRoom}
                    </>
                  ) : (
                    lesson.room
                  )}
                </dd>
              </div>
            )}
          </dl>

          {lesson.subjectId && <SubjectHefte subjectId={lesson.subjectId} onNavigate={onClose} />}

          {isUnlinked && (
            <div className="mt-4 border-t border-border-subtle pt-3">
              <p className="text-xs text-text-tertiary">
                Dieses Fach von IServ ist noch keinem lokalen Fach zugeordnet.
              </p>
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="mt-2 rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-accent-ink hover:bg-accent-hover"
              >
                Fach anlegen
              </button>
            </div>
          )}
        </div>
      </div>

      {showCreate && (
        <CreateSubjectModal
          initialName={lesson.subjectName}
          initialAlias={lesson.rawSubjectCode ?? ''}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            // The link only takes effect on the next sync (which re-resolves
            // every override's subject) - trigger one immediately so the
            // color/link show up without the user needing to wait or find
            // the manual sync button themselves. Best-effort only - if it
            // fails (e.g. IServ briefly unreachable), the regular scheduled
            // sync will pick the link up later regardless.
            syncNow.mutateAsync().catch(() => {})
            onClose()
          }}
        />
      )}
    </div>
  )
}

const MAX_HEFTE = 6

/** The Fach's Hefte, most recently written first - what you'd open for
 * this lesson. */
function SubjectHefte({ subjectId, onNavigate }: { subjectId: string; onNavigate: () => void }) {
  const { data: hefte } = useHefte({ subjectId })
  if (!hefte || hefte.length === 0) return null
  const recent = [...hefte].sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt))

  return (
    <div className="mt-4 border-t border-border-subtle pt-3">
      <p className="font-mono text-[10px] tracking-wider text-text-tertiary">HEFTE</p>
      <ul className="mt-1.5 space-y-0.5">
        {recent.slice(0, MAX_HEFTE).map((heft) => (
          <li key={heft.id}>
            <Link
              to={`/hefte/${heft.id}`}
              onClick={onNavigate}
              className="flex items-baseline gap-2 rounded px-1 py-0.5 text-sm text-text-secondary hover:bg-bg-hover hover:text-text-primary"
            >
              <span className="truncate">{heft.name}</span>
              <span className="ml-auto shrink-0 font-mono text-[10px] text-text-muted">{heft.pageCount} S.</span>
            </Link>
          </li>
        ))}
      </ul>
      {recent.length > MAX_HEFTE && (
        <Link to={`/subjects/${subjectId}`} onClick={onNavigate} className="mt-1 block px-1 text-xs text-accent-text hover:underline">
          Alle {recent.length} Hefte
        </Link>
      )}
    </div>
  )
}
