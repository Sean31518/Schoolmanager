import { getContrastTextColor } from '../../lib/color'
import { useSubjects } from '../subjects/hooks'
import { useSetTimetableCell, useTimetable } from './hooks'

const WEEKDAYS = [
  { value: 'MONDAY', label: 'Mo' },
  { value: 'TUESDAY', label: 'Di' },
  { value: 'WEDNESDAY', label: 'Mi' },
  { value: 'THURSDAY', label: 'Do' },
  { value: 'FRIDAY', label: 'Fr' },
]

export function TimetableGrid() {
  const { data, isLoading } = useTimetable()
  const { data: subjects } = useSubjects()
  const setCell = useSetTimetableCell()

  if (isLoading || !data) {
    return <p className="text-slate-400 dark:text-slate-500">Lädt...</p>
  }

  const { timeGridSlots, timetableSlots } = data

  if (timeGridSlots.length === 0) {
    return (
      <p className="rounded-lg bg-white p-4 text-slate-400 shadow-sm dark:bg-slate-800 dark:text-slate-500">
        Lege zuerst unten ein Zeitraster an.
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
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr>
            <th className="w-28 border-b border-slate-200 pb-2 text-left text-slate-500 dark:border-slate-700 dark:text-slate-400">
              Zeit
            </th>
            {WEEKDAYS.map((day) => (
              <th
                key={day.value}
                className="border-b border-slate-200 pb-2 text-left text-slate-500 dark:border-slate-700 dark:text-slate-400"
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
                  <td className="px-2 py-1 text-xs text-slate-400 dark:text-slate-500">
                    {slot.startTime}–{slot.endTime}
                  </td>
                  <td
                    colSpan={WEEKDAYS.length}
                    className="px-2 py-1 text-center text-xs text-slate-400 dark:text-slate-500"
                  >
                    {slot.label}
                  </td>
                </tr>
              )
            }

            return (
              <tr key={slot.id} className="border-b border-slate-100 dark:border-slate-700">
                <td className="px-2 py-2 align-top text-xs text-slate-500 dark:text-slate-400">
                  <div>{slot.label}</div>
                  <div>
                    {slot.startTime}–{slot.endTime}
                  </div>
                </td>
                {WEEKDAYS.map((day) => {
                  const cell = findCell(day.value, slot.id)
                  const cellColor = cell?.subject?.color
                  return (
                    <td key={day.value} className="px-2 py-2 align-top">
                      <select
                        value={cell?.subjectId ?? ''}
                        onChange={(e) =>
                          void setCell.mutateAsync({
                            weekday: day.value,
                            timeGridSlotId: slot.id,
                            subjectId: e.target.value || null,
                          })
                        }
                        className={
                          cellColor
                            ? 'w-full rounded border px-2 py-1 text-sm'
                            : 'w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-800 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100'
                        }
                        style={
                          cellColor
                            ? {
                                borderColor: cellColor,
                                backgroundColor: cellColor,
                                color: getContrastTextColor(cellColor),
                              }
                            : undefined
                        }
                      >
                        <option value="">–</option>
                        {(subjects ?? []).map((subject) => (
                          <option
                            key={subject.id}
                            value={subject.id}
                            style={{
                              backgroundColor: subject.color,
                              color: getContrastTextColor(subject.color),
                            }}
                          >
                            {subject.name}
                          </option>
                        ))}
                      </select>
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
