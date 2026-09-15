import type { JSONContent } from '@tiptap/react'
import { useRef, useState } from 'react'
import {
  useCreateLinkBlock,
  useCreatePdfBlocks,
  useCreateTextBlock,
  useCreateVideoBlock,
  useDeleteBlock,
  useReorderBlocks,
  useUpdateBlock,
  useUploadFile,
} from '../hooks'
import type { NoteBlockDto } from '../types'
import { LinkBlockView } from './LinkBlockView'
import { loadPdfDocument } from './pdfDocumentCache'
import { PdfPageView } from './PdfPageView'
import { TextBlockEditor } from './TextBlockEditor'
import { VideoBlockView } from './VideoBlockView'

const EMPTY_DOC: JSONContent = { type: 'doc', content: [] }

export function BlockList({ noteId, blocks }: { noteId: string; blocks: NoteBlockDto[] }) {
  const createText = useCreateTextBlock(noteId)
  const createLink = useCreateLinkBlock(noteId)
  const createVideo = useCreateVideoBlock(noteId)
  const createPdf = useCreatePdfBlocks(noteId)
  const updateBlock = useUpdateBlock(noteId)
  const deleteBlock = useDeleteBlock(noteId)
  const reorderBlocks = useReorderBlocks(noteId)
  const uploadFile = useUploadFile()

  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const pdfInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const [showLinkForm, setShowLinkForm] = useState(false)
  const [linkDraft, setLinkDraft] = useState('')

  async function insertTextAt(position: number) {
    const created = await createText.mutateAsync({ contentJson: EMPTY_DOC })
    const ids = blocks.map((b) => b.id)
    ids.splice(position, 0, created.id)
    await reorderBlocks.mutateAsync(ids)
  }

  async function handlePdfSelected(file: File) {
    setUploadError(null)
    setUploading(true)
    try {
      const uploaded = await uploadFile.mutateAsync(file)
      const doc = await loadPdfDocument(uploaded.id)
      await createPdf.mutateAsync({ fileId: uploaded.id, pageCount: doc.numPages })
    } catch {
      setUploadError('PDF konnte nicht hochgeladen werden')
    } finally {
      setUploading(false)
    }
  }

  async function handleVideoSelected(file: File) {
    setUploadError(null)
    setUploading(true)
    try {
      const uploaded = await uploadFile.mutateAsync(file)
      await createVideo.mutateAsync({ fileId: uploaded.id })
    } catch {
      setUploadError('Video konnte nicht hochgeladen werden')
    } finally {
      setUploading(false)
    }
  }

  async function handleAddLink(e: React.FormEvent) {
    e.preventDefault()
    const url = linkDraft.trim()
    if (!url) return
    setUploadError(null)
    try {
      await createLink.mutateAsync({ url })
      setLinkDraft('')
      setShowLinkForm(false)
    } catch {
      setUploadError('Link konnte nicht hinzugefügt werden (gültige URL mit https:// angeben)')
    }
  }

  function handleDelete(blockId: string) {
    if (blocks.length <= 1) return
    void deleteBlock.mutateAsync(blockId)
  }

  return (
    <div className="space-y-1">
      <InsertTextHere onClick={() => void insertTextAt(0)} />
      {blocks.map((block, index) => (
        <div key={block.id}>
          <div className="group relative rounded-lg border border-transparent p-1 hover:border-slate-200 dark:hover:border-slate-700">
            {blocks.length > 1 && (
              <button
                type="button"
                onClick={() => handleDelete(block.id)}
                className="absolute right-1 top-1 hidden rounded bg-white px-1.5 py-0.5 text-xs text-slate-400 shadow hover:text-red-600 group-hover:block dark:bg-slate-800 dark:text-slate-500 dark:hover:text-red-400"
              >
                Entfernen
              </button>
            )}
            <BlockContent
              block={block}
              onSaveText={(content) =>
                void updateBlock.mutateAsync({ blockId: block.id, data: { contentJson: content } })
              }
            />
          </div>
          <InsertTextHere onClick={() => void insertTextAt(index + 1)} />
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3 dark:border-slate-700">
        <button
          type="button"
          onClick={() => void insertTextAt(blocks.length)}
          className="rounded border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          + Text
        </button>
        <button
          type="button"
          disabled={uploading}
          onClick={() => pdfInputRef.current?.click()}
          className="rounded border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          + PDF
        </button>
        <input
          ref={pdfInputRef}
          type="file"
          accept="application/pdf"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (file) void handlePdfSelected(file)
          }}
        />
        <button
          type="button"
          disabled={uploading}
          onClick={() => videoInputRef.current?.click()}
          className="rounded border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          + Video
        </button>
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (file) void handleVideoSelected(file)
          }}
        />
        <button
          type="button"
          onClick={() => setShowLinkForm((v) => !v)}
          className="rounded border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          + Link
        </button>
        {uploading && <span className="text-xs text-slate-400 dark:text-slate-500">Lädt hoch...</span>}
        {uploadError && <span className="text-xs text-red-600 dark:text-red-400">{uploadError}</span>}
      </div>

      {showLinkForm && (
        <form onSubmit={(e) => void handleAddLink(e)} className="flex items-center gap-2">
          <input
            autoFocus
            required
            type="url"
            placeholder="https://..."
            value={linkDraft}
            onChange={(e) => setLinkDraft(e.target.value)}
            className="flex-1 rounded border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          />
          <button
            type="submit"
            className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white"
          >
            Hinzufügen
          </button>
        </form>
      )}
    </div>
  )
}

function InsertTextHere({ onClick }: { onClick: () => void }) {
  return (
    <div className="group/insert flex h-2 items-center">
      <button
        type="button"
        onClick={onClick}
        title="Textblock hier einfügen"
        className="mx-auto hidden h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-xs leading-none text-white group-hover/insert:flex"
      >
        +
      </button>
    </div>
  )
}

function BlockContent({
  block,
  onSaveText,
}: {
  block: NoteBlockDto
  onSaveText: (content: JSONContent) => void
}) {
  switch (block.type) {
    case 'TEXT':
      return (
        <TextBlockEditor
          blockId={block.id}
          content={(block.contentJson as JSONContent | null) ?? EMPTY_DOC}
          onSave={onSaveText}
        />
      )
    case 'PDF_PAGE':
      return block.fileId && block.pageNumber ? (
        <PdfPageView fileId={block.fileId} pageNumber={block.pageNumber} />
      ) : null
    case 'VIDEO':
      return block.file ? <VideoBlockView file={block.file} /> : null
    case 'LINK':
      return block.url ? <LinkBlockView url={block.url} /> : null
    default:
      return null
  }
}
