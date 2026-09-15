import type { TimetableSlotSummaryDto } from './types'

function DaySection({ slots }: { slots: TimetableSlotSummaryDto[] }) {
  return (
    <div className="flex flex-col">
      {slots.length === 0 ? (
        <p className="px-3 py-2.5 text-sm text-text-tertiary">Keine Stunden.</p>
      ) : (
        slots.map((slot, i) => (
          <div
            key={i}
            className="flex items-center gap-2.5 border-b border-border-subtle px-3 py-1.5 last:border-b-0"
          >
            <span className="w-9 shrink-0 font-mono text-[10px] text-text-tertiary">
              {slot.startTime}
            </span>
            <span
              className="h-4 w-[3px] shrink-0 rounded-[2px] opacity-70"
              style={{ backgroundColor: slot.subjectColor }}
            />
            <span className="flex-1 truncate text-xs font-medium text-text-secondary">
              {slot.subjectName}
            </span>
          </div>
        ))
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
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-bg-1">
      <div className="border-b border-border px-3 py-2 font-mono text-[10px] tracking-wider text-text-tertiary">
        HEUTE · {today.length} STUNDEN
      </div>
      <DaySection slots={today} />
      {tomorrow.length > 0 && (
        <>
          <div className="border-y border-border bg-bg-muted px-3 py-1.5 font-mono text-[10px] tracking-wider text-text-muted">
            MORGEN
          </div>
          <DaySection slots={tomorrow} />
        </>
      )}
    </div>
  )
}
