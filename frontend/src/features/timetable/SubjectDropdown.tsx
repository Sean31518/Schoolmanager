import { useEffect, useRef, useState } from 'react'
import { getContrastTextColor } from '../../lib/color'
import type { SubjectDto } from '../subjects/types'

// Native <select> hover/focus chrome (a translucent overlay Windows/Chrome
// paints on top of the inline background-color) can't be reliably suppressed
// with CSS alone, so this is a from-scratch dropdown instead of a <select>.
export function SubjectDropdown({
  value,
  subjects,
  onChange,
}: {
  value: string
  subjects: SubjectDto[]
  onChange: (subjectId: string | null) => void
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  const selected = subjects.find((s) => s.id === value)

  function pick(subjectId: string | null) {
    onChange(subjectId)
    setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative h-full w-full">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={
          selected
            ? 'block h-full w-full px-2 py-3 text-left text-sm font-medium'
            : 'block h-full w-full bg-bg-1 px-2 py-3 text-left text-sm text-text-secondary'
        }
        style={
          selected
            ? { backgroundColor: selected.color, color: getContrastTextColor(selected.color) }
            : undefined
        }
      >
        {selected ? selected.name : ''}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-20 mt-0.5 max-h-56 w-48 overflow-y-auto rounded-md border border-border bg-bg-2 py-1 text-sm shadow-lg">
          <button
            type="button"
            onClick={() => pick(null)}
            className="block w-full px-3 py-1.5 text-left text-text-tertiary hover:bg-bg-hover"
          >
            – (kein Fach)
          </button>
          {subjects.map((subject) => (
            <button
              key={subject.id}
              type="button"
              onClick={() => pick(subject.id)}
              className="block w-full px-3 py-1.5 text-left font-medium"
              style={{ backgroundColor: subject.color, color: getContrastTextColor(subject.color) }}
            >
              {subject.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
