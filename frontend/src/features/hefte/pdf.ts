import * as pdfjsLib from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { getHeftViewUrl } from './api'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

export type PdfDocument = pdfjsLib.PDFDocumentProxy

// One parsed document per Heft version (modifiedAt changes with every
// Goodnotes upload), shared by the viewer, thumbnails and the page picker.
// pdf.js fetches only the byte ranges it needs, so opening a 200 MB Heft
// to look at page 3 doesn't download all of it.
const cache = new Map<string, Promise<PdfDocument>>()
const MAX_OPEN_DOCUMENTS = 6

export function loadHeftDocument(heftId: string, version: string): Promise<PdfDocument> {
  const key = `${heftId}@${version}`
  let promise = cache.get(key)
  if (!promise) {
    promise = getHeftViewUrl(heftId).then(
      ({ url }) =>
        pdfjsLib.getDocument({ url, disableAutoFetch: true, rangeChunkSize: 512 * 1024 }).promise,
    )
    promise.catch(() => cache.delete(key))
    cache.set(key, promise)
    while (cache.size > MAX_OPEN_DOCUMENTS) {
      const [oldestKey, oldest] = cache.entries().next().value!
      cache.delete(oldestKey)
      void oldest.then((doc) => doc.loadingTask.destroy()).catch(() => undefined)
    }
  }
  return promise
}
