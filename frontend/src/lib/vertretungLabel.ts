/** One label for a Vertretung across the timetable grid, dashboard widget,
 * and detail modal, so all three "clearly distinguish" the same way: a
 * complete cancellation always wins, otherwise the label names whichever of
 * room/teacher actually changed (both at once falls back to the generic
 * "VERTRETUNG", same as when neither could be determined, e.g. a pure
 * Fachwechsel). */
export function vertretungLabel(cancelled: boolean, roomChanged: boolean, teacherChanged: boolean): string {
  if (cancelled) return 'ENTFÄLLT'
  if (roomChanged && !teacherChanged) return 'RAUMWECHSEL'
  if (teacherChanged && !roomChanged) return 'LEHRERWECHSEL'
  return 'VERTRETUNG'
}
