import type { TimetableSlotSummaryDto } from './types'

function DaySection({ label, slots }: { label: string; slots: TimetableSlotSummaryDto[] }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase text-slate-400 dark:text-slate-500">
        {label}
      </h3>
      {slots.length === 0 ? (
        <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">Keine Stunden.</p>
      ) : (
        <ul className="mt-1 space-y-1.5">
          {slots.map((slot, i) => (
            <li key={i} className="flex items-center gap-2 text-sm">
              <span
                className="h-2 w-2 flex-shrink-0 rounded-full"
                style={{ backgroundColor: slot.subjectColor }}
              />
              <span className="flex-1 truncate text-slate-700 dark:text-slate-200">
                {slot.subjectName}
              </span>
              <span className="flex-shrink-0 text-xs text-slate-400 dark:text-slate-500">
                {slot.startTime}
              </span>
            </li>
          ))}
        </ul>
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
    <div className="space-y-4 rounded-lg bg-white p-4 shadow-sm dark:bg-slate-800">
      <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Stundenplan</h2>
      <DaySection label="Heute" slots={today} />
      <DaySection label="Morgen" slots={tomorrow} />
    </div>
  )
}
