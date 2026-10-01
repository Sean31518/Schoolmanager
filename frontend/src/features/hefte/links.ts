import type { DocumentLinkDto, DraftLink } from './types'

export function viewerUrl(link: { fileId: string; pageStart: number | null; pageEnd: number | null }) {
  if (link.pageStart === null) return `/hefte/${link.fileId}`
  const end = link.pageEnd && link.pageEnd !== link.pageStart ? `&bis=${link.pageEnd}` : ''
  return `/hefte/${link.fileId}?seite=${link.pageStart}${end}`
}

export function linksToDrafts(links: DocumentLinkDto[] | undefined): DraftLink[] {
  return (links ?? []).map((l) => ({
    id: l.id,
    fileId: l.fileId,
    heftName: l.heftName,
    pageStart: l.pageStart,
    pageEnd: l.pageEnd,
    uncertain: l.uncertain,
  }))
}
