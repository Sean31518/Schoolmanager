import type { JSONContent } from '@tiptap/react'
import { useRef, useState } from 'react'
import type { BlockActions } from '../SlashCommand'
import {
  useCreateImageBlock,
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
import { ImageBlockView } from './ImageBlockView'
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
  const createImage = useCreateImageBlock(noteId)
  const createPdf = useCreatePdfBlocks(noteId)
  const updateBlock = useUpdateBlock(noteId)
  const deleteBlock = useDeleteBlock(noteId)
  const reorderBlocks = useReorderBlocks(noteId)
  const uploadFile = useUploadFile()

  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const pdfInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const [showLinkForm, setShowLinkForm] = useState(false)
  const [linkDraft, setLinkDraft] = useState('')
  const pendingInsertIndex = useRef<number | null>(null)

  async function insertTextAt(position: number) {
    const created = await createText.mutateAsync({ contentJson: EMPTY_DOC })
    const ids = blocks.map((b) => b.id)
    ids.splice(position, 0, created.id)
    await reorderBlocks.mutateAsync(ids)
  }

  function requestPdfAt(position: number) {
    pendingInsertIndex.current = position
    pdfInputRef.current?.click()
  }

  function requestVideoAt(position: number) {
    pendingInsertIndex.current = position
    videoInputRef.current?.click()
  }

  function requestImageAt(position: number) {
    pendingInsertIndex.current = position
    imageInputRef.current?.click()
  }

  function requestLinkAt(position: number) {
    pendingInsertIndex.current = position
    setShowLinkForm(true)
  }

  async function moveToPendingPosition(newBlockIds: string[]) {
    const position = pendingInsertIndex.current
    pendingInsertIndex.current = null
    if (position === null) return
    const ids = blocks.map((b) => b.id)
    ids.splice(position, 0, ...newBlockIds)
    await reorderBlocks.mutateAsync(ids)
  }

  async function handlePdfSelected(file: File) {
    setUploadError(null)
    setUploading(true)
    try {
      const uploaded = await uploadFile.mutateAsync(file)
      const doc = await loadPdfDocument(uploaded.id)
      const created = await createPdf.mutateAsync({ fileId: uploaded.id, pageCount: doc.numPages })
      await moveToPendingPosition(created.map((b) => b.id))
    } catch {
      setUploadError('PDF konnte nicht hochgeladen werden')
      pendingInsertIndex.current = null
    } finally {
      setUploading(false)
    }
  }

  async function handleVideoSelected(file: File) {
    setUploadError(null)
    setUploading(true)
    try {
      const uploaded = await uploadFile.mutateAsync(file)
      const created = await createVideo.mutateAsync({ fileId: uploaded.id })
      await moveToPendingPosition([created.id])
    } catch {
      setUploadError('Video konnte nicht hochgeladen werden')
      pendingInsertIndex.current = null
    } finally {
      setUploading(false)
    }
  }

  async function handleImageSelected(file: File) {
    setUploadError(null)
    setUploading(true)
    try {
      const uploaded = await uploadFile.mutateAsync(file)
      const created = await createImage.mutateAsync({ fileId: uploaded.id })
      await moveToPendingPosition([created.id])
    } catch {
      setUploadError('Bild konnte nicht hochgeladen werden')
      pendingInsertIndex.current = null
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
      const created = await createLink.mutateAsync({ url })
      await moveToPendingPosition([created.id])
      setLinkDraft('')
      setShowLinkForm(false)
    } catch {
      setUploadError('Link konnte nicht hinzugefügt werden (gültige URL mit https:// angeben)')
      pendingInsertIndex.current = null
    }
  }

  function handleDelete(blockId: string) {
    if (blocks.length <= 1) return
    void deleteBlock.mutateAsync(blockId)
  }

  function moveBlock(index: number, direction: -1 | 1) {
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= blocks.length) return
    const ids = blocks.map((b) => b.id)
    const [moved] = ids.splice(index, 1)
    ids.splice(targetIndex, 0, moved)
    void reorderBlocks.mutateAsync(ids)
  }

  return (
    <div className="space-y-1">
      <InsertTextHere onClick={() => void insertTextAt(0)} />
      {blocks.map((block, index) => (
        <div key={block.id}>
          <div className="group relative rounded-lg border border-transparent p-1 hover:border-slate-200 dark:hover:border-slate-700">
            <div className="absolute right-1 top-1 hidden items-center gap-1 group-hover:flex">
              <button
                type="button"
                onClick={() => moveBlock(index, -1)}
                disabled={index === 0}
                title="Nach oben verschieben"
                className="rounded bg-white px-1.5 py-0.5 text-xs text-slate-400 shadow hover:text-blue-600 disabled:opacity-30 disabled:hover:text-slate-400 dark:bg-slate-800 dark:text-slate-500 dark:hover:text-blue-400"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => moveBlock(index, 1)}
                disabled={index === blocks.length - 1}
                title="Nach unten verschieben"
                className="rounded bg-white px-1.5 py-0.5 text-xs text-slate-400 shadow hover:text-blue-600 disabled:opacity-30 disabled:hover:text-slate-400 dark:bg-slate-800 dark:text-slate-500 dark:hover:text-blue-400"
              >
                ↓
              </button>
              {blocks.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleDelete(block.id)}
                  className="rounded bg-white px-1.5 py-0.5 text-xs text-slate-400 shadow hover:text-red-600 dark:bg-slate-800 dark:text-slate-500 dark:hover:text-red-400"
                >
                  Entfernen
                </button>
              )}
            </div>
            <BlockContent
              block={block}
              onSaveText={(content) =>
                void updateBlock.mutateAsync({ blockId: block.id, data: { contentJson: content } })
              }
              blockActions={{
                onInsertText: () => void insertTextAt(index + 1),
                onRequestPdf: () => requestPdfAt(index + 1),
                onRequestVideo: () => requestVideoAt(index + 1),
                onRequestLink: () => requestLinkAt(index + 1),
                onRequestImage: () => requestImageAt(index + 1),
              }}
            />
          </div>
          <InsertTextHere onClick={() => void insertTextAt(index + 1)} />
        </div>
      ))}

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
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file) void handleImageSelected(file)
        }}
      />

      {uploading && <span className="text-xs text-slate-400 dark:text-slate-500">Lädt hoch...</span>}
      {uploadError && <span className="text-xs text-red-600 dark:text-red-400">{uploadError}</span>}

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
          <button
            type="button"
            onClick={() => {
              pendingInsertIndex.current = null
              setShowLinkForm(false)
            }}
            className="rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-700"
          >
            Abbrechen
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
  blockActions,
}: {
  block: NoteBlockDto
  onSaveText: (content: JSONContent) => void
  blockActions: BlockActions
}) {
  switch (block.type) {
    case 'TEXT':
      return (
        <TextBlockEditor
          blockId={block.id}
          content={(block.contentJson as JSONContent | null) ?? EMPTY_DOC}
          onSave={onSaveText}
          blockActions={blockActions}
        />
      )
    case 'PDF_PAGE':
      return block.fileId && block.pageNumber ? (
        <PdfPageView fileId={block.fileId} pageNumber={block.pageNumber} />
      ) : null
    case 'VIDEO':
      return block.file ? <VideoBlockView file={block.file} /> : null
    case 'IMAGE':
      return block.file ? <ImageBlockView file={block.file} /> : null
    case 'LINK':
      return block.url ? <LinkBlockView url={block.url} /> : null
    default:
      return null
  }
}
