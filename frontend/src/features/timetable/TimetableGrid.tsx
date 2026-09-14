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
    return <p className="text-slate-400">Lädt...</p>
  }

  const { timeGridSlots, timetableSlots } = data

  if (timeGridSlots.length === 0) {
    return (
      <p className="rounded-lg bg-white p-4 text-slate-400 shadow-sm">
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
    <div className="overflow-x-auto rounded-lg bg-white p-4 shadow-sm">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr>
            <th className="w-28 border-b border-slate-200 pb-2 text-left text-slate-500">
              Zeit
            </th>
            {WEEKDAYS.map((day) => (
              <th
                key={day.value}
                className="border-b border-slate-200 pb-2 text-left text-slate-500"
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
                <tr key={slot.id} className="bg-slate-50">
                  <td className="px-2 py-1 text-xs text-slate-400">
                    {slot.startTime}–{slot.endTime}
                  </td>
                  <td
                    colSpan={WEEKDAYS.length}
                    className="px-2 py-1 text-center text-xs text-slate-400"
                  >
                    {slot.label}
                  </td>
                </tr>
              )
            }

            return (
              <tr key={slot.id} className="border-b border-slate-100">
                <td className="px-2 py-2 align-top text-xs text-slate-500">
                  <div>{slot.label}</div>
                  <div>
                    {slot.startTime}–{slot.endTime}
                  </div>
                </td>
                {WEEKDAYS.map((day) => {
                  const cell = findCell(day.value, slot.id)
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
                        className="w-full rounded border px-2 py-1 text-sm"
                        style={{ borderColor: cell?.subject?.color ?? '#cbd5e1' }}
                      >
                        <option value="">–</option>
                        {(subjects ?? []).map((subject) => (
                          <option key={subject.id} value={subject.id}>
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
