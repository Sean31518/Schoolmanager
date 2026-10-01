import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { EventEditModal } from '../calendar/EventEditModal'
import { useExams, useUpdateCalendarEvent } from '../calendar/hooks'
import { SubjectDecks } from '../flashcards/SubjectDecks'
import { LinkChips } from '../hefte/HeftLinks'
import { linksToDrafts } from '../hefte/links'
import { HeftPickerModal } from '../hefte/HeftPickerModal'
import { toLinkInputs, type DraftLink } from '../hefte/types'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

/** A Klausur: its Lernstoff (Hefte and page ranges) and the Fach's
 * Karteikarten-Stapel. */
export function ExamPage() {
  const { eventId } = useParams()
  const { data: exams, isLoading } = useExams()
  const updateEvent = useUpdateCalendarEvent()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const exam = exams?.find((e) => e.id === eventId)

  if (isLoading) return <p className="text-text-tertiary">Lädt...</p>
  if (!exam) return <p className="text-text-tertiary">Klausur nicht gefunden.</p>

  function saveLinks(links: DraftLink[]) {
    updateEvent.mutate({ id: exam!.id, data: { links: toLinkInputs(links) } })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link to="/exams" className="text-xs text-text-tertiary hover:text-text-secondary">
            ← Klausuren
          </Link>
          <h1 className="mt-1 flex items-center gap-2 text-[15px] font-semibold text-text-primary">
            {exam.subject && (
              <span className="h-[9px] w-[9px] shrink-0 rounded-[2px]" style={{ backgroundColor: exam.subject.color }} />
            )}
            {exam.title}
          </h1>
          <p className="mt-0.5 text-sm text-text-tertiary">
            {formatDate(exam.startDate)}
            {exam.startTime && `, ${exam.startTime} Uhr`}
            {exam.subject && ` · ${exam.subject.name}`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded-md border border-border px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-hover"
        >
          Bearbeiten
        </button>
      </div>

      <section>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[13px] font-semibold text-text-primary">Lernstoff</h2>
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-ink"
          >
            + Heft / Seiten
          </button>
        </div>
        {exam.links.length === 0 ? (
          <p className="mt-2 text-sm text-text-tertiary">
            Noch kein Lernstoff. Verknüpfe ganze Hefte oder einzelne Seiten aus Goodnotes.
          </p>
        ) : (
          <LinkChips
            links={exam.links}
            className="mt-3"
            onRemove={(linkId) => saveLinks(linksToDrafts(exam.links).filter((l) => l.id !== linkId))}
          />
        )}
      </section>

      {exam.subject && (
        <section>
          <h2 className="text-[13px] font-semibold text-text-primary">Karteikarten · {exam.subject.name}</h2>
          <div className="mt-2">
            <SubjectDecks subjectId={exam.subject.id} />
          </div>
        </section>
      )}

      {pickerOpen && (
        <HeftPickerModal
          subjectId={exam.subjectId}
          onClose={() => setPickerOpen(false)}
          onPick={(link) => {
            setPickerOpen(false)
            saveLinks([...linksToDrafts(exam.links), link])
          }}
        />
      )}
      {editing && <EventEditModal event={exam} onClose={() => setEditing(false)} />}
    </div>
  )
}
