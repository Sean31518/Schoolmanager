import type { JSONContent } from '@tiptap/react'

export interface NoteSection {
  index: number
  label: string
  content: JSONContent
}

function headingText(node: JSONContent): string {
  return (node.content ?? [])
    .map((child) => child.text ?? '')
    .join('')
    .trim()
}

/**
 * Splits a note's TipTap document into sections at each top-level H1/H2
 * heading. Content before the first heading becomes its own "Einleitung"
 * section (only if non-empty). Notes with no headings at all come back as a
 * single "Gesamter Inhalt" section.
 */
export function extractSections(doc: JSONContent): NoteSection[] {
  const blocks = doc.content ?? []
  const sections: NoteSection[] = []
  let current: JSONContent[] = []
  let currentLabel = 'Einleitung'
  let currentIsHeadingSection = false
  let hadHeading = false

  // The heading itself becomes the section's `label` (shown as a title by
  // callers), so it is deliberately left out of `content` to avoid showing
  // the same heading text twice.
  function pushCurrent() {
    if (current.length > 0 || currentIsHeadingSection) {
      sections.push({
        index: sections.length,
        label: currentLabel,
        content: { type: 'doc', content: current },
      })
    }
  }

  for (const block of blocks) {
    const level = block.type === 'heading' ? (block.attrs?.level as number | undefined) : undefined
    if (block.type === 'heading' && (level === 1 || level === 2)) {
      pushCurrent()
      hadHeading = true
      current = []
      currentLabel = headingText(block) || `Abschnitt ${sections.length + 1}`
      currentIsHeadingSection = true
    } else {
      current.push(block)
    }
  }
  pushCurrent()

  if (sections.length === 0) return []
  if (!hadHeading) {
    return [{ index: 0, label: 'Gesamter Inhalt', content: sections[0].content }]
  }
  return sections
}
