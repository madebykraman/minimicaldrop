export type FileViewScope = 'all' | 'folders' | 'recent'
export type FileViewSort = 'name' | 'newest' | 'size'
export type FileViewItem = { name: string; mimeType: string; sizeBytes: number; modifiedTime: string | null }
/** Stable, immutable filtering; selection never triggers a network request. */
export function filterAndSortFiles<T extends FileViewItem>(items: readonly T[], query: string, sort: FileViewSort, scope: FileViewScope): T[] {
  const q = query.trim().toLocaleLowerCase()
  const filtered = items.filter(item => (!q || item.name.toLocaleLowerCase().includes(q)) && (scope !== 'folders' || item.mimeType === 'application/vnd.google-apps.folder'))
  const byName = (a: T, b: T) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  const timestamp = (item: T) => item.modifiedTime ? new Date(item.modifiedTime).getTime() || 0 : 0
  return filtered.sort((a,b) => {
    if (scope === 'recent' || sort === 'newest') return timestamp(b) - timestamp(a) || byName(a,b)
    if (sort === 'size') return b.sizeBytes - a.sizeBytes || byName(a,b)
    return byName(a,b)
  })
}
