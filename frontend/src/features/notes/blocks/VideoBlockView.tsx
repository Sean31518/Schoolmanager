import { fileUrl } from '../../../lib/fileUrl'
import type { NoteBlockFileDto } from '../types'

export function VideoBlockView({ file }: { file: NoteBlockFileDto }) {
  return (
    <video controls preload="metadata" className="max-w-2xl rounded-lg bg-black" src={fileUrl(file.id)}>
      {file.originalName}
    </video>
  )
}
