import { useState } from 'react'
import { vertretungLabel } from '../../lib/vertretungLabel'
import { LessonDetailModal, type LessonDetailData } from '../timetable/LessonDetailModal'
import type { TimetableSlotSummaryDto } from './types'

function isNowWithin(startTime: string, endTime: string) {
  const now = new Date()
  const minutesNow = now.getHours() * 60 + now.getMinutes()
  const [startH, startM] = startTime.split(':').map(Number)
  const [endH, endM] = endTime.split(':').map(Number)
  return minutesNow >= startH * 60 + startM && minutesNow < endH * 60 + endM
}

interface MergedSlot extends TimetableSlotSummaryDto {
  /** How many original periods this row represents — 2+ for a Doppelstunde. */
  periodCount: number
}

/** Consecutive same-subject lessons ("Doppelstunden") collapse into a single
 * row spanning the combined time range, matching how the main Stundenplan
 * grid merges them. Subject names are unique per user, so comparing by name
 * is equivalent to comparing by subject id here. Consecutive Freistunden
 * (empty LESSON slots) merge the same way, so two free periods back to back
 * end up exactly as tall as a Doppelstunde would. */
function mergeDoppelstunden(slots: TimetableSlotSummaryDto[]): MergedSlot[] {
  const merged: MergedSlot[] = []
  for (const slot of slots) {
    const prev = merged[merged.length - 1]
    const sameLesson =
      prev &&
      prev.type === 'LESSON' &&
      slot.type === 'LESSON' &&
      prev.subjectName &&
      prev.subjectName === slot.subjectName &&
      prev.vertretung === slot.vertretung &&
      prev.substituteRoom === slot.substituteRoom &&
      prev.substituteTeacherName === slot.substituteTeacherName
    const bothFree =
      prev && prev.type === 'LESSON' && slot.type === 'LESSON' && !prev.subjectName && !slot.subjectName
    if (sameLesson || bothFree) {
      merged[merged.length - 1] = { ...prev, endTime: slot.endTime, periodCount: prev.periodCount + 1 }
      continue
    }
    merged.push({ ...slot, periodCount: 1 })
  }
  return merged
}

/** Once nothing but free periods remains until the end of the day, there's
 * nothing left worth showing — a Freistunde only matters as a gap between
 * two things that are still coming up. */
function trimTrailingFree(slots: MergedSlot[]): MergedSlot[] {
  let end = slots.length
  while (end > 0 && slots[end - 1].type === 'LESSON' && !slots[end - 1].subjectName) {
    end--
  }
  return slots.slice(0, end)
}

const JetztBadge = () => (
  <span className="shrink-0 rounded-[3px] bg-accent px-[5px] py-px font-mono text-[9px] font-semibold tracking-wider text-accent-ink">
    JETZT
  </span>
)

const VertretungBadge = ({
  cancelled,
  roomChanged,
  teacherChanged,
}: {
  cancelled: boolean
  roomChanged: boolean
  teacherChanged: boolean
}) => (
  <span
    className={`shrink-0 rounded-[3px] px-[5px] py-px font-mono text-[9px] font-semibold tracking-wider ${
      cancelled ? 'bg-red-400/20 text-red-400' : 'bg-accent/20 text-accent-text'
    }`}
  >
    {vertretungLabel(cancelled, roomChanged, teacherChanged)}
  </span>
)

