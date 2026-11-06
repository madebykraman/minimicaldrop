import test from 'node:test'
import assert from 'node:assert/strict'
import { filterAndSortFiles } from '../lib/file-view.ts'
const items = [
  { id:'1', name:'Zebra.png', mimeType:'image/png', sizeBytes:9, modifiedTime:'2026-01-02T00:00:00Z' },
  { id:'2', name:'Album', mimeType:'application/vnd.google-apps.folder', sizeBytes:0, modifiedTime:'2026-02-02T00:00:00Z' },
  { id:'3', name:'alpha.pdf', mimeType:'application/pdf', sizeBytes:100, modifiedTime:null },
]
test('filter is case insensitive and never mutates input', () => {
  const before = structuredClone(items)
  assert.deepEqual(filterAndSortFiles(items, 'A', 'name', 'all').map(x=>x.id), ['3','2','1'])
  assert.deepEqual(items, before)
})
test('folders view excludes files', () => assert.deepEqual(filterAndSortFiles(items, '', 'name', 'folders').map(x=>x.id), ['2']))
test('recent items are newest first', () => assert.deepEqual(filterAndSortFiles(items, '', 'size', 'recent').map(x=>x.id), ['2','1','3']))
test('size sort is descending', () => assert.deepEqual(filterAndSortFiles(items, '', 'size', 'all').map(x=>x.id), ['3','1','2']))
test('whitespace-only query matches all', () => assert.equal(filterAndSortFiles(items, '  ', 'name', 'all').length, 3))
