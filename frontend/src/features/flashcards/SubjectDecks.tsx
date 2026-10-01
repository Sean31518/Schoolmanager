import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useCreateDeck, useDecks } from './hooks'

/** The Karteikarten-Stapel of one Fach, plus creating a new one. */
export function SubjectDecks({ subjectId }: { subjectId: string }) {
  const { data: decks, isLoading } = useDecks(subjectId)
  const createDeck = useCreateDeck()
  const [name, setName] = useState('')

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    await createDeck.mutateAsync({ subjectId, name: name.trim() })
    setName('')
  }

  return (
    <div className="space-y-2">
      {isLoading && <p className="text-sm text-text-tertiary">Lädt...</p>}
      {(decks ?? []).length > 0 && (
        <ul className="divide-y divide-border-subtle rounded-lg border border-border bg-bg-1">
          {(decks ?? []).map((deck) => (
            <li key={deck.id}>
              <Link to={`/decks/${deck.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-bg-hover/60">
                <span className="min-w-0 flex-1 truncate text-sm text-text-primary">{deck.name}</span>
                <span className="font-mono text-[10px] text-text-tertiary">
                  {deck.knownCount}/{deck.cardCount} GEWUSST
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={(e) => void handleCreate(e)} className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Neuer Stapel, z. B. Vokabeln Lektion 3"
          className="min-w-0 flex-1 rounded-md border border-border bg-bg-muted px-2.5 py-1.5 text-sm text-text-primary placeholder:text-text-muted"
        />
        <button
          type="submit"
          disabled={!name.trim() || createDeck.isPending}
          className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-ink disabled:opacity-40"
        >
          Anlegen
        </button>
      </form>
    </div>
  )
}
