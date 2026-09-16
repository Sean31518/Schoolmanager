import { useState } from 'react'
import type { TimetableSlotSummaryDto } from './types'

function isNowWithin(startTime: string, endTime: string) {
  const now = new Date()
  const minutesNow = now.getHours() * 60 + now.getMinutes()
  const [startH, startM] = startTime.split(':').map(Number)
  const [endH, endM] = endTime.split(':').map(Number)
  return minutesNow >= startH * 60 + startM && minutesNow < endH * 60 + endM
}

/** Consecutive same-subject lessons ("Doppelstunden") collapse into a single
 * row spanning the combined time range, matching how the main Stundenplan
 * grid merges them. Subject names are unique per user, so comparing by name
 * is equivalent to comparing by subject id here. */
function mergeDoppelstunden(slots: TimetableSlotSummaryDto[]): TimetableSlotSummaryDto[] {
  const merged: TimetableSlotSummaryDto[] = []
  for (const slot of slots) {
    const prev = merged[merged.length - 1]
    if (
      prev &&
      prev.type === 'LESSON' &&
      slot.type === 'LESSON' &&
      prev.subjectName &&
      prev.subjectName === slot.subjectName
    ) {
      merged[merged.length - 1] = { ...prev, endTime: slot.endTime }
      continue
    }
    merged.push(slot)
  }
  return merged
}

function SlotRow({ slot, isNow }: { slot: TimetableSlotSummaryDto; isNow: boolean }) {
  if (slot.type === 'BREAK') {
    return (
      <div
        className={`flex items-center justify-center gap-2 rounded-[5px] border border-border-subtle bg-bg-muted py-1.5 pl-2.5 pr-2 ${
          isNow ? 'ml-1.5' : ''
        }`}
      >
        <span className="font-mono text-[10px] tracking-wider text-text-muted">
          {slot.label.toUpperCase()}
        </span>
        {isNow && (
          <span className="shrink-0 rounded-[3px] bg-accent px-[5px] py-px font-mono text-[9px] font-semibold tracking-wider text-accent-ink">
            JETZT
          </span>
        )}
      </div>
    )
  }

  if (!slot.subjectName) {
    return (
      <div
        className={`flex items-center gap-2.5 rounded-[5px] border border-dashed border-border-subtle py-1.5 pl-2.5 pr-2 ${
          isNow ? 'ml-1.5' : ''
        }`}
      >
        <span className="w-9 shrink-0 font-mono text-[10px] text-text-tertiary">
          {slot.startTime}
        </span>
        <span className="flex-1 truncate text-xs text-text-disabled">Frei</span>
        {isNow && (
          <span className="shrink-0 rounded-[3px] bg-accent px-[5px] py-px font-mono text-[9px] font-semibold tracking-wider text-accent-ink">
            JETZT
          </span>
        )}
      </div>
    )
  }

  return (
    <div
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
}

export function TodayTomorrowWidget({
  today,
  tomorrow,
}: {
  today: TimetableSlotSummaryDto[]
  tomorrow: TimetableSlotSummaryDto[]
}) {
  const [view, setView] = useState<'today' | 'tomorrow'>('today')
  const slots = mergeDoppelstunden(view === 'today' ? today : tomorrow)

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-bg-1">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <span className="font-mono text-[10px] tracking-wider text-text-tertiary">
          STUNDENPLAN
        </span>
        <button
          type="button"
          onClick={() => setView((v) => (v === 'today' ? 'tomorrow' : 'today'))}
          title={view === 'today' ? 'Zu morgen wechseln' : 'Zu heute wechseln'}
          className="shrink-0 rounded-md border border-border px-2 py-1 font-mono text-[10px] tracking-wider text-text-secondary hover:border-text-disabled hover:text-text-primary"
        >
          {view === 'today' ? 'HEUTE' : 'MORGEN'} ⇄
        </button>
      </div>

      {slots.length === 0 ? (
        <p className="px-3 py-2.5 text-sm text-text-tertiary">Keine Stunden.</p>
      ) : (
        <div className="flex flex-col gap-1 p-2">
          {slots.map((slot, i) => (
            <SlotRow
              key={i}
              slot={slot}
              isNow={view === 'today' && isNowWithin(slot.startTime, slot.endTime)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