function SlotRow({ slot, isNow, onClick }: { slot: MergedSlot; isNow: boolean; onClick?: () => void }) {
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
        {isNow && <JetztBadge />}
      </div>
    )
  }

  // Freistunde: no text, no border — just a gap the same height a lesson of
  // the same length would take up, so a Doppel-Freistunde reads as clearly
  // longer than a single one. JETZT still shows if it's the current period.
  if (!slot.subjectName) {
    return (
      <div
        className={`flex items-center justify-end pr-2 ${isNow ? 'ml-1.5' : ''}`}
        style={{ minHeight: `${slot.periodCount * 2.25}rem` }}
      >
        {isNow && <JetztBadge />}
      </div>
    )
  }

  const cancelled = slot.vertretung === 'CANCELLED'
  const roomChanged = Boolean(slot.substituteRoom)
  const teacherChanged = Boolean(slot.substituteTeacherName)
  // An IServ-sourced lesson not yet linked to a local Subject has no color
  // of its own - falls back to neutral gray rather than rendering with no
  // visible border at all (an unstyled "null" CSS value would do that).
  const color = cancelled ? '#ef4444' : (slot.subjectColor ?? '#71717a')

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full flex-col justify-center gap-1 rounded-[5px] px-2.5 py-1.5 text-left ${
        cancelled ? 'bg-red-500/30' : 'bg-bg-3 hover:bg-bg-hover'
      } ${isNow ? 'ml-1.5' : ''}`}
      style={{ borderLeft: `4px solid ${color}`, minHeight: `${slot.periodCount * 2.25}rem` }}
    >
      <span className="flex items-center gap-2.5">
        <span className="w-9 shrink-0 font-mono text-[10px] text-text-tertiary">
          {slot.startTime}
        </span>
        <span
          className={`flex-1 truncate text-xs font-semibold ${
            cancelled ? 'text-text-muted line-through' : 'text-text-primary'
          }`}
        >
          {slot.subjectName}
          {roomChanged && (
            <span className="ml-1.5 font-mono text-[10px] font-normal text-text-tertiary">
              <span className="line-through opacity-60">{slot.room}</span> {slot.substituteRoom}
            </span>
          )}
          {teacherChanged && (
            <span className="ml-1.5 font-mono text-[10px] font-normal text-text-tertiary">
              <span className="line-through opacity-60">{slot.teacherName}</span> {slot.substituteTeacherName}
            </span>
          )}
        </span>
        {slot.vertretung && (
          <VertretungBadge cancelled={cancelled} roomChanged={roomChanged} teacherChanged={teacherChanged} />
        )}
        {isNow && <JetztBadge />}
      </span>
    </button>
  )
}

export function TodayTomorrowWidget({
  today,
  tomorrow,
  todayLabel,
  tomorrowLabel,
}: {
  today: TimetableSlotSummaryDto[]
  tomorrow: TimetableSlotSummaryDto[]
  todayLabel: string
  tomorrowLabel: string
}) {
  const [view, setView] = useState<'today' | 'tomorrow'>('today')
  const [selected, setSelected] = useState<MergedSlot | null>(null)
  const slots = trimTrailingFree(mergeDoppelstunden(view === 'today' ? today : tomorrow))
  const label = view === 'today' ? todayLabel : tomorrowLabel
  // JETZT only makes sense while actually looking at the real today (backend
  // says so via todayLabel — on a weekend it's "MONTAG" etc. instead of
  // "HEUTE", since dayA/dayB have rolled forward to the next weekday).
  const isRealToday = view === 'today' && todayLabel === 'HEUTE'

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
          {label} ⇄
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
              isNow={isRealToday && isNowWithin(slot.startTime, slot.endTime)}
              onClick={slot.subjectName ? () => setSelected(slot) : undefined}
            />
          ))}
        </div>
      )}
      {selected && (
        <LessonDetailModal lesson={toLessonDetail(selected, label)} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}

function toLessonDetail(slot: MergedSlot, dayLabel: string): LessonDetailData {
  return {
    subjectName: slot.subjectName ?? '',
    subjectColor: slot.subjectColor,
    subjectId: slot.subjectId,
    rawSubjectCode: slot.rawSubjectCode,
    dayLabel,
    startTime: slot.startTime,
    endTime: slot.endTime,
    room: slot.room ?? null,
    substituteRoom: slot.substituteRoom ?? null,
    teacherName: slot.teacherName ?? null,
    substituteTeacherName: slot.substituteTeacherName ?? null,
    courseName: slot.courseName ?? null,
    vertretung: slot.vertretung,
  }
}
