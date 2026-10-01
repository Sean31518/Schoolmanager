import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { LinkChips, LinkEditor } from '../hefte/HeftLinks'
import { linksToDrafts } from '../hefte/links'
import { toLinkInputs, type DraftLink } from '../hefte/types'
import {
  useCreateFlashcard,
  useDeck,
  useDeleteDeck,
  useDeleteFlashcard,
  useReviewFlashcard,
  useUpdateDeck,
  useUpdateFlashcard,
} from './hooks'
import type { DeckDetailDto, FlashcardDto } from './types'

const inputClass =
  'block w-full rounded-md border border-border bg-bg-muted px-2.5 py-1.5 text-sm text-text-primary placeholder:text-text-muted'

export function DeckPage() {
  const { deckId } = useParams()
  const { data: deck, isLoading } = useDeck(deckId)
  const [learning, setLearning] = useState(false)

  if (isLoading) return <p className="text-text-tertiary">Lädt...</p>
  if (!deck) return <p className="text-text-tertiary">Stapel nicht gefunden.</p>

  return (
    <div className="space-y-5">
      <DeckHeader deck={deck} learning={learning} onToggleLearning={() => setLearning((v) => !v)} />
      {learning ? (
        <LearnMode deck={deck} onDone={() => setLearning(false)} />
      ) : (
        <>
          <NewCardForm deck={deck} />
          <ul className="space-y-2">
            {deck.flashcards.map((card) => (
              <CardRow key={card.id} card={card} subjectId={deck.subjectId} />
            ))}
          </ul>
          {deck.flashcards.length === 0 && <p className="text-sm text-text-tertiary">Noch keine Karten in diesem Stapel.</p>}
        </>
      )}
    </div>
  )
}

function DeckHeader({
  deck,
  learning,
  onToggleLearning,
}: {
  deck: DeckDetailDto
  learning: boolean
  onToggleLearning: () => void
}) {
  const updateDeck = useUpdateDeck()
  const deleteDeck = useDeleteDeck()
  const navigate = useNavigate()
  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState(deck.name)
  const known = deck.flashcards.filter((c) => c.state === 'KNOWN').length

  function commitRename() {
    setRenaming(false)
    const trimmed = name.trim()
    if (trimmed && trimmed !== deck.name) updateDeck.mutate({ deckId: deck.id, data: { name: trimmed } })
    else setName(deck.name)
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Link
        to={`/subjects/${deck.subject.id}`}
        className="flex items-center gap-1.5 text-xs text-text-tertiary hover:text-text-secondary"
      >
        <span className="h-2 w-2 rounded-[2px]" style={{ backgroundColor: deck.subject.color }} />
        {deck.subject.name}
      </Link>
      {renaming ? (
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitRename()
            if (e.key === 'Escape') {
              setName(deck.name)
              setRenaming(false)
            }
          }}
          className="min-w-0 flex-1 rounded-md border border-border bg-bg-muted px-2 py-0.5 text-[15px] font-semibold text-text-primary"
        />
      ) : (
        <button
          type="button"
          onClick={() => setRenaming(true)}
          title="Umbenennen"
          className="min-w-0 flex-1 truncate text-left text-[15px] font-semibold text-text-primary"
        >
          {deck.name}
        </button>
      )}
      <span className="font-mono text-[10px] text-text-tertiary">
        {known}/{deck.flashcards.length} GEWUSST
      </span>
      <button
        type="button"
        disabled={deck.flashcards.length === 0}
        onClick={onToggleLearning}
        className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-ink disabled:opacity-40"
      >
        {learning ? 'Karten bearbeiten' : 'Lernen'}
      </button>
      <button
        type="button"
        onClick={() => {
          if (confirm(`Stapel "${deck.name}" mit allen Karten löschen?`)) {
            void deleteDeck.mutateAsync(deck.id).then(() => navigate(`/subjects/${deck.subject.id}`))
          }
        }}
        className="text-xs text-text-muted hover:text-red-400"
      >
        Löschen
      </button>
    </div>
  )
}

function NewCardForm({ deck }: { deck: DeckDetailDto }) {
  const createCard = useCreateFlashcard()
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [links, setLinks] = useState<DraftLink[]>([])

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    if (!question.trim() || !answer.trim()) return
    await createCard.mutateAsync({
      deckId: deck.id,
      data: { question: question.trim(), answer: answer.trim(), links: toLinkInputs(links) },
    })
    setQuestion('')
    setAnswer('')
    setLinks([])
  }

  return (
    <form onSubmit={(e) => void handleAdd(e)} className="space-y-2 rounded-lg border border-border bg-bg-1 p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <textarea value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Frage" rows={2} className={inputClass} />
        <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Antwort" rows={2} className={inputClass} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <LinkEditor value={links} onChange={setLinks} subjectId={deck.subjectId} />
        <button
          type="submit"
          disabled={createCard.isPending}
          className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-ink disabled:opacity-50"
        >
          Karte hinzufügen
        </button>
      </div>
    </form>
  )
}

