import type { JSONContent } from '@tiptap/react'
import { useRef, useState, type ReactNode } from 'react'
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

  function blockActionsAt(position: number): BlockActions {
    return {
      onInsertText: () => void insertTextAt(position),
      onRequestPdf: () => requestPdfAt(position),
      onRequestVideo: () => requestVideoAt(position),
      onRequestLink: () => requestLinkAt(position),
      onRequestImage: () => requestImageAt(position),
    }
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
      <InsertBlockMenu actions={blockActionsAt(0)} />
      {blocks.map((block, index) => (
        <div key={block.id}>
          <div className="group relative rounded-lg border border-transparent p-1 hover:border-border">
            <div className="absolute right-1 top-1 hidden items-center gap-1 rounded-md border border-border bg-bg-2 p-0.5 shadow-lg group-hover:flex">
              <button
                type="button"
                onClick={() => moveBlock(index, -1)}
                disabled={index === 0}
                title="Nach oben verschieben"
                className="rounded px-1.5 py-0.5 text-xs text-text-muted hover:bg-bg-hover hover:text-text-primary disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-text-muted"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => moveBlock(index, 1)}
                disabled={index === blocks.length - 1}
                title="Nach unten verschieben"
                className="rounded px-1.5 py-0.5 text-xs text-text-muted hover:bg-bg-hover hover:text-text-primary disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-text-muted"
              >
                ↓
              </button>
              {blocks.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleDelete(block.id)}
                  className="rounded px-1.5 py-0.5 text-xs text-text-muted hover:bg-bg-hover hover:text-red-400"
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
              blockActions={blockActionsAt(index + 1)}
            />
          </div>
          <InsertBlockMenu actions={blockActionsAt(index + 1)} />
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

      {uploading && <span className="text-xs text-text-tertiary">Lädt hoch...</span>}
      {uploadError && <span className="text-xs text-red-400">{uploadError}</span>}

      {showLinkForm && (
        <form onSubmit={(e) => void handleAddLink(e)} className="flex items-center gap-2">
          <input
            autoFocus
            required
            type="url"
            placeholder="https://..."
            value={linkDraft}
            onChange={(e) => setLinkDraft(e.target.value)}
            className="flex-1 rounded-md border border-border bg-bg-muted px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted"
          />
          <button
            type="submit"
            className="rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-accent-ink"
          >
            Hinzufügen
          </button>
          <button
            type="button"
            onClick={() => {
              pendingInsertIndex.current = null
              setShowLinkForm(false)
            }}
            className="rounded-md border border-border px-3 py-1.5 text-sm text-text-secondary hover:bg-bg-hover"
          >
            Abbrechen
          </button>
        </form>
      )}
    </div>
  )
}

function MenuIcon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[14px] w-[14px] shrink-0 text-text-tertiary"
    >
      {children}
    </svg>
  )
}

/** The small "+" between blocks — click reveals a menu to pick which kind
 * of block to insert there, instead of always inserting text. */
function InsertBlockMenu({ actions }: { actions: BlockActions }) {
  const [open, setOpen] = useState(false)

  function pick(action: () => void) {
    setOpen(false)
    action()
  }

  return (
    <div className="group/insert relative flex h-2 items-center justify-center">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Element hier einfügen"
        className={`relative z-20 mx-auto flex h-4 w-4 items-center justify-center rounded-full bg-accent text-accent-ink hover:bg-accent-hover ${
          open ? 'flex' : 'hidden group-hover/insert:flex'
        }`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-2.5 w-2.5"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-1/2 top-full z-20 w-40 -translate-x-1/2 pt-1.5">
            <div className="rounded-md border border-border bg-bg-2 p-1 shadow-lg">
              <button
                type="button"
                onClick={() => pick(actions.onInsertText)}
                className="flex w-full items-center gap-2.5 rounded px-2 py-1.5 text-left text-[12.5px] font-medium text-text-secondary hover:bg-bg-hover hover:text-text-primary"
              >
                <MenuIcon>
                  <path d="M4 6h16M4 12h16M4 18h10" />
                </MenuIcon>
                Text
              </button>
              <button
                type="button"
                onClick={() => pick(actions.onRequestPdf)}
                className="flex w-full items-center gap-2.5 rounded px-2 py-1.5 text-left text-[12.5px] font-medium text-text-secondary hover:bg-bg-hover hover:text-text-primary"
              >
                <MenuIcon>
                  <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
                  <path d="M14 2v5h6" />
                </MenuIcon>
                PDF
              </button>
              <button
                type="button"
                onClick={() => pick(actions.onRequestVideo)}
                className="flex w-full items-center gap-2.5 rounded px-2 py-1.5 text-left text-[12.5px] font-medium text-text-secondary hover:bg-bg-hover hover:text-text-primary"
              >
                <MenuIcon>
                  <path d="m22 8-6 4 6 4V8Z" />
                  <rect width="14" height="12" x="2" y="6" rx="2" />
                </MenuIcon>
                Video
              </button>
              <button
                type="button"
                onClick={() => pick(actions.onRequestImage)}
                className="flex w-full items-center gap-2.5 rounded px-2 py-1.5 text-left text-[12.5px] font-medium text-text-secondary hover:bg-bg-hover hover:text-text-primary"
              >
                <MenuIcon>
                  <rect width="18" height="18" x="3" y="3" rx="2" />
                  <circle cx="9" cy="9" r="2" />
                  <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                </MenuIcon>
                Bild
              </button>
              <button
                type="button"
                onClick={() => pick(actions.onRequestLink)}
                className="flex w-full items-center gap-2.5 rounded px-2 py-1.5 text-left text-[12.5px] font-medium text-text-secondary hover:bg-bg-hover hover:text-text-primary"
              >
                <MenuIcon>
                  <path d="m9 17 6-6" />
                  <path d="M13 6.5a5 5 0 0 1 7.5 6.5l-4 4a5 5 0 0 1-7-7" />
                  <path d="M11 17.5a5 5 0 0 1-7.5-6.5l4-4a5 5 0 0 1 7 7" />
                </MenuIcon>
                Link
              </button>
            </div>
          </div>
        </>
      )}
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
