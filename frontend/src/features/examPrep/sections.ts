import type { JSONContent } from '@tiptap/react'
import type { NoteBlockDto, NoteBlockFileDto } from '../notes/types'

export type NoteSection =
  | { index: number; label: string; kind: 'text'; content: JSONContent }
  | { index: number; label: string; kind: 'pdfPage'; fileId: string; pageNumber: number }
  | { index: number; label: string; kind: 'video'; file: NoteBlockFileDto }
  | { index: number; label: string; kind: 'image'; file: NoteBlockFileDto }
  | { index: number; label: string; kind: 'link'; url: string }

function headingText(node: JSONContent): string {
  return (node.content ?? [])
    .map((child) => child.text ?? '')
    .join('')
    .trim()
}

/**
 * Splits one text block's TipTap document into sections at each top-level
 * H1/H2 heading. Content before the first heading becomes its own
 * "Einleitung" section (only if non-empty). A block with no headings at all
 * comes back as a single "Gesamter Inhalt" section.
 */
function extractDocSections(doc: JSONContent): { label: string; content: JSONContent }[] {
  const blocks = doc.content ?? []
  const sections: { label: string; content: JSONContent }[] = []
  let current: JSONContent[] = []
  let currentLabel = 'Einleitung'
  let currentIsHeadingSection = false
  let hadHeading = false

  // The heading itself becomes the section's `label` (shown as a title by
  // callers), so it is deliberately left out of `content` to avoid showing
  // the same heading text twice.
  function pushCurrent() {
    if (current.length > 0 || currentIsHeadingSection) {
      sections.push({ label: currentLabel, content: { type: 'doc', content: current } })
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
  if (!hadHeading) return [{ label: 'Gesamter Inhalt', content: sections[0].content }]
  return sections
}

/**
 * Splits a note's block sequence into selectable sections: each text block
 * is further split by heading (see extractDocSections), while a PDF page,
 * video or link block becomes its own single section since it can't be
 * split any further.
 */
export function extractSections(blocks: NoteBlockDto[]): NoteSection[] {
  const sections: NoteSection[] = []

  function nextIndex() {
    return sections.length
  }

  for (const block of blocks) {
    if (block.type === 'TEXT') {
      const doc = (block.contentJson as JSONContent | null) ?? { type: 'doc', content: [] }
      for (const sub of extractDocSections(doc)) {
        sections.push({ index: nextIndex(), kind: 'text', label: sub.label, content: sub.content })
      }
    } else if (block.type === 'PDF_PAGE' && block.fileId && block.pageNumber) {
      sections.push({
        index: nextIndex(),
        kind: 'pdfPage',
        label: `PDF · Seite ${block.pageNumber}`,
        fileId: block.fileId,
        pageNumber: block.pageNumber,
      })
    } else if (block.type === 'VIDEO' && block.file) {
      sections.push({
        index: nextIndex(),
        kind: 'video',
        label: `Video: ${block.file.originalName}`,
        file: block.file,
      })
    } else if (block.type === 'IMAGE' && block.file) {
      sections.push({
        index: nextIndex(),
        kind: 'image',
        label: `Bild: ${block.file.originalName}`,
        file: block.file,
      })
    } else if (block.type === 'LINK' && block.url) {
      sections.push({ index: nextIndex(), kind: 'link', label: `Link: ${block.url}`, url: block.url })
    }
  }

  return sections
}
