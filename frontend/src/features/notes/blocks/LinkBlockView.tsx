const YOUTUBE_RE = /(?:youtube\.com\/watch\?v=|youtube\.com\/embed\/|youtu\.be\/)([\w-]{6,})/
const VIMEO_RE = /vimeo\.com\/(\d+)/

function embedUrl(url: string): string | null {
  const youtube = YOUTUBE_RE.exec(url)
  if (youtube) return `https://www.youtube.com/embed/${youtube[1]}`
  const vimeo = VIMEO_RE.exec(url)
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`
  return null
}

export function LinkBlockView({ url }: { url: string }) {
  const embed = embedUrl(url)

  if (embed) {
    return (
      <div className="mx-auto aspect-video w-full max-w-2xl overflow-hidden rounded-lg bg-black">
        <iframe
          src={embed}
          title={url}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    )
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-block break-all text-accent-text hover:underline"
    >
      {url}
    </a>
  )
}
