import { TimeGridEditor } from './TimeGridEditor'
import { TimetableGrid } from './TimetableGrid'

export function TimetablePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-800">Stundenplan</h1>
      <TimetableGrid />
      <TimeGridEditor />
    </div>
  )
}
