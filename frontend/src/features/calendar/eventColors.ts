import type { CalendarEventDto, CalendarEventType } from './types'

export const TYPE_LABELS: Record<CalendarEventType, string> = {
  MANUAL: 'Termin',
  EXAM: 'Klausur',
  HOLIDAY: 'Ferien',
  PUBLIC_HOLIDAY: 'Feiertag',
}

export const TYPE_COLORS: Record<CalendarEventType, string> = {
  MANUAL: '#3B82F6',
  EXAM: '#EF4444',
  HOLIDAY: '#22C55E',
  PUBLIC_HOLIDAY: '#F59E0B',
}

/** An explicit event color always wins; otherwise an exam defaults to its
 * subject's color, and everything else falls back to its type's color. */
export function getEffectiveColor(event: CalendarEventDto): string {
  if (event.color) return event.color
  if (event.type === 'EXAM' && event.subject) return event.subject.color
  return TYPE_COLORS[event.type]
}
