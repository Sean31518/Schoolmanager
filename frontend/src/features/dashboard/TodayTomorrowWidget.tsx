import { useState } from 'react'
import type { TimetableSlotSummaryDto } from './types'

function isNowWithin(startTime: string, endTime: string) {
  const now = new Date()
  const minutesNow = now.getHours() * 60 + now.getMinutes()
  const [startH, startM] = startTime.split(':').map(Number)
  const [endH, endM] = endTime.split(':').map(Number)
  return minutesNow >= startH * 60 + startM && minutesNow < endH * 60 + endM
}

export function TodayTomorrowWidget({
  today,
  tomorrow,
}: {
  today: TimetableSlotSummaryDto[]
  tomorrow: TimetableSlotSummaryDto[]
}) {
  const [view, setView] = useState<'today' | 'tomorrow'>('today')
  const slots = view === 'today' ? today : tomorrow

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-bg-1">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <span className="truncate whitespace-nowrap font-mono text-[10px] tracking-wider text-text-tertiary">
          STUNDENPLAN · {slots.length} STUNDEN
        </span>
        <div className="flex shrink-0 overflow-hidden rounded-md border border-border">
          <button
            type="button"
            onClick={() => setView('today')}
            className={`px-2 py-1 font-mono text-[10px] tracking-wider ${
              view === 'today'
                ? 'bg-accent text-accent-ink'
                : 'text-text-tertiary hover:text-text-primary'
            }`}
          >
            HEUTE
          </button>
          <button
            type="button"
            onClick={() => setView('tomorrow')}
            className={`px-2 py-1 font-mono text-[10px] tracking-wider ${
              view === 'tomorrow'
                ? 'bg-accent text-accent-ink'
                : 'text-text-tertiary hover:text-text-primary'
            }`}
          >
            MORGEN
          </button>
        </div>
      </div>

      {slots.length === 0 ? (
        <p className="px-3 py-2.5 text-sm text-text-tertiary">Keine Stunden.</p>
      ) : (
        <div className="flex flex-col gap-1 p-2">
          {slots.map((slot, i) => {
            const isNow = view === 'today' && isNowWithin(slot.startTime, slot.endTime)
            return (
              <div
                key={i}
                className={`flex items-center gap-2.5 rounded-[5px] bg-bg-3 py-1.5 pl-2.5 pr-2 ${
                  isNow ? 'ml-1.5' : ''
                }`}
                style={{ borderLeft: `4px solid ${slot.subjectColor}` }}
              >
                <span className="w-9 shrink-0 font-mono text-[10px] text-text-tertiary">
                  {slot.startTime}
                </span>
                <span className="flex-1 truncate text-xs font-semibold text-text-primary">
                  {slot.subjectName}
                </span>
                {isNow && (
                  <span className="shrink-0 rounded-[3px] bg-accent px-[5px] py-px font-mono text-[9px] font-semibold tracking-wider text-accent-ink">
                    JETZT
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
