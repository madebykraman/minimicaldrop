export type FileViewSort = 'name' | 'newest' | 'size'
export type FileViewScope = 'all' | 'folders' | 'recent'
export type FileViewItem = { name: string; mimeType: string; sizeBytes: number; modifiedTime: string | null }

const FOLDER_MIME = 'application/vnd.google-apps.folder'

/** Pure, non-mutating filter shared by grid and list views. */
export function filterAndSortFiles<T extends FileViewItem>(items: readonly T[], query: string, sort: FileViewSort, scope: FileViewScope): T[] {
  const text = query.trim().toLocaleLowerCase()
  const matched = items.filter(item => (!text || item.name.toLocaleLowerCase().includes(text)) && (scope !== 'folders' || item.mimeType === FOLDER_MIME))
  const byName = (a: T,b: T) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  const mtime = (item: T) => item.modifiedTime ? new Date(item.modifiedTime).getTime() || 0 : 0
  return matched.sort((a,b) => {
    if (scope === 'recent' || sort === 'newest') return mtime(b) - mtime(a) || byName(a,b)
    if (sort === 'size') return b.sizeBytes - a.sizeBytes || byName(a,b)
    return byName(a,b)
  })
}
