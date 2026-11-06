import test from 'node:test'
import assert from 'node:assert/strict'
import { filterAndSortFiles } from '../lib/file-view.ts'
const items = [
  { id: 'z', name: 'Zebra.png', mimeType: 'image/png', sizeBytes: 9, modifiedTime: '2026-01-02T00:00:00Z' },
  { id: 'folder', name: 'Album', mimeType: 'application/vnd.google-apps.folder', sizeBytes: 0, modifiedTime: '2026-02-02T00:00:00Z' },
  { id: 'a', name: 'alpha.pdf', mimeType: 'application/pdf', sizeBytes: 100, modifiedTime: null },
]
test('search is case insensitive and preserves original order', () => {
  const original = structuredClone(items)
  assert.deepEqual(filterAndSortFiles(items, 'a', 'name', 'all').map(x=>x.id), ['folder','a','z'])
  assert.deepEqual(items, original)
})
test('folders view filters nonfolders', () => assert.deepEqual(filterAndSortFiles(items,'','name','folders').map(x=>x.id), ['folder']))
test('recent sorts newest first', () => assert.deepEqual(filterAndSortFiles(items,'','size','recent').map(x=>x.id), ['folder','z','a']))
test('size sorts descending', () => assert.deepEqual(filterAndSortFiles(items,'','size','all').map(x=>x.id), ['a','z','folder']))
test('whitespace search matches everything', () => assert.equal(filterAndSortFiles(items,'   ','name','all').length, 3))
