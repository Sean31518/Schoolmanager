import type { CalendarEventDto } from './types'

export interface EventSegment {
  event: CalendarEventDto
  /** 0-6, Monday-Sunday column index within the week */
  startCol: number
  endCol: number
  /** Vertical stacking slot within the week, to avoid overlapping bars */
  lane: number
  /** False if the event actually started before this week (bar continues from above) */
  isStart: boolean
  /** False if the event continues past this week (bar continues below) */
  isEnd: boolean
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

/**
 * Lays out one week's events as horizontal bar segments: multi-day events
 * get clipped to the week and assigned a lane so overlapping events stack
 * instead of covering each other, the same way most month-view calendars
 * (e.g. Google Calendar) render them.
 */
export function computeWeekSegments(week: Date[], events: CalendarEventDto[]): EventSegment[] {
  const weekStartKey = toDateKey(week[0])
  const weekEndKey = toDateKey(week[6])

  const raw: Omit<EventSegment, 'lane'>[] = []
  for (const event of events) {
    const evStartKey = event.startDate.slice(0, 10)
    const evEndKey = (event.endDate ?? event.startDate).slice(0, 10)
    if (evEndKey < weekStartKey || evStartKey > weekEndKey) continue

    const clippedStartKey = evStartKey < weekStartKey ? weekStartKey : evStartKey
    const clippedEndKey = evEndKey > weekEndKey ? weekEndKey : evEndKey
    const startCol = week.findIndex((d) => toDateKey(d) === clippedStartKey)
    const endCol = week.findIndex((d) => toDateKey(d) === clippedEndKey)

    raw.push({
      event,
      startCol,
      endCol,
      isStart: clippedStartKey === evStartKey,
      isEnd: clippedEndKey === evEndKey,
    })
  }

  // Longer/earlier-starting bars claim a lane first, so a single-day event
  // doesn't "steal" lane 0 out from under a bar spanning through it.
  raw.sort(
    (a, b) => a.startCol - b.startCol || b.endCol - b.startCol - (a.endCol - a.startCol),
  )

  const laneLastEndCol: number[] = []
  const segments: EventSegment[] = []
  for (const seg of raw) {
    let lane = laneLastEndCol.findIndex((endCol) => endCol < seg.startCol)
    if (lane === -1) {
      lane = laneLastEndCol.length
      laneLastEndCol.push(seg.endCol)
    } else {
      laneLastEndCol[lane] = seg.endCol
    }
    segments.push({ ...seg, lane })
  }
  return segments
}
