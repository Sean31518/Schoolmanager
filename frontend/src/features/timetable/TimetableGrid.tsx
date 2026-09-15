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
    return <p className="text-text-tertiary">Lädt...</p>
  }

  const { timeGridSlots, timetableSlots } = data

  if (timeGridSlots.length === 0) {
    return <p className="text-text-tertiary">Lege zuerst oben ein Zeitraster an.</p>
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
            <th className="w-28 border-b border-border pb-2 text-left font-mono text-[10px] font-medium tracking-wider text-text-muted">
              ZEIT
            </th>
            {WEEKDAYS.map((day) => (
              <th
                key={day.value}
                className="border-b border-border pb-2 text-left font-mono text-[10px] font-medium tracking-wider text-text-muted"
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
                <tr key={slot.id} className="bg-bg-muted">
                  <td className="border border-border-subtle px-2 py-1 font-mono text-[10px] text-text-muted">
                    {slot.startTime}–{slot.endTime}
                  </td>
                  <td
                    colSpan={WEEKDAYS.length}
                    className="border border-border-subtle px-2 py-1 text-center font-mono text-[10px] tracking-wider text-text-muted"
                  >
                    {slot.label}
                  </td>
                </tr>
              )
            }

            return (
              <tr key={slot.id}>
                <td className="border border-border-subtle px-2 py-2 align-top text-xs text-text-secondary">
                  <div>{slot.label}</div>
                  <div className="font-mono text-[10px] text-text-muted">
                    {slot.startTime}–{slot.endTime}
                  </div>
                </td>
                {WEEKDAYS.map((day) => {
                  const cell = findCell(day.value, slot.id)
                  return (
                    <td key={day.value} className="border border-border-subtle p-0 align-top">
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
