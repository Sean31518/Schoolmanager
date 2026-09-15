import { useSubjects } from '../subjects/hooks'
import { useSetTimetableCell, useTimetable } from './hooks'
import { SubjectDropdown } from './SubjectDropdown'

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
      <p className="text-slate-400 dark:text-slate-500">
        Lege zuerst oben ein Zeitraster an.
      </p>
    )
  }

  function findCell(weekday: string, timeGridSlotId: string) {
    return timetableSlots.find(
      (s) => s.weekday === weekday && s.timeGridSlotId === timeGridSlotId,
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-sm">
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
                  return (
                    <td
                      key={day.value}
                      className="border border-slate-200 p-0 align-top dark:border-slate-700"
                    >
                      <SubjectDropdown
                        value={cell?.subjectId ?? ''}
                        subjects={subjects ?? []}
                        onChange={(subjectId) =>
                          void setCell.mutateAsync({
                            weekday: day.value,
                            timeGridSlotId: slot.id,
                            subjectId,
                          })
                        }
                      />
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
