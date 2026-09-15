import { useState, type FormEvent } from 'react'
import {
  useCreateFlashcard,
  useDeleteFlashcard,
  useFlashcards,
  useUpdateFlashcard,
} from './hooks'
import type { FlashcardDto } from './types'

export function FlashcardManager({
  topicId,
  topicName,
  subjectColor,
}: {
  topicId: string
  topicName: string
  subjectColor: string
}) {
  const { data: cards, isLoading } = useFlashcards(topicId)
  const createCard = useCreateFlashcard(topicId)
  const [open, setOpen] = useState(false)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    if (!question.trim() || !answer.trim()) return
    await createCard.mutateAsync({ question: question.trim(), answer: answer.trim() })
    setQuestion('')
    setAnswer('')
  }

  const known = (cards ?? []).filter((c) => c.state === 'KNOWN').length

  return (
    <div className="rounded-lg border border-border bg-bg-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left"
      >
        <span
          className="h-[7px] w-[7px] shrink-0 rounded-[2px]"
          style={{ backgroundColor: subjectColor }}
        />
        <span className="flex-1 truncate text-sm font-semibold text-text-primary">
          {topicName}
        </span>
        <span className="font-mono text-[10px] text-text-tertiary">
          {isLoading ? '…' : `${known}/${cards?.length ?? 0} KARTEN`}
        </span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`h-3 w-3 shrink-0 text-text-muted transition-transform ${open ? 'rotate-90' : ''}`}
        >
          <path d="m9 18 6-6-6-6" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-border-subtle p-3">
          <div className="space-y-2">
            {(cards ?? []).map((card) => (
              <FlashcardRow key={card.id} topicId={topicId} card={card} />
            ))}
            {!isLoading && (cards?.length ?? 0) === 0 && (
              <p className="text-xs text-text-tertiary">
                Noch keine Karteikarten für dieses Thema.
              </p>
            )}
          </div>

          <form onSubmit={handleAdd} className="mt-3 flex flex-wrap items-end gap-2">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Frage"
              className="min-w-[160px] flex-1 rounded-md border border-border bg-bg-muted px-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-muted"
            />
            <input
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Antwort"
              className="min-w-[160px] flex-1 rounded-md border border-border bg-bg-muted px-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-muted"
            />
            <button
              type="submit"
              className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-ink"
            >
              Hinzufügen
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

function FlashcardRow({ topicId, card }: { topicId: string; card: FlashcardDto }) {
  const updateCard = useUpdateFlashcard(topicId)
  const deleteCard = useDeleteFlashcard(topicId)
  const [editing, setEditing] = useState(false)
  const [question, setQuestion] = useState(card.question)
  const [answer, setAnswer] = useState(card.answer)

  async function save() {
    await updateCard.mutateAsync({ id: card.id, data: { question, answer } })
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="flex flex-wrap items-end gap-2 rounded-md border border-border-subtle p-2">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          className="min-w-[140px] flex-1 rounded-md border border-border bg-bg-muted px-2 py-1 text-xs text-text-primary"
        />
        <input
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          className="min-w-[140px] flex-1 rounded-md border border-border bg-bg-muted px-2 py-1 text-xs text-text-primary"
        />
        <button
          onClick={() => void save()}
          className="rounded-md bg-accent px-2 py-1 text-xs font-semibold text-accent-ink"
        >
          Speichern
        </button>
        <button
          onClick={() => setEditing(false)}
          className="rounded-md border border-border px-2 py-1 text-xs text-text-secondary"
        >
          Abbrechen
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-2 rounded-md border border-border-subtle p-2">
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-medium text-text-primary">{card.question}</div>
        <div className="truncate text-xs text-text-tertiary">{card.answer}</div>
      </div>
      <span
        className={`shrink-0 rounded-[4px] px-1.5 py-px font-mono text-[9px] ${
          card.state === 'KNOWN'
            ? 'bg-accent/15 text-accent'
            : 'bg-bg-hover text-text-tertiary'
        }`}
      >
        {card.state === 'KNOWN' ? 'GEWUSST' : card.state === 'LEARNING' ? 'ÜBEN' : 'NEU'}
      </span>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="shrink-0 text-xs text-text-muted hover:text-text-primary"
      >
        Bearbeiten
      </button>
      <button
        type="button"
        onClick={() => void deleteCard.mutateAsync(card.id)}
        className="shrink-0 text-xs text-text-muted hover:text-red-400"
      >
        ×
      </button>
    </div>
  )
}
