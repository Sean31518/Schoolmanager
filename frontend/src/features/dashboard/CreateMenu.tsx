import { useState } from 'react'
import { useCreateGeneralNote } from '../generalNotes/hooks'
import { CreateHausaufgabeModal } from './CreateHausaufgabeModal'
import { CreateTerminModal } from './CreateTerminModal'

export function CreateMenu() {
  const createNote = useCreateGeneralNote()
  const [modal, setModal] = useState<'termin' | 'hausaufgabe' | null>(null)

  return (
    <>
      <div className="group relative">
        <button
          type="button"
          title="Neu erstellen"
          className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-text-secondary hover:border-text-disabled hover:text-text-primary"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3.5 w-3.5"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
        <div className="invisible absolute right-0 top-full z-20 w-40 rounded-lg border border-border bg-bg-2 p-1.5 opacity-0 shadow-lg transition-opacity group-hover:visible group-hover:opacity-100">
          <button
            type="button"
            onClick={() =>
              void createNote.mutateAsync({ contentJson: { type: 'doc', content: [] } })
            }
            className="block w-full rounded-md px-2.5 py-1.5 text-left text-xs text-text-secondary hover:bg-bg-hover"
          >
            Notiz
          </button>
          <button
            type="button"
            onClick={() => setModal('termin')}
            className="block w-full rounded-md px-2.5 py-1.5 text-left text-xs text-text-secondary hover:bg-bg-hover"
          >
            Termin
          </button>
          <button
            type="button"
            onClick={() => setModal('hausaufgabe')}
            className="block w-full rounded-md px-2.5 py-1.5 text-left text-xs text-text-secondary hover:bg-bg-hover"
          >
            Hausaufgabe
          </button>
        </div>
      </div>
      {modal === 'termin' && <CreateTerminModal onClose={() => setModal(null)} />}
      {modal === 'hausaufgabe' && <CreateHausaufgabeModal onClose={() => setModal(null)} />}
    </>
  )
}
