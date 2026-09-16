import { fileUrl } from '../../../lib/fileUrl'
import type { NoteBlockFileDto } from '../types'

export function ImageBlockView({ file }: { file: NoteBlockFileDto }) {
  return (
    <img
      src={fileUrl(file.id)}
      alt={file.originalName}
      className="mx-auto block max-h-[32rem] max-w-full rounded-lg object-contain"
    />
  )
}
