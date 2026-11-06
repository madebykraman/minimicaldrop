import test from 'node:test'
import assert from 'node:assert/strict'
import { isSafeInlineMime, normalizedPreviewMime } from '../lib/preview-types.ts'

test('safe media formats may be previewed', () => {
  for (const mime of [
    'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif',
    'video/mp4', 'video/webm', 'audio/mpeg', 'audio/wav', 'application/pdf',
  ]) {
    assert.equal(isSafeInlineMime(mime), true, mime)
  }
})

test('active content is never previewed on the application origin', () => {
  for (const mime of [
    'text/html', 'image/svg+xml', 'application/xhtml+xml',
    'application/xml', 'text/xml', 'text/javascript', 'application/javascript',
    'application/octet-stream', '', null, undefined,
  ]) {
    assert.equal(isSafeInlineMime(mime), false, String(mime))
  }
})

test('MIME normalization accepts harmless parameters and case differences', () => {
  assert.equal(normalizedPreviewMime('  IMAGE/PNG ; charset=utf-8'), 'image/png')
  assert.equal(isSafeInlineMime('  IMAGE/PNG ; charset=utf-8'), true)
  assert.equal(isSafeInlineMime('IMAGE/SVG+XML ; charset=UTF-8'), false)
})
