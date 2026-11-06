/** Safe, browser-renderable media formats for same-origin previews.
 * Never inline SVG, HTML, XML or other active document types: clients can upload
 * arbitrary files and these responses share the application's origin.
 */
const PREVIEW_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/avif',
  'image/bmp',
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',
  'audio/mpeg',
  'audio/mp4',
  'audio/aac',
  'audio/ogg',
  'audio/wav',
  'audio/x-wav',
  'audio/webm',
  'audio/flac',
  'application/pdf',
])

export function normalizedPreviewMime(mime: string | null | undefined): string {
  return (mime || '').split(';', 1)[0].trim().toLowerCase()
}

export function isSafeInlineMime(mime: string | null | undefined): boolean {
  return PREVIEW_MIME_TYPES.has(normalizedPreviewMime(mime))
}
