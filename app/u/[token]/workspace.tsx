'use client'

import { useEffect, useRef, useState } from 'react'
import {
  AlertCircle, ArrowUp, Check, ChevronRight, Download, File, FileAudio, FileImage, FileText,
  FileVideo, Folder, FolderPlus, HardDrive, Loader2, MoreHorizontal, Pencil, RefreshCw,
  Trash2, Upload, X,
} from 'lucide-react'

type Item = { id: string; name: string; mimeType: string; sizeBytes: number; modifiedTime: string | null }
type Project = { id: string; name: string; clientName: string; expiresAt: string; storageLimitBytes: number | null }
type UploadState = { id: string; name: string; progress: number; status: 'uploading' | 'complete' | 'error'; error?: string }
type TrailItem = { id: string; name: string }
type Dialog = { type: 'rename' | 'delete'; kind: 'file' | 'folder'; id: string; name: string } | null
type Recovery = { uploadId: string; name: string; mimeType: string | null; sizeBytes: number; uploadedBytes: number; folderId: string | null; sessionUrl: string; createdAt: string }

const FOLDER_MIME = 'application/vnd.google-apps.folder'
const CHUNK = 1 * 1024 * 1024

function formatBytes(bytes: number) {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / 1024 ** i).toFixed(i ? 1 : 0)} ${units[i]}`
}

function formatDate(value: string | null) {
  if (!value) return ''
  return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fileIcon(mime: string) {
  if (mime.startsWith('image/')) return FileImage
  if (mime.startsWith('video/')) return FileVideo
  if (mime.startsWith('audio/')) return FileAudio
  if (mime === 'application/pdf' || mime.startsWith('text/')) return FileText
  return File
}

function canPreview(mime: string) {
  return mime.startsWith('image/') || mime.startsWith('video/') || mime.startsWith('audio/') || mime === 'application/pdf'
}

async function jsonFetch(url: string, init?: RequestInit) {
  const response = await fetch(url, init)
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'Request failed')
  return data
}

function xhrUpload(url: string, chunk: Blob, start: number, end: number, total: number, onProgress: (value: number) => void) {
  return new Promise<{ status: number; range: string | null; data: { id: string } | null }>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', url)
    xhr.setRequestHeader('Content-Range', `bytes ${start}-${end}/${total}`)
    xhr.upload.onprogress = event => {
      if (event.lengthComputable) onProgress(Math.min(1, (start + event.loaded) / total))
    }
    xhr.onload = () => {
      let data: { id: string } | null = null
      try { data = xhr.responseText ? JSON.parse(xhr.responseText) as { id: string } : null } catch {}
      resolve({ status: xhr.status, range: xhr.getResponseHeader('Range'), data })
    }
    xhr.onerror = () => reject(new Error('Upload connection failed'))
    xhr.ontimeout = () => reject(new Error('Upload timed out'))
    xhr.timeout = 0
    xhr.send(chunk)
  })
}

async function uploadToGoogle(file: File, sessionUrl: string, statusUrl: string, uploadId: string, initialOffset: number, onProgress: (value: number) => void) {
  let offset = Math.max(0, Math.min(file.size, initialOffset))
  onProgress(file.size ? offset / file.size : 1)

  while (offset < file.size) {
    const end = Math.min(offset + CHUNK, file.size) - 1
    const chunk = file.slice(offset, end + 1)
    try {
      const result = await xhrUpload(sessionUrl, chunk, offset, end, file.size, onProgress)
      if (result.status >= 200 && result.status < 300 && result.data?.id) {
        onProgress(1)
        return result.data
      }
      if (result.status === 308) {
        const match = result.range?.match(/bytes=0-(\d+)/)
        if (match) {
          offset = Math.min(file.size, Number(match[1]) + 1)
          onProgress(offset / file.size)
          continue
        }
      }
      throw new Error(`Google upload failed (${result.status})`)
    } catch (error) {
      const status = await jsonFetch(`${statusUrl}?uploadId=${encodeURIComponent(uploadId)}`)
      if (status.complete && status.driveFileId) {
        onProgress(1)
        return { id: status.driveFileId }
      }
      if (typeof status.uploadedBytes === 'number') {
        offset = Math.max(offset, Math.min(file.size, status.uploadedBytes))
        onProgress(offset / file.size)
      }
      if (error instanceof Error && error.message.startsWith('Google upload failed')) throw error
      await new Promise(resolve => setTimeout(resolve, 700))
    }
  }
  throw new Error('Google did not confirm the upload')
}

export default function Workspace({ token }: { token: string }) {
  const input = useRef<HTMLInputElement>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [currentFolderId, setCurrentFolderId] = useState('')
  const [rootId, setRootId] = useState('')
  const [trail, setTrail] = useState<TrailItem[]>([])
  const [usedBytes, setUsedBytes] = useState(0)
  const [pendingBytes, setPendingBytes] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [uploads, setUploads] = useState<UploadState[]>([])
  const [recoveries, setRecoveries] = useState<Recovery[]>([])
  const [folderName, setFolderName] = useState('')
  const [showFolder, setShowFolder] = useState(false)
  const [dialog, setDialog] = useState<Dialog>(null)
  const [dialogValue, setDialogValue] = useState('')
  const [preview, setPreview] = useState<Item | null>(null)
  const [actionBusy, setActionBusy] = useState(false)
  const [dragging, setDragging] = useState(false)

  async function load(parentId?: string) {
    setLoading(true); setError('')
    try {
      const data = await jsonFetch(`/api/projects/${token}${parentId ? `?parentId=${encodeURIComponent(parentId)}` : ''}`)
      setProject(data.project); setItems(data.items); setUsedBytes(data.usedBytes); setPendingBytes(data.pendingBytes || 0); setCurrentFolderId(data.currentFolderId)
      if (!rootId) { setRootId(data.currentFolderId); setTrail([{ id: data.currentFolderId, name: data.project.name }]) }
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load project') }
    finally { setLoading(false) }
  }

  async function loadRecoveries() {
    try {
      const data = await jsonFetch(`/api/projects/${token}/upload/recover`)
      setRecoveries(data.uploads || [])
    } catch {}
  }

  useEffect(() => { void load(); void loadRecoveries() }, [token])

  async function openFolder(folder: Item) {
    await load(folder.id); setTrail(prev => [...prev, { id: folder.id, name: folder.name }])
  }

  async function goToTrail(index: number) {
    const target = trail[index]
    if (!target) return
    await load(target.id === rootId ? undefined : target.id); setTrail(prev => prev.slice(0, index + 1))
  }

  async function createFolder() {
    const name = folderName.trim(); if (!name) return
    setActionBusy(true)
    try {
      await jsonFetch(`/api/projects/${token}/folders`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, parentId: currentFolderId || undefined }) })
      setFolderName(''); setShowFolder(false); await load(currentFolderId || undefined)
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to create folder') }
    finally { setActionBusy(false) }
  }

  async function uploadFile(file: File) {
    const clientUploadId = crypto.randomUUID(); const parentId = currentFolderId
    const recovery = recoveries.find(item => item.name === file.name && item.sizeBytes === file.size && item.folderId === (parentId === rootId ? null : parentId))
    let serverUploadId: string | null = recovery?.uploadId || null
    setUploads(prev => [...prev, { id: clientUploadId, name: file.name, progress: recovery?.sizeBytes ? recovery.uploadedBytes / recovery.sizeBytes : 0, status: 'uploading' }])
    const setProgress = (progress: number) => setUploads(prev => prev.map(u => u.id === clientUploadId ? { ...u, progress } : u))

    try {
      const init = recovery ? { uploadId: recovery.uploadId, sessionUrl: recovery.sessionUrl, uploadedBytes: recovery.uploadedBytes } : await jsonFetch(`/api/projects/${token}/upload`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: file.name, mimeType: file.type, size: file.size, parentId: parentId || undefined }) })
      serverUploadId = init.uploadId
      if ('complete' in init && init.complete) {
        setProgress(1)
      } else {
        const statusUrl = `/api/projects/${token}/upload/status`
        await uploadToGoogle(file, init.sessionUrl, statusUrl, init.uploadId, recovery?.uploadedBytes || 0, setProgress)
        await jsonFetch(`/api/projects/${token}/upload/complete`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ uploadId: init.uploadId }) })
      }
      setRecoveries(prev => prev.filter(item => item.uploadId !== serverUploadId))
      setUploads(prev => prev.map(u => u.id === clientUploadId ? { ...u, progress: 1, status: 'complete' } : u))
      await load(parentId || undefined)
    } catch (e) {
      setUploads(prev => prev.map(u => u.id === clientUploadId ? { ...u, status: 'error', error: e instanceof Error ? e.message : 'Upload failed' } : u))
      if (serverUploadId) await jsonFetch(`/api/projects/${token}/upload/fail`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ uploadId: serverUploadId }) }).catch(() => undefined)
      await load(parentId || undefined).catch(() => undefined); await loadRecoveries()
    }
  }

  function addFiles(list: FileList | null) {
    if (!list) return
    Array.from(list).forEach(file => { void uploadFile(file) })
    if (input.current) input.current.value = ''
  }

  async function renameItem() {
    if (!dialog || dialog.type !== 'rename') return
    const name = dialogValue.trim(); if (!name) return
    setActionBusy(true)
    try {
      const path = dialog.kind === 'file' ? `/api/projects/${token}/files/${encodeURIComponent(dialog.id)}` : `/api/projects/${token}/folders/${encodeURIComponent(dialog.id)}`
      await jsonFetch(path, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) })
      setDialog(null); await load(currentFolderId || undefined)
      if (dialog.kind === 'folder') setTrail(prev => prev.map(item => item.id === dialog.id ? { ...item, name } : item))
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to rename item') }
    finally { setActionBusy(false) }
  }

  async function deleteItem() {
    if (!dialog || dialog.type !== 'delete') return
    setActionBusy(true)
    try {
      const path = dialog.kind === 'file' ? `/api/projects/${token}/files/${encodeURIComponent(dialog.id)}` : `/api/projects/${token}/folders/${encodeURIComponent(dialog.id)}`
      await jsonFetch(path, { method: 'DELETE' }); setDialog(null); await load(currentFolderId || undefined)
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to delete item') }
    finally { setActionBusy(false) }
  }

  function startRename(kind: 'file' | 'folder', item: Item) { setDialog({ type: 'rename', kind, id: item.id, name: item.name }); setDialogValue(item.name) }
  function startDelete(kind: 'file' | 'folder', item: Item) { setDialog({ type: 'delete', kind, id: item.id, name: item.name }) }
  function downloadFile(file: Item) {
    const link = document.createElement('a'); link.href = `/api/projects/${token}/files/${encodeURIComponent(file.id)}`; link.download = file.name; link.target = '_blank'; link.rel = 'noreferrer'; document.body.appendChild(link); link.click(); link.remove()
  }

  if (loading && !project) return <div className="drop-shell"><div className="client-loading"><div className="client-mark">MINIMICAL<span>DROP</span></div><Loader2 className="drop-spin" size={20}/><p>Opening your private project space</p></div></div>
  if (error && !project) return <div className="drop-shell"><div className="client-empty"><div className="client-mark">MINIMICAL<span>DROP</span></div><AlertCircle size={28}/><h2>Upload space unavailable</h2><p>{error}</p></div></div>
  if (!project) return null

  const folders = items.filter(item => item.mimeType === FOLDER_MIME)
  const files = items.filter(item => item.mimeType !== FOLDER_MIME)
  const reserved = usedBytes + pendingBytes
  const usage = project.storageLimitBytes ? Math.min(100, usedBytes / project.storageLimitBytes * 100) : 0
  const reservedUsage = project.storageLimitBytes ? Math.min(100, reserved / project.storageLimitBytes * 100) : 0
  const expires = new Date(project.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
  const isRoot = currentFolderId === rootId

  return <div className="drop-shell">
    <header className="client-header">
      <div className="client-mark">MINIMICAL<span>DROP</span></div>
      <div className="client-header-meta"><span className="client-live-dot"/> PRIVATE PROJECT SPACE</div>
    </header>

    <main className="client-main">
      <section className="client-hero">
        <div>
          <div className="client-kicker">PROJECT DELIVERY</div>
          <h1>{project.name}</h1>
          <p>Prepared for <strong>{project.clientName}</strong><span className="client-separator"/>Access expires {expires}</p>
        </div>
        <div className="client-hero-note"><span>PRIVATE BY DESIGN</span><p>Your files stay inside this project space and move directly to studio storage.</p></div>
      </section>

      <section className="client-workspace">
        <div className="client-toolbar">
          <div className="client-breadcrumbs">{trail.map((item, index) => <span key={item.id}>{index > 0 && <ChevronRight size={13}/>}<button onClick={() => void goToTrail(index)} className={index === trail.length - 1 ? 'active' : ''}>{item.name}</button></span>)}</div>
          <div className="client-actions"><button className="client-btn secondary" onClick={() => setShowFolder(true)}><FolderPlus size={15}/> New folder</button><button className="client-btn primary" onClick={() => input.current?.click()}><Upload size={15}/> Upload</button></div>
        </div>

        <div className="client-content">
          <input ref={input} hidden type="file" multiple onChange={e => addFiles(e.target.files)}/>
          <div className={`client-dropzone ${dragging ? 'is-dragging' : ''}`} onDragEnter={e => { e.preventDefault(); setDragging(true) }} onDragOver={e => e.preventDefault()} onDragLeave={e => { if (e.currentTarget === e.target) setDragging(false) }} onDrop={e => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files) }} onClick={() => input.current?.click()}>
            <div className="client-drop-glow"/><div className="client-drop-icon"><ArrowUp size={21}/></div><div><strong>Drop files here</strong><span>or browse from your computer</span></div>
          </div>

          {recoveries.length > 0 && <div className="client-recovery"><div><RefreshCw size={15}/><div><strong>{recoveries.length} interrupted upload{recoveries.length > 1 ? 's' : ''}</strong><span>Select the same file again to resume where it stopped.</span></div></div><button onClick={() => void loadRecoveries()}>Refresh</button></div>}

          {uploads.length > 0 && <div className="client-transfers"><div className="client-section-head"><span>TRANSFERS</span><button onClick={() => setUploads([])}>Clear</button></div>{uploads.map(upload => <div className="client-transfer" key={upload.id}><div className="client-transfer-icon">{upload.status === 'complete' ? <Check size={15}/> : upload.status === 'error' ? <AlertCircle size={15}/> : <Loader2 size={15} className="drop-spin"/>}</div><div className="client-transfer-main"><div><strong>{upload.name}</strong><span>{upload.status === 'complete' ? 'Uploaded' : upload.status === 'error' ? upload.error : `${Math.round(upload.progress * 100)}%`}</span></div><div className="client-progress"><i style={{ width: `${Math.round(upload.progress * 100)}%` }}/></div></div></div>)}</div>}

          <div className="client-list-head"><div><span>{folders.length + files.length} ITEMS</span><strong>{isRoot ? 'Project files' : trail[trail.length - 1]?.name}</strong></div><div className="client-usage"><HardDrive size={15}/><div><span>{formatBytes(reserved)} {project.storageLimitBytes ? `/ ${formatBytes(project.storageLimitBytes)}` : 'stored'}</span><div className="client-usage-track"><i style={{ width: `${Math.max(usage, reservedUsage)}%` }}/></div></div></div></div>

          {folders.length === 0 && files.length === 0 ? <div className="client-empty-list"><Folder size={28}/><strong>This space is empty</strong><span>Drop files above to start the delivery.</span></div> : <div className="client-items">
            {folders.map(folder => <div className="client-item client-folder" key={folder.id} onDoubleClick={() => void openFolder(folder)}><button className="client-item-main" onClick={() => void openFolder(folder)}><span className="client-item-icon folder"><Folder size={18}/></span><span><strong>{folder.name}</strong><small>Folder</small></span></button><div className="client-item-actions"><button title="Rename" onClick={e => { e.stopPropagation(); startRename('folder', folder) }}><Pencil size={15}/></button><button title="Delete" onClick={e => { e.stopPropagation(); startDelete('folder', folder) }}><Trash2 size={15}/></button><button title="Open" onClick={() => void openFolder(folder)}><ChevronRight size={16}/></button></div></div>)}
            {files.map(file => { const Icon = fileIcon(file.mimeType); return <div className="client-item" key={file.id} onDoubleClick={() => canPreview(file.mimeType) && setPreview(file)}><button className="client-item-main" onClick={() => canPreview(file.mimeType) ? setPreview(file) : downloadFile(file)}><span className="client-item-icon"><Icon size={18}/></span><span><strong>{file.name}</strong><small>{formatBytes(file.sizeBytes)}{file.modifiedTime ? ` · ${formatDate(file.modifiedTime)}` : ''}</small></span></button><div className="client-item-actions"><button title="Download" onClick={e => { e.stopPropagation(); downloadFile(file) }}><Download size={15}/></button><button title="Rename" onClick={e => { e.stopPropagation(); startRename('file', file) }}><Pencil size={15}/></button><button title="Delete" onClick={e => { e.stopPropagation(); startDelete('file', file) }}><Trash2 size={15}/></button><button title="More" onClick={e => { e.stopPropagation(); canPreview(file.mimeType) && setPreview(file) }}><MoreHorizontal size={16}/></button></div></div> })}
          </div>}
        </div>
      </section>

      <footer className="client-footer"><span>MINIMICAL DROP</span><span>{project.clientName} · Private delivery</span></footer>
    </main>

    {showFolder && <div className="client-overlay" onMouseDown={e => e.target === e.currentTarget && setShowFolder(false)}><div className="client-dialog"><button className="client-dialog-close" onClick={() => setShowFolder(false)}><X size={17}/></button><span className="client-dialog-kicker">NEW FOLDER</span><h2>Create a folder</h2><p>Keep this project organised without leaving the delivery space.</p><input autoFocus value={folderName} onChange={e => setFolderName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void createFolder() }} placeholder="Folder name"/><div className="client-dialog-actions"><button className="client-btn secondary" onClick={() => setShowFolder(false)}>Cancel</button><button className="client-btn primary" disabled={actionBusy || !folderName.trim()} onClick={() => void createFolder()}>{actionBusy ? 'Creating…' : 'Create folder'}</button></div></div></div>}

    {dialog && <div className="client-overlay" onMouseDown={e => e.target === e.currentTarget && setDialog(null)}><div className="client-dialog"><button className="client-dialog-close" onClick={() => setDialog(null)}><X size={17}/></button><span className="client-dialog-kicker">{dialog.type === 'delete' ? 'DELETE' : 'RENAME'} {dialog.kind.toUpperCase()}</span><h2>{dialog.type === 'delete' ? 'Remove this item?' : 'Rename this item'}</h2><p>{dialog.type === 'delete' ? <>{dialog.name} will be removed from this project and its Drive storage.</> : <>Choose a new name for <strong>{dialog.name}</strong>.</>}</p>{dialog.type === 'rename' && <input autoFocus value={dialogValue} onChange={e => setDialogValue(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void renameItem() }}/>}<div className="client-dialog-actions"><button className="client-btn secondary" onClick={() => setDialog(null)}>Cancel</button><button className={`client-btn ${dialog.type === 'delete' ? 'danger' : 'primary'}`} disabled={actionBusy} onClick={() => void (dialog.type === 'delete' ? deleteItem() : renameItem())}>{actionBusy ? 'Working…' : dialog.type === 'delete' ? 'Delete' : 'Save name'}</button></div></div></div>}

    {preview && <div className="client-preview" onMouseDown={e => e.target === e.currentTarget && setPreview(null)}><div className="client-preview-top"><div><span>PREVIEW</span><strong>{preview.name}</strong></div><div><button onClick={() => downloadFile(preview)}><Download size={15}/> Download</button><button onClick={() => setPreview(null)}><X size={18}/></button></div></div><div className="client-preview-body">{preview.mimeType.startsWith('image/') && <img src={`/api/projects/${token}/files/${encodeURIComponent(preview.id)}?inline=1`} alt={preview.name}/>} {preview.mimeType.startsWith('video/') && <video controls autoPlay src={`/api/projects/${token}/files/${encodeURIComponent(preview.id)}?inline=1`}/>} {preview.mimeType.startsWith('audio/') && <audio controls autoPlay src={`/api/projects/${token}/files/${encodeURIComponent(preview.id)}?inline=1`}/>} {preview.mimeType === 'application/pdf' && <iframe title={preview.name} src={`/api/projects/${token}/files/${encodeURIComponent(preview.id)}?inline=1`}/>}</div></div>}
  </div>
}