function CardRow({ card, subjectId }: { card: FlashcardDto; subjectId: string }) {
  const updateCard = useUpdateFlashcard()
  const deleteCard = useDeleteFlashcard()
  const [editing, setEditing] = useState(false)
  const [question, setQuestion] = useState(card.question)
  const [answer, setAnswer] = useState(card.answer)
  const [links, setLinks] = useState<DraftLink[]>(() => linksToDrafts(card.links))

  function startEditing() {
    setQuestion(card.question)
    setAnswer(card.answer)
    setLinks(linksToDrafts(card.links))
    setEditing(true)
  }

  async function save() {
    await updateCard.mutateAsync({
      id: card.id,
      data: { question: question.trim(), answer: answer.trim(), links: toLinkInputs(links) },
    })
    setEditing(false)
  }

  if (editing) {
    return (
      <li className="space-y-2 rounded-md border border-border p-2.5">
        <div className="grid gap-2 sm:grid-cols-2">
          <textarea value={question} onChange={(e) => setQuestion(e.target.value)} rows={2} className={inputClass} />
          <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} rows={2} className={inputClass} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <LinkEditor value={links} onChange={setLinks} subjectId={subjectId} />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void save()}
              disabled={!question.trim() || !answer.trim()}
              className="rounded-md bg-accent px-2.5 py-1 text-xs font-semibold text-accent-ink disabled:opacity-50"
            >
              Speichern
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-md border border-border px-2.5 py-1 text-xs text-text-secondary"
            >
              Abbrechen
            </button>
          </div>
        </div>
      </li>
    )
  }

  return (
    <li className="rounded-md border border-border-subtle p-2.5">
      <div className="flex items-start gap-2">
        <button type="button" onClick={startEditing} className="min-w-0 flex-1 text-left" title="Bearbeiten">
          <div className="whitespace-pre-wrap text-sm font-medium text-text-primary">{card.question}</div>
          <div className="mt-0.5 whitespace-pre-wrap text-xs text-text-tertiary">{card.answer}</div>
        </button>
        <span
          className={`shrink-0 rounded-[4px] px-1.5 py-px font-mono text-[9px] ${
            card.state === 'KNOWN' ? 'bg-accent/15 text-accent-text' : 'bg-bg-hover text-text-tertiary'
          }`}
        >
          {card.state === 'KNOWN' ? 'GEWUSST' : card.state === 'LEARNING' ? 'ÜBEN' : 'NEU'}
        </span>
        <button
          type="button"
          onClick={() => void deleteCard.mutateAsync(card.id)}
          title="Karte löschen"
          className="shrink-0 text-xs text-text-muted hover:text-red-400"
        >
          ×
        </button>
      </div>
      <LinkChips links={card.links} className="mt-1.5" />
    </li>
  )
}

function LearnMode({ deck, onDone }: { deck: DeckDetailDto; onDone: () => void }) {
  const review = useReviewFlashcard()
  // Unknown cards first; if everything is known already, go through all.
  const [queue, setQueue] = useState(() => {
    const open = deck.flashcards.filter((c) => c.state !== 'KNOWN').map((c) => c.id)
    return open.length > 0 ? open : deck.flashcards.map((c) => c.id)
  })
  const [revealed, setRevealed] = useState(false)
  const card = deck.flashcards.find((c) => c.id === queue[0])

  async function answer(result: 'known' | 'again') {
    if (!card) return
    setRevealed(false)
    setQueue((q) => (result === 'known' ? q.slice(1) : [...q.slice(1), card.id]))
    await review.mutateAsync({ id: card.id, result })
  }

  if (!card) {
    return (
      <div className="rounded-lg border border-border bg-bg-1 p-6 text-center">
        <p className="text-sm font-semibold text-text-primary">Geschafft - alle Karten gewusst.</p>
        <button type="button" onClick={onDone} className="mt-3 text-xs text-accent-text hover:underline">
          Zurück zum Stapel
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-xl space-y-3">
      <p className="text-center font-mono text-[10px] tracking-wider text-text-tertiary">NOCH {queue.length}</p>
      <button
        type="button"
        onClick={() => setRevealed(true)}
        className="block min-h-[180px] w-full rounded-lg border border-border bg-bg-1 p-5 text-left"
      >
        <div className="whitespace-pre-wrap text-[15px] font-semibold text-text-primary">{card.question}</div>
        {revealed ? (
          <div className="mt-4 whitespace-pre-wrap border-t border-border-subtle pt-4 text-sm text-text-secondary">
            {card.answer}
          </div>
        ) : (
          <div className="mt-6 text-xs text-text-muted">Tippen zum Aufdecken</div>
        )}
      </button>
      {revealed && <LinkChips links={card.links} />}
      {revealed && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void answer('again')}
            className="flex-1 rounded-md border border-border py-2 text-sm text-text-secondary hover:bg-bg-hover"
          >
            Nochmal
          </button>
          <button
            type="button"
            onClick={() => void answer('known')}
            className="flex-1 rounded-md bg-accent py-2 text-sm font-semibold text-accent-ink"
          >
            Gewusst
          </button>
        </div>
      )}
    </div>
  )
}
