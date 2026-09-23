import { useState } from 'react'
import { vertretungLabel } from '../../lib/vertretungLabel'
import { useTimetable } from './hooks'
import { LessonDetailModal, type LessonDetailData } from './LessonDetailModal'
import type { IservOverlayEntryDto, TimeGridSlotDto, TimetableSlotDto } from './types'

const WEEKDAYS = [
  { value: 'MONDAY', label: 'Mo' },
  { value: 'TUESDAY', label: 'Di' },
  { value: 'WEDNESDAY', label: 'Mi' },
  { value: 'THURSDAY', label: 'Do' },
  { value: 'FRIDAY', label: 'Fr' },
]

// JS getDay(): 0=So .. 6=Sa
const JS_DAY_TO_WEEKDAY: Record<number, string | undefined> = {
  1: 'MONDAY',
  2: 'TUESDAY',
  3: 'WEDNESDAY',
  4: 'THURSDAY',
  5: 'FRIDAY',
}

function isNowWithin(startTime: string, endTime: string) {
  const now = new Date()
  const minutesNow = now.getHours() * 60 + now.getMinutes()
  const [startH, startM] = startTime.split(':').map(Number)
  const [endH, endM] = endTime.split(':').map(Number)
  return minutesNow >= startH * 60 + startM && minutesNow < endH * 60 + endM
}

/** Merges the manually-entered plan with this week's IServ overlay (if any)
 * into a single shape to render — IServ wins when present, same precedence
 * as the dashboard widget. `mergeKey` distinguishes lessons for Doppelstunde
 * merging: manual lessons key on subjectId, IServ-sourced ones on
 * name+Vertretung-status, since they're never the same underlying record. */
interface ResolvedCell {
  subjectName: string | null
  subjectColor: string | null
  subjectId: string | null
  rawSubjectCode: string | null
  room: string | null
  substituteRoom: string | null
  teacherAcronym: string | null
  substituteTeacherAcronym: string | null
  teacherName: string | null
  substituteTeacherName: string | null
  courseName: string | null
  startTime: string | null
  endTime: string | null
  vertretung?: 'CANCELLED' | 'CHANGED'
  mergeKey: string | null
}

function resolveCell(
  weekday: string,
  timeGridSlotId: string,
  timetableSlots: TimetableSlotDto[],
  iservOverlay: IservOverlayEntryDto[],
): ResolvedCell {
  const manual = timetableSlots.find(
    (s) => s.weekday === weekday && s.timeGridSlotId === timeGridSlotId,
  )
  const overlay = iservOverlay.find(
    (o) => o.weekday === weekday && o.timeGridSlotId === timeGridSlotId,
  )

  if (overlay) {
    const vertretung =
      overlay.type === 'CANCELLED' || overlay.type === 'CHANGED' ? overlay.type : undefined
    const subjectName = overlay.subjectName ?? manual?.subject?.name ?? null
    return {
      subjectName,
      // The linked Subject's own color, never the manual cell's — showing a
      // coincidentally-assigned manual subject's color here would be wrong
      // as soon as the two diverge (that was the actual bug being fixed).
      subjectColor: overlay.subjectColor,
      subjectId: overlay.subjectId,
      rawSubjectCode: overlay.rawSubjectCode,
      room: overlay.room ?? manual?.room ?? null,
      substituteRoom: overlay.substituteRoom,
      teacherAcronym: overlay.teacherAcronym,
      substituteTeacherAcronym: overlay.substituteTeacherAcronym,
      teacherName: overlay.teacherName,
      substituteTeacherName: overlay.substituteTeacherName,
      courseName: overlay.courseName,
      startTime: overlay.startTime,
      endTime: overlay.endTime,
      vertretung,
      // Room/teacher substitutions are part of the merge key too - two
      // consecutive periods of the same subject with different Raum-/
      // Lehrerwechsel details are not the same Doppelstunde block.
      mergeKey: subjectName
        ? `iserv:${subjectName}:${vertretung ?? ''}:${overlay.substituteRoom ?? ''}:${overlay.substituteTeacherAcronym ?? ''}`
        : null,
    }
  }

  return {
    subjectName: manual?.subject?.name ?? null,
    subjectColor: manual?.subject?.color ?? null,
    subjectId: manual?.subjectId ?? null,
    rawSubjectCode: null,
    room: manual?.room ?? null,
    substituteRoom: null,
    teacherAcronym: null,
    substituteTeacherAcronym: null,
    teacherName: null,
    substituteTeacherName: null,
    courseName: null,
    startTime: null,
    endTime: null,
    vertretung: undefined,
    mergeKey: manual?.subjectId ? `manual:${manual.subjectId}` : null,
  }
}

interface DayCellSpan {
  cell: ResolvedCell
  rowSpan: number
  skip: boolean
}

/** Consecutive lessons that resolve to the same lesson (see mergeKey) render
 * as one merged block (single border, subject named once) instead of two
 * identical stacked cards — a "Doppelstunde". */
