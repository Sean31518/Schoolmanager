import { getContrastTextColor } from '../../lib/color'
import { useTimetable } from './hooks'

const WEEKDAYS = [
  { value: 'MONDAY', label: 'Mo' },
  { value: 'TUESDAY', label: 'Di' },
  { value: 'WEDNESDAY', label: 'Mi' },
  { value: 'THURSDAY', label: 'Do' },
  { value: 'FRIDAY', label: 'Fr' },
]

/** Purely presentational rendering of the timetable — no `<select>`s, no
 * click/hover interactivity by construction. Editing (which subject sits in
 * which slot) happens in Settings via `TimetableGrid`. */
export function TimetableView() {
  const { data, isLoading } = useTimetable()

  if (isLoading || !data) {
    return <p className="text-slate-400 dark:text-slate-500">Lädt...</p>
  }

  const { timeGridSlots, timetableSlots } = data

  if (timeGridSlots.length === 0) {
    return (
      <p className="rounded-lg bg-white p-4 text-slate-400 shadow-sm dark:bg-slate-800 dark:text-slate-500">
        Noch kein Zeitraster angelegt.
      </p>
    )
  }

  function findCell(weekday: string, timeGridSlotId: string) {
    return timetableSlots.find(
      (s) => s.weekday === weekday && s.timeGridSlotId === timeGridSlotId,
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg bg-white p-4 shadow-sm dark:bg-slate-800">
      <table className="w-full min-w-[640px] table-fixed border-collapse text-sm">
        <thead>
          <tr>
            <th className="w-28 border-b border-slate-200 pb-2 text-left text-xs font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-400">
              Zeit
            </th>
            {WEEKDAYS.map((day) => (
              <th
                key={day.value}
                className="border-b border-slate-200 pb-2 text-left text-xs font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-400"
              >
                {day.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {timeGridSlots.map((slot) => {
            if (slot.type === 'BREAK') {
              return (
                <tr key={slot.id} className="bg-slate-50 dark:bg-slate-900">
                  <td className="border border-slate-200 px-2 py-1 text-xs text-slate-400 dark:border-slate-700 dark:text-slate-500">
                    {slot.startTime}–{slot.endTime}
                  </td>
                  <td
                    colSpan={WEEKDAYS.length}
                    className="border border-slate-200 px-2 py-1 text-center text-xs text-slate-400 dark:border-slate-700 dark:text-slate-500"
                  >
                    {slot.label}
                  </td>
                </tr>
              )
            }

            return (
              <tr key={slot.id}>
                <td className="border border-slate-200 px-2 py-2 align-top text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  <div>{slot.label}</div>
                  <div>
                    {slot.startTime}–{slot.endTime}
                  </div>
                </td>
                {WEEKDAYS.map((day) => {
                  const cell = findCell(day.value, slot.id)
                  const cellColor = cell?.subject?.color
                  return (
                    <td
                      key={day.value}
                      className="border border-slate-200 p-0 align-top dark:border-slate-700"
                    >
                      <div
                        className={
                          cellColor
                            ? 'flex h-full min-h-[2.75rem] w-full items-center overflow-hidden px-2 py-3 text-sm font-medium'
                            : 'flex h-full min-h-[2.75rem] w-full items-center overflow-hidden px-2 py-3 text-sm text-slate-300 dark:text-slate-600'
                        }
                        style={
                          cellColor
                            ? {
                                backgroundColor: cellColor,
                                color: getContrastTextColor(cellColor),
                              }
                            : undefined
                        }
                      >
                        {cell?.subject?.name && (
                          <span className="truncate" title={cell.subject.name}>
                            {cell.subject.name}
                          </span>
                        )}
                      </div>
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
