export interface HeftSubject {
  id: string
  name: string
  color: string
}

/** A Goodnotes notebook, as backed up to Schulmanager's WebDAV as PDF. */
export interface HeftDto {
  id: string
  name: string
  path: string
  folderPath: string
  subject: HeftSubject | null
  /** How the Fach was found: innermost matching folder, the Heft's own
   * name, or a manual folder assignment from "Ohne Fach". */
  subjectSource: 'folder' | 'name' | 'manual' | null
  subjectFolderPath: string | null
  archived: boolean
  pageCount: number
  /** A newer upload is still being analyzed. */
  processing: boolean
  size: number
  modifiedAt: string
  linkCount: number
}

/** A link from a Hausaufgabe/Termin/Karteikarte/Notiz to a Heft or a page
 * range in it. pageStart null = the whole Heft. */
export interface DocumentLinkDto {
  id: string
  fileId: string
  heftName: string
  heftPath: string
  archived: boolean
  pageStart: number | null
  pageEnd: number | null
  /** The pages were re-found after a Goodnotes change by a guess. */
  uncertain: boolean
}

/** What forms send: the full list replaces the stored one; `id` keeps an
 * existing link (and its tracking state) when its pages didn't change. */
export interface LinkInput {
  id?: string
  fileId: string
  pageStart?: number | null
  pageEnd?: number | null
}

/** A link while editing in a form - may not be saved yet (no id). */
export interface DraftLink {
  id?: string
  fileId: string
  heftName: string
  pageStart: number | null
  pageEnd: number | null
  uncertain?: boolean
}

export function toLinkInputs(links: DraftLink[]): LinkInput[] {
  return links.map(({ id, fileId, pageStart, pageEnd }) => ({ id, fileId, pageStart, pageEnd }))
}

export function pageLabel(link: { pageStart: number | null; pageEnd: number | null }) {
  if (link.pageStart === null) return 'ganzes Heft'
  if (link.pageEnd === null || link.pageEnd === link.pageStart) return `S. ${link.pageStart}`
  return `S. ${link.pageStart}–${link.pageEnd}`
}
