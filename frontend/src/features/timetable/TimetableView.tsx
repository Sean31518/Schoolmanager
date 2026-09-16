import { useTimetable } from './hooks'
import type { TimeGridSlotDto, TimetableSlotDto } from './types'

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

interface DayCellSpan {
  cell?: TimetableSlotDto
  rowSpan: number
  skip: boolean
}

/** Consecutive lessons with the same subject on the same day render as one
 * merged block (single border, subject named once) instead of two identical
 * stacked cards — a "Doppelstunde". */
function buildDaySpans(
  day: string,
  timeGridSlots: TimeGridSlotDto[],
  findCell: (weekday: string, timeGridSlotId: string) => TimetableSlotDto | undefined,
): (DayCellSpan | null)[] {
  const spans: (DayCellSpan | null)[] = []
  for (let i = 0; i < timeGridSlots.length; i++) {
    const slot = timeGridSlots[i]
    if (slot.type === 'BREAK') {
      spans.push(null)
      continue
    }
    const cell = findCell(day, slot.id)
    const prevSlot = timeGridSlots[i - 1]
    const prevCell =
      prevSlot && prevSlot.type === 'LESSON' ? findCell(day, prevSlot.id) : undefined
    const isContinuation = Boolean(
      cell?.subjectId && prevCell?.subjectId && prevCell.subjectId === cell.subjectId,
    )
    if (isContinuation) {
      spans.push({ skip: true, rowSpan: 0 })
      continue
    }
    let rowSpan = 1
    for (let j = i + 1; j < timeGridSlots.length; j++) {
      const nextSlot = timeGridSlots[j]
      if (nextSlot.type !== 'LESSON') break
      const nextCell = findCell(day, nextSlot.id)
      if (cell?.subjectId && nextCell?.subjectId && nextCell.subjectId === cell.subjectId) {
        rowSpan++
      } else {
        break
      }
    }
    spans.push({ cell, rowSpan, skip: false })
  }
  return spans
}

/** Purely presentational rendering of the timetable — no `<select>`s, no
 * click/hover interactivity by construction. Editing (which subject sits in
 * which slot) happens in Settings via `TimetableGrid`. */
export function TimetableView() {
  const { data, isLoading } = useTimetable()
  const todayWeekday = JS_DAY_TO_WEEKDAY[new Date().getDay()]

  if (isLoading || !data) {
    return <p className="text-text-tertiary">Lädt...</p>
  }

  const { timeGridSlots, timetableSlots } = data

  if (timeGridSlots.length === 0) {
    return (
      <p className="rounded-lg border border-border bg-bg-1 p-4 text-text-tertiary">
        Noch kein Zeitraster angelegt.
      </p>
    )
  }

  function findCell(weekday: string, timeGridSlotId: string) {
    return timetableSlots.find(
      (s) => s.weekday === weekday && s.timeGridSlotId === timeGridSlotId,
    )
  }

  const daySpansByDay = Object.fromEntries(
    WEEKDAYS.map((day) => [day.value, buildDaySpans(day.value, timeGridSlots, findCell)]),
  )

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
                    ? 'font-semibold text-accent'
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
              return (
                <tr key={slot.id}>
                  <td className="align-middle font-mono text-[10px] text-text-muted">
                    {slot.startTime}
                  </td>
                  <td colSpan={WEEKDAYS.length}>
                    <div className="rounded-[5px] border border-border-subtle bg-bg-muted px-2 py-1 text-center font-mono text-[10px] tracking-wider text-text-muted">
                      {slot.label}
                    </div>
                  </td>
                </tr>
              )
            }

            return (
              <tr key={slot.id}>
                <td className="align-middle font-mono text-[10px] text-text-secondary">
                  {slot.startTime}
                </td>
                {WEEKDAYS.map((day) => {
                  const span = daySpansByDay[day.value][i]
                  if (span?.skip) return null

                  const cell = span?.cell
                  const cellColor = cell?.subject?.color
                  const isToday = day.value === todayWeekday
                  const spanEnd = timeGridSlots[i + (span?.rowSpan ?? 1) - 1]
                  const isNow = isToday && isNowWithin(slot.startTime, spanEnd.endTime)
                  return (
                    <td key={day.value} rowSpan={span?.rowSpan ?? 1} className="align-top">
                      {cellColor ? (
                        <div
                          className="flex h-full min-h-[2.75rem] w-full flex-col justify-center gap-1 overflow-hidden rounded-[5px] bg-bg-3 px-2.5 py-2 text-xs font-semibold text-text-primary"
                          style={{ borderLeft: `4px solid ${cellColor}` }}
                        >
                          <span className="flex items-center justify-between gap-1.5">
                            <span className="truncate" title={cell?.subject?.name}>
                              {cell?.subject?.name}
                            </span>
                            {isNow && (
                              <span className="shrink-0 rounded-[3px] bg-accent px-[5px] py-px font-mono text-[9px] font-semibold tracking-wider text-accent-ink">
                                JETZT
                              </span>
                            )}
                          </span>
                          {cell?.room && (
                            <span className="font-mono text-[9px] font-normal text-text-tertiary">
                              {cell.room}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="flex min-h-[2.75rem] w-full items-center rounded-[5px] border border-dashed border-border-subtle px-2.5 py-2 text-xs text-text-disabled">
                          frei
                        </div>
                      )}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
