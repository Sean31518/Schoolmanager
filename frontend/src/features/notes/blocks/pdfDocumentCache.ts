import * as pdfjsLib from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { fileUrl } from '../../../lib/fileUrl'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

// Several PDF_PAGE blocks in the same note share one physical PDF file, so
// this caches the parsed document per fileId instead of re-fetching and
// re-parsing the whole PDF once per page.
const cache = new Map<string, Promise<pdfjsLib.PDFDocumentProxy>>()

export function loadPdfDocument(fileId: string): Promise<pdfjsLib.PDFDocumentProxy> {
  let promise = cache.get(fileId)
  if (!promise) {
    promise = pdfjsLib.getDocument({ url: fileUrl(fileId) }).promise
    cache.set(fileId, promise)
  }
  return promise
}
