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
              (isCurrentMonth ? 'bg-bg-1' : 'bg-bg-muted') +
              ' border-b border-r border-border-subtle p-1.5' +
              (col === 0 ? ' border-l' : '')
            }
          >
            <div
              className={
                isToday
                  ? 'inline-flex h-5 w-5 items-center justify-center rounded-[5px] bg-accent font-mono text-[11px] font-semibold text-accent-ink'
                  : isCurrentMonth
                    ? 'font-mono text-[11px] text-text-secondary'
                    : 'font-mono text-[11px] text-text-disabled'
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
            'absolute flex items-center truncate border-l-4 bg-bg-2 px-1.5 text-[11px] font-medium text-text-primary' +
            (seg.isStart ? ' rounded-l-[4px]' : '') +
            (seg.isEnd ? ' rounded-r-[4px]' : '')
          }
          style={{
            left: `calc(${(seg.startCol / 7) * 100}% + 2px)`,
            width: `calc(${((seg.endCol - seg.startCol + 1) / 7) * 100}% - 4px)`,
            top: DAY_NUMBER_HEIGHT + seg.lane * (LANE_HEIGHT + LANE_GAP),
            height: LANE_HEIGHT,
            borderLeftColor: getEffectiveColor(seg.event),
          }}
        >
          {seg.event.title}
        </button>
      ))}
    </div>
  )
}
