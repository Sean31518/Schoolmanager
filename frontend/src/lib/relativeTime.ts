export function formatRelativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const minutes = Math.round(ms / 60_000)
  if (minutes < 60) return `VOR ${Math.max(minutes, 1)} MIN`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `VOR ${hours} H`
  const days = Math.round(hours / 24)
  if (days === 1) return 'GESTERN'
  if (days < 7) return `VOR ${days} T`
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
}
