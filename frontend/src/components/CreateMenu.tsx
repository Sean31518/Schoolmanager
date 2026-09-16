import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCreateGeneralNote } from '../features/generalNotes/hooks'
import { CreateHausaufgabeModal } from './CreateHausaufgabeModal'
import { CreateHeftModal } from './CreateHeftModal'
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

export function CreateMenu({
  terminLabel = 'Termin',
  defaultTerminType = 'MANUAL',
  subjectId,
}: {
  terminLabel?: string
  defaultTerminType?: 'MANUAL' | 'EXAM'
  /** When set, adds a "Heft" option that creates a new Notizbereich for
   * this subject — used on the Fächer/Hefte-Übersicht page. */
  subjectId?: string
} = {}) {
  const createNote = useCreateGeneralNote()
  const navigate = useNavigate()
  const [modal, setModal] = useState<'termin' | 'hausaufgabe' | 'heft' | null>(null)
  const [open, setOpen] = useState(false)

  return (
    <>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
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
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute right-0 top-full z-20 mt-1.5 w-44 rounded-md border border-border bg-bg-2 p-1 shadow-lg">
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  setModal('termin')
                }}
                className="flex w-full items-center gap-2.5 rounded px-2 py-1.5 text-left text-[12.5px] font-medium text-text-secondary hover:bg-bg-hover hover:text-text-primary"
              >
                <MenuIcon>
                  <path d="M8 2v3" />
                  <path d="M16 2v3" />
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M3 9h18" />
                </MenuIcon>
                {terminLabel}
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  setModal('hausaufgabe')
                }}
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
                onClick={() => {
                  setOpen(false)
                  void createNote.mutateAsync({ contentJson: { type: 'doc', content: [] } })
                }}
                className="flex w-full items-center gap-2.5 rounded px-2 py-1.5 text-left text-[12.5px] font-medium text-text-secondary hover:bg-bg-hover hover:text-text-primary"
              >
                <MenuIcon>
                  <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
                  <path d="M14 2v5h6" />
                </MenuIcon>
                Notiz
              </button>
              {subjectId && (
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false)
                    setModal('heft')
                  }}
                  className="flex w-full items-center gap-2.5 rounded px-2 py-1.5 text-left text-[12.5px] font-medium text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                >
                  <MenuIcon>
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                  </MenuIcon>
                  Heft
                </button>
              )}
            </div>
          </>
        )}
      </div>
      {modal === 'termin' && (
        <CreateTerminModal onClose={() => setModal(null)} defaultType={defaultTerminType} />
      )}
      {modal === 'hausaufgabe' && <CreateHausaufgabeModal onClose={() => setModal(null)} />}
      {modal === 'heft' && subjectId && (
        <CreateHeftModal
          subjectId={subjectId}
          onClose={() => setModal(null)}
          onCreated={(sectionTypeId) => navigate(`/subjects/${subjectId}/sections/${sectionTypeId}`)}
        />
      )}
    </>
  )
}
