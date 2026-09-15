import { getEffectiveColor } from './eventColors'
import { computeWeekSegments } from './monthLayout'
import type { CalendarEventDto } from './types'

const DAY_NUMBER_HEIGHT = 24
const LANE_HEIGHT = 18
const LANE_GAP = 3
const MIN_CELL_HEIGHT = 96
const CELL_BOTTOM_PADDING = 6

export function WeekRow({
  week,
  month,
  todayKey,
  events,
  onEventClick,
}: {
  week: Date[]
  month: number
  todayKey: string
  events: CalendarEventDto[]
  onEventClick: (event: CalendarEventDto) => void
}) {
  const segments = computeWeekSegments(week, events)
  const maxLane = segments.reduce((max, seg) => Math.max(max, seg.lane), -1)
  const cellHeight = Math.max(
    MIN_CELL_HEIGHT,
    DAY_NUMBER_HEIGHT + (maxLane + 1) * (LANE_HEIGHT + LANE_GAP) + CELL_BOTTOM_PADDING,
  )

  return (
    <div className="relative grid grid-cols-7" style={{ minHeight: cellHeight }}>
      {week.map((day, col) => {
        const dayKey = day.toISOString().slice(0, 10)
        const isCurrentMonth = day.getUTCMonth() === month
        const isToday = dayKey === todayKey
        return (
          <div
            key={dayKey}
            className={
              (isCurrentMonth ? 'bg-white dark:bg-slate-800' : 'bg-slate-50 dark:bg-slate-900') +
              ' border-b border-r border-slate-200 p-1.5 dark:border-slate-700' +
              (col === 0 ? ' border-l' : '')
            }
          >
            <div
              className={
                isToday
                  ? 'inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white'
                  : isCurrentMonth
                    ? 'text-xs font-medium text-slate-600 dark:text-slate-300'
                    : 'text-xs font-medium text-slate-300 dark:text-slate-600'
              }
            >
              {day.getUTCDate()}
            </div>
          </div>
        )
      })}
      {segments.map((seg) => (
        <button
          key={`${seg.event.id}-${seg.startCol}`}
          type="button"
          onClick={() => onEventClick(seg.event)}
          title={seg.event.title}
          className={
            'absolute flex items-center truncate px-1 text-[11px] font-medium text-white' +
            (seg.isStart ? ' rounded-l' : '') +
            (seg.isEnd ? ' rounded-r' : '')
          }
          style={{
            left: `calc(${(seg.startCol / 7) * 100}% + 2px)`,
            width: `calc(${((seg.endCol - seg.startCol + 1) / 7) * 100}% - 4px)`,
            top: DAY_NUMBER_HEIGHT + seg.lane * (LANE_HEIGHT + LANE_GAP),
            height: LANE_HEIGHT,
            backgroundColor: getEffectiveColor(seg.event),
          }}
        >
          {seg.event.title}
        </button>
      ))}
    </div>
  )
}