function buildDaySpans(
  day: string,
  timeGridSlots: TimeGridSlotDto[],
  resolve: (weekday: string, timeGridSlotId: string) => ResolvedCell,
): (DayCellSpan | null)[] {
  const spans: (DayCellSpan | null)[] = []
  for (let i = 0; i < timeGridSlots.length; i++) {
    const slot = timeGridSlots[i]
    if (slot.type === 'BREAK') {
      spans.push(null)
      continue
    }
    const cell = resolve(day, slot.id)
    const prevSlot = timeGridSlots[i - 1]
    const prevCell = prevSlot && prevSlot.type === 'LESSON' ? resolve(day, prevSlot.id) : undefined
    const isContinuation = Boolean(
      cell.mergeKey && prevCell?.mergeKey && prevCell.mergeKey === cell.mergeKey,
    )
    if (isContinuation) {
      spans.push({ skip: true, rowSpan: 0, cell })
      continue
    }
    let rowSpan = 1
    for (let j = i + 1; j < timeGridSlots.length; j++) {
      const nextSlot = timeGridSlots[j]
      if (nextSlot.type !== 'LESSON') break
      const nextCell = resolve(day, nextSlot.id)
      if (cell.mergeKey && nextCell.mergeKey === cell.mergeKey) {
        rowSpan++
      } else {
        break
      }
    }
    spans.push({ cell, rowSpan, skip: false })
  }
  return spans
}

const WEEKDAY_LABELS: Record<string, string> = {
  MONDAY: 'Montag',
  TUESDAY: 'Dienstag',
  WEDNESDAY: 'Mittwoch',
  THURSDAY: 'Donnerstag',
  FRIDAY: 'Freitag',
}

/** Read-only rendering of the timetable, merging in this week's IServ data
 * (room/teacher/times, Vertretungen) when available. Clicking a lesson opens
 * a detail popup; editing which subject sits in which slot still happens in
 * Settings via `TimetableGrid`, unaffected by any of this. */
