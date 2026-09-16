import { ImageBlockView } from '../notes/blocks/ImageBlockView'
import { LinkBlockView } from '../notes/blocks/LinkBlockView'
import { PdfPageView } from '../notes/blocks/PdfPageView'
import { VideoBlockView } from '../notes/blocks/VideoBlockView'
import { ReadOnlyContent } from '../notes/ReadOnlyContent'
import type { NoteSection } from './sections'

export function SectionContent({ section }: { section: NoteSection }) {
  switch (section.kind) {
    case 'text':
      return <ReadOnlyContent content={section.content} />
    case 'pdfPage':
      return <PdfPageView fileId={section.fileId} pageNumber={section.pageNumber} />
    case 'video':
      return <VideoBlockView file={section.file} />
    case 'image':
      return <ImageBlockView file={section.file} />
    case 'link':
      return <LinkBlockView url={section.url} />
    default:
      return null
  }
}
