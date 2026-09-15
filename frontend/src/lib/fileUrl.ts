import { getAccessToken } from './apiClient'

// <video>/<iframe> tags can't set an Authorization header, so the file
// endpoint also accepts the access token as a query param (see
// backend/src/modules/files/files.middleware.ts).
export function fileUrl(fileId: string): string {
  const token = getAccessToken()
  return `/api/files/${fileId}${token ? `?token=${encodeURIComponent(token)}` : ''}`
}
