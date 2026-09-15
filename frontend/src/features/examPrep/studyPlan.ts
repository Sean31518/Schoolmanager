export interface StudyPlanTopic {
  topicId: string
  topicName: string
  cardsRemaining: number
}

export interface StudyPlanDay {
  dayOffset: number
  topics: StudyPlanTopic[]
  minutes: number
}

/** Spreads not-yet-mastered topics evenly across the days left until the
 * exam (round-robin), estimating ~8 min per remaining flashcard (floor 20
 * min/topic/day) - a rough plan, not a scheduling optimizer. */
export function buildStudyPlan(remaining: StudyPlanTopic[], daysLeft: number): StudyPlanDay[] {
  if (remaining.length === 0 || daysLeft <= 0) return []

  const dayCount = Math.min(Math.max(1, daysLeft), remaining.length)
  const days: StudyPlanDay[] = Array.from({ length: dayCount }, (_, i) => ({
    dayOffset: i,
    topics: [],
    minutes: 0,
  }))

  remaining.forEach((topic, i) => {
    const day = days[i % dayCount]
    day.topics.push(topic)
    day.minutes += Math.max(20, topic.cardsRemaining * 8)
  })

  return days
}

export function formatDayOffset(dayOffset: number): string {
  if (dayOffset === 0) return 'HEUTE'
  if (dayOffset === 1) return 'MORGEN'
  const date = new Date()
  date.setDate(date.getDate() + dayOffset)
  return date.toLocaleDateString('de-DE', { weekday: 'short' }).toUpperCase().replace('.', '')
}
