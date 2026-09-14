export interface HomeworkDto {
  id: string
  title: string
  subjectId: string | null
  subject: { id: string; name: string; color: string } | null
  dueDate: string | null
  done: boolean
  note: string | null
}