export function TimetableView() {
  const { data, isLoading } = useTimetable()
  const todayWeekday = JS_DAY_TO_WEEKDAY[new Date().getDay()]
  const [selected, setSelected] = useState<{
    weekday: string
    cell: ResolvedCell
    startTime: string
    endTime: string
  } | null>(null)

  if (isLoading || !data) {
    return <p className="text-text-tertiary">Lädt...</p>
  }

  const { timeGridSlots, timetableSlots, iservOverlay, iservActive } = data

  if (timeGridSlots.length === 0) {
    return (
      <p className="rounded-lg border border-border bg-bg-1 p-4 text-text-tertiary">
        Noch kein Zeitraster angelegt.
      </p>
    )
  }

  function resolve(weekday: string, timeGridSlotId: string) {
    return resolveCell(weekday, timeGridSlotId, timetableSlots, iservOverlay)
  }

  const daySpansByDay = Object.fromEntries(
    WEEKDAYS.map((day) => [day.value, buildDaySpans(day.value, timeGridSlots, resolve)]),
  )

  // When IServ is active, a slot's row shows IServ's own (more precise) time
  // if this week's overlay reports one for that slot on any weekday, instead
  // of the manually-configured TimeGridSlot time — since if IServ drives the
  // schedule at all, one consistent time source across the row is more
  // trustworthy than the possibly-stale manual grid config.
  function rowTime(slot: TimeGridSlotDto): { startTime: string; endTime: string } {
    if (!iservActive) return { startTime: slot.startTime, endTime: slot.endTime }
    const withTime = iservOverlay.find((o) => o.timeGridSlotId === slot.id && o.startTime && o.endTime)
    if (withTime) return { startTime: withTime.startTime!, endTime: withTime.endTime! }
    return { startTime: slot.startTime, endTime: slot.endTime }
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-bg-1 p-4">
      <table className="w-full min-w-[640px] table-fixed border-collapse text-sm">
        <thead>
          <tr>
            <th className="w-16 pb-1.5 pl-0.5 text-left font-mono text-[10px] font-medium tracking-wider text-text-muted">
              ZEIT
            </th>
            {WEEKDAYS.map((day) => (
              <th
                key={day.value}
                className={`pb-1.5 pl-1 text-left font-mono text-[10px] tracking-wider ${
                  day.value === todayWeekday
                    ? 'font-semibold text-accent-text'
                    : 'font-medium text-text-muted'
                }`}
              >
                {day.value === todayWeekday ? `${day.label} · HEUTE` : day.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&>tr>td]:p-[3px]">
          {timeGridSlots.map((slot, i) => {
            if (slot.type === 'BREAK') {
              const breakIsNow = Boolean(todayWeekday) && isNowWithin(slot.startTime, slot.endTime)
              return (
                <tr key={slot.id}>
                  <td className="align-middle font-mono text-[10px] text-text-muted">
                    {slot.startTime}
                  </td>
                  <td colSpan={WEEKDAYS.length}>
                    <div className="flex items-center justify-center gap-2 rounded-[5px] border border-border-subtle bg-bg-muted px-2 py-1 font-mono text-[10px] tracking-wider text-text-muted">
                      {slot.label}
                      {breakIsNow && (
                        <span className="shrink-0 rounded-[3px] bg-accent px-[5px] py-px font-mono text-[9px] font-semibold tracking-wider text-accent-ink">
                          JETZT
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              )
            }

            const { startTime } = rowTime(slot)

            return (
              <tr key={slot.id}>
                <td className="align-middle font-mono text-[10px] text-text-secondary">
                  <div className="flex min-h-[2.75rem] items-center">{startTime}</div>
                </td>
                {WEEKDAYS.map((day) => {
                  const span = daySpansByDay[day.value][i]
                  if (span?.skip) return null

                  const cell = span?.cell
                  const cellColor = cell?.subjectColor ?? (cell?.subjectName ? '#71717a' : null)
                  const isToday = day.value === todayWeekday
                  const spanEnd = timeGridSlots[i + (span?.rowSpan ?? 1) - 1]
                  const isNow = isToday && isNowWithin(startTime, rowTime(spanEnd).endTime)
                  const cancelled = cell?.vertretung === 'CANCELLED'
                  const roomChanged = Boolean(cell?.substituteRoom)
                  const teacherChanged = Boolean(cell?.substituteTeacherAcronym)
                  return (
                    <td key={day.value} rowSpan={span?.rowSpan ?? 1} className="relative">
                      {cellColor ? (
                        <button
                          type="button"
                          onClick={() =>
                            cell &&
                            setSelected({
                              weekday: day.value,
                              cell,
                              startTime,
                              endTime: rowTime(spanEnd).endTime,
                            })
                          }
                          className={`absolute inset-0 flex w-full flex-col justify-center gap-1 overflow-hidden rounded-[5px] px-2.5 py-2 text-left text-xs font-semibold text-text-primary ${
                            cancelled ? 'bg-red-500/30' : 'bg-bg-3 hover:bg-bg-hover'
                          }`}
                          style={{ borderLeft: `4px solid ${cancelled ? '#ef4444' : cellColor}` }}
                        >
                          <span className="flex items-center justify-between gap-1.5">
                            <span className={`truncate ${cancelled ? 'line-through opacity-60' : ''}`} title={cell?.subjectName ?? undefined}>
                              {cell?.subjectName}
                            </span>
                            {isNow && (
                              <span className="shrink-0 rounded-[3px] bg-accent px-[5px] py-px font-mono text-[9px] font-semibold tracking-wider text-accent-ink">
                                JETZT
                              </span>
                            )}
                          </span>
                          <span className="flex items-center gap-1.5 font-mono text-[9px] font-normal text-text-tertiary">
                            {cell?.room && (
                              <span className="truncate">
                                {roomChanged ? (
                                  <>
                                    <span className="line-through opacity-60">{cell.room}</span>{' '}
                                    {cell.substituteRoom}
                                  </>
                                ) : (
                                  cell.room
                                )}
                              </span>
                            )}
                            {cell?.teacherAcronym && (
                              <span className="shrink-0">
                                {teacherChanged ? (
                                  <>
                                    <span className="line-through opacity-60">{cell.teacherAcronym}</span>{' '}
                                    {cell.substituteTeacherAcronym}
                                  </>
                                ) : (
                                  cell.teacherAcronym
                                )}
                              </span>
                            )}
                          </span>
                          {cell?.vertretung && (
                            <span
                              className={`self-start rounded-[3px] px-[5px] py-px font-mono text-[9px] font-semibold tracking-wider ${
                                cancelled ? 'bg-red-400/20 text-red-400' : 'bg-accent/20 text-accent-text'
                              }`}
                            >
                              {vertretungLabel(cancelled, roomChanged, teacherChanged)}
                            </span>
                          )}
                        </button>
                      ) : isNow ? (
                        <div className="absolute inset-0 flex items-center justify-end px-2">
                          <span className="shrink-0 rounded-[3px] bg-accent px-[5px] py-px font-mono text-[9px] font-semibold tracking-wider text-accent-ink">
                            JETZT
                          </span>
                        </div>
                      ) : null}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
      {selected && (
        <LessonDetailModal
          lesson={toLessonDetail(selected)}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}

function toLessonDetail({
  weekday,
  cell,
  startTime,
  endTime,
}: {
  weekday: string
  cell: ResolvedCell
  startTime: string
  endTime: string
}): LessonDetailData {
  // startTime/endTime are passed in already resolved for the full merged
  // span (a Doppelstunde spans two TimeGridSlots) and with IServ's own time
  // applied when active — cell.startTime/endTime alone would only reflect
  // the first of the two periods.
  return {
    subjectName: cell.subjectName ?? '',
    subjectColor: cell.subjectColor,
    subjectId: cell.subjectId,
    rawSubjectCode: cell.rawSubjectCode,
    dayLabel: WEEKDAY_LABELS[weekday] ?? weekday,
    startTime,
    endTime,
    room: cell.room,
    substituteRoom: cell.substituteRoom,
    teacherName: cell.teacherName,
    substituteTeacherName: cell.substituteTeacherName,
    courseName: cell.courseName,
    vertretung: cell.vertretung,
  }
}
