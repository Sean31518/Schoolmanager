import { useState } from 'react'
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
  room: string | null
  teacherAcronym: string | null
  teacherName: string | null
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
      subjectColor: manual?.subject?.color ?? null,
      room: overlay.room ?? manual?.room ?? null,
      teacherAcronym: overlay.teacherAcronym,
      teacherName: overlay.teacherName,
      courseName: overlay.courseName,
      startTime: overlay.startTime,
      endTime: overlay.endTime,
      vertretung,
      mergeKey: subjectName ? `iserv:${subjectName}:${vertretung ?? ''}` : null,
    }
  }

  return {
    subjectName: manual?.subject?.name ?? null,
    subjectColor: manual?.subject?.color ?? null,
    room: manual?.room ?? null,
    teacherAcronym: null,
    teacherName: null,
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
  const [selected, setSelected] = useState<{ weekday: string; slot: TimeGridSlotDto; cell: ResolvedCell } | null>(
    null,
  )

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
                  return (
                    <td key={day.value} rowSpan={span?.rowSpan ?? 1} className="relative">
                      {cellColor ? (
                        <button
                          type="button"
                          onClick={() =>
                            cell &&
                            setSelected({
                              weekday: day.value,
                              slot,
                              cell,
                            })
                          }
                          className="absolute inset-0 flex w-full flex-col justify-center gap-1 overflow-hidden rounded-[5px] bg-bg-3 px-2.5 py-2 text-left text-xs font-semibold text-text-primary hover:bg-bg-hover"
                          style={{ borderLeft: `4px solid ${cellColor}` }}
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
                            {cell?.room && <span className="truncate">{cell.room}</span>}
                            {cell?.teacherAcronym && <span className="shrink-0">{cell.teacherAcronym}</span>}
                          </span>
                          {cell?.vertretung && (
                            <span
                              className={`self-start rounded-[3px] px-[5px] py-px font-mono text-[9px] font-semibold tracking-wider ${
                                cancelled ? 'bg-red-400/20 text-red-400' : 'bg-accent/20 text-accent-text'
                              }`}
                            >
                              {cancelled ? 'ENTFÄLLT' : 'VERTRETUNG'}
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
  slot,
  cell,
}: {
  weekday: string
  slot: TimeGridSlotDto
  cell: ResolvedCell
}): LessonDetailData {
  return {
    subjectName: cell.subjectName ?? '',
    subjectColor: cell.subjectColor,
    dayLabel: WEEKDAY_LABELS[weekday] ?? weekday,
    startTime: cell.startTime ?? slot.startTime,
    endTime: cell.endTime ?? slot.endTime,
    room: cell.room,
    teacherName: cell.teacherName,
    courseName: cell.courseName,
    vertretung: cell.vertretung,
  }
}
