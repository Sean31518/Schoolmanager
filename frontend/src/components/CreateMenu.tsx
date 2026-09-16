import { useState } from 'react'
import { useCreateGeneralNote } from '../features/generalNotes/hooks'
import { CreateHausaufgabeModal } from './CreateHausaufgabeModal'
import { CreateTerminModal } from './CreateTerminModal'

function MenuIcon({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[14px] w-[14px] shrink-0 text-text-tertiary"
    >
      {children}
    </svg>
  )
}

export function CreateMenu() {
  const createNote = useCreateGeneralNote()
  const [modal, setModal] = useState<'termin' | 'hausaufgabe' | null>(null)

  return (
    <>
      <div className="group relative">
        <button
          type="button"
          title="Neu erstellen"
          className="flex h-[30px] w-[30px] items-center justify-center rounded-md bg-accent text-accent-ink hover:bg-accent-hover"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-[15px] w-[15px]"
          >
            <path d="M5 12h14" />
            <path d="M12 5v14" />
          </svg>
        </button>
        {/* Padding-top (not margin) bridges the gap to the button above so the
            pointer never leaves a hoverable box while moving from the button
            down into the menu — a margin gap there would drop group-hover
            mid-crossing and close the menu before it could be clicked. */}
        <div className="invisible absolute right-0 top-full z-20 w-44 pt-1.5 opacity-0 transition-opacity group-hover:visible group-hover:opacity-100">
          <div className="rounded-md border border-border bg-bg-2 p-1 shadow-lg">
            <button
              type="button"
              onClick={() => setModal('termin')}
              className="flex w-full items-center gap-2.5 rounded px-2 py-1.5 text-left text-[12.5px] font-medium text-text-secondary hover:bg-bg-hover hover:text-text-primary"
            >
              <MenuIcon>
                <path d="M8 2v3" />
                <path d="M16 2v3" />
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 9h18" />
              </MenuIcon>
              Termin
            </button>
            <button
              type="button"
              onClick={() => setModal('hausaufgabe')}
              className="flex w-full items-center gap-2.5 rounded px-2 py-1.5 text-left text-[12.5px] font-medium text-text-secondary hover:bg-bg-hover hover:text-text-primary"
            >
              <MenuIcon>
                <path d="m9 11 3 3L22 4" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </MenuIcon>
              Hausaufgabe
            </button>
            <button
              type="button"
              onClick={() =>
                void createNote.mutateAsync({ contentJson: { type: 'doc', content: [] } })
              }
              className="flex w-full items-center gap-2.5 rounded px-2 py-1.5 text-left text-[12.5px] font-medium text-text-secondary hover:bg-bg-hover hover:text-text-primary"
            >
              <MenuIcon>
                <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
                <path d="M14 2v5h6" />
              </MenuIcon>
              Notiz
            </button>
          </div>
        </div>
      </div>
      {modal === 'termin' && <CreateTerminModal onClose={() => setModal(null)} />}
      {modal === 'hausaufgabe' && <CreateHausaufgabeModal onClose={() => setModal(null)} />}
    </>
  )
}
