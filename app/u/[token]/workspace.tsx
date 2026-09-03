'use client'

import { useEffect, useRef, useState } from 'react'
import {
  AlertCircle,
  ArrowLeft,
  ArrowUp,
  Check,
  ChevronRight,
  Download,
  File,
  Folder,
  FolderPlus,
  HardDrive,
  Loader2,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  Trash2,
  Upload,
  X,
} from 'lucide-react'

type Item = { id: string; name: string; mimeType: string; sizeBytes: number; modifiedTime: string | null }
type Project = { id: string; name: string; clientName: string; expiresAt: string; storageLimitBytes: number | null }
type UploadState = { id: string; name: string; progress: number; status: 'uploading' | 'complete' | 'error'; error?: string }
type TrailItem = { id: string; name: string }
type Dialog = { type: 'rename' | 'delete'; kind: 'file' | 'folder'; id: string; name: string } | null

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

async function uploadToGoogle(file: File, sessionUrl: string, statusUrl: string, uploadId: string, onProgress: (value: number) => void) {
  if (file.size === 0) {
    try {
      const result = await xhrUpload(sessionUrl, new Blob([]), 0, 0, 0, onProgress)
      if (result.data?.id) return result.data
    } catch {}
    const status = await jsonFetch(`${statusUrl}?uploadId=${encodeURIComponent(uploadId)}`)
    if (status.complete && status.driveFileId) {
      onProgress(1)
      return { id: status.driveFileId }
    }
    throw new Error('Empty file upload could not be confirmed')
  }

  let offset = 0
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
          offset = Number(match[1]) + 1
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
        if (offset >= file.size) {
          const completed = await jsonFetch(`${statusUrl}?uploadId=${encodeURIComponent(uploadId)}`)
          if (completed.complete && completed.driveFileId) return { id: completed.driveFileId }
        }
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
  const [folderName, setFolderName] = useState('')
  const [showFolder, setShowFolder] = useState(false)
  const [uploads, setUploads] = useState<UploadState[]>([])
  const [dialog, setDialog] = useState<Dialog>(null)
  const [dialogValue, setDialogValue] = useState('')
  const [actionBusy, setActionBusy] = useState(false)

  async function load(parentId?: string) {
    setLoading(true)
    setError('')
    try {
      const data = await jsonFetch(`/api/projects/${token}${parentId ? `?parentId=${encodeURIComponent(parentId)}` : ''}`)
      setProject(data.project)
      setItems(data.items)
      setUsedBytes(data.usedBytes)
      setPendingBytes(data.pendingBytes || 0)
      setCurrentFolderId(data.currentFolderId)
      if (!rootId) {
        setRootId(data.currentFolderId)
        setTrail([{ id: data.currentFolderId, name: data.project.name }])
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load project')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [token])

  async function openFolder(folder: Item) {
    await load(folder.id)
    setTrail(prev => [...prev, { id: folder.id, name: folder.name }])
  }

  async function goToTrail(index: number) {
    const target = trail[index]
    if (!target) return
    await load(target.id === rootId ? undefined : target.id)
    setTrail(prev => prev.slice(0, index + 1))
  }

  async function createFolder() {
    const name = folderName.trim()
    if (!name) return
    setActionBusy(true)
    try {
      await jsonFetch(`/api/projects/${token}/folders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, parentId: currentFolderId || undefined }),
      })
      setFolderName('')
      setShowFolder(false)
      await load(currentFolderId || undefined)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to create folder')
    } finally {
      setActionBusy(false)
    }
  }

  async function uploadFile(file: File) {
    const clientUploadId = crypto.randomUUID()
    const parentId = currentFolderId
    let serverUploadId: string | null = null
    setUploads(prev => [...prev, { id: clientUploadId, name: file.name, progress: 0, status: 'uploading' }])
    const setProgress = (progress: number) => setUploads(prev => prev.map(u => u.id === clientUploadId ? { ...u, progress } : u))

    try {
      const init = await jsonFetch(`/api/projects/${token}/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: file.name, mimeType: file.type, size: file.size, parentId: parentId || undefined }),
      })
      serverUploadId = init.uploadId
      const statusUrl = `/api/projects/${token}/upload/status`
      await uploadToGoogle(file, init.sessionUrl, statusUrl, init.uploadId, setProgress)
      await jsonFetch(`/api/projects/${token}/upload/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uploadId: init.uploadId }),
      })
      setUploads(prev => prev.map(u => u.id === clientUploadId ? { ...u, progress: 1, status: 'complete' } : u))
      await load(parentId || undefined)
    } catch (e) {
      setUploads(prev => prev.map(u => u.id === clientUploadId ? { ...u, status: 'error', error: e instanceof Error ? e.message : 'Upload failed' } : u))
      if (serverUploadId) {
        await jsonFetch(`/api/projects/${token}/upload/fail`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uploadId: serverUploadId }),
        }).catch(() => undefined)
      }
      await load(parentId || undefined).catch(() => undefined)
    }
  }

  function addFiles(list: FileList | null) {
    if (!list) return
    Array.from(list).forEach(file => { void uploadFile(file) })
    if (input.current) input.current.value = ''
  }

  async function renameItem() {
    if (!dialog || dialog.type !== 'rename') return
    const name = dialogValue.trim()
    if (!name) return
    setActionBusy(true)
    try {
      const path = dialog.kind === 'file'
        ? `/api/projects/${token}/files/${encodeURIComponent(dialog.id)}`
        : `/api/projects/${token}/folders/${encodeURIComponent(dialog.id)}`
      await jsonFetch(path, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      setDialog(null)
      await load(currentFolderId || undefined)
      if (dialog.kind === 'folder') setTrail(prev => prev.map(item => item.id === dialog.id ? { ...item, name } : item))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to rename item')
    } finally {
      setActionBusy(false)
    }
  }

  async function deleteItem() {
    if (!dialog || dialog.type !== 'delete') return
    setActionBusy(true)
    try {
      const path = dialog.kind === 'file'
        ? `/api/projects/${token}/files/${encodeURIComponent(dialog.id)}`
        : `/api/projects/${token}/folders/${encodeURIComponent(dialog.id)}`
      await jsonFetch(path, { method: 'DELETE' })
      setDialog(null)
      await load(currentFolderId || undefined)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to delete item')
    } finally {
      setActionBusy(false)
    }
  }

  function startRename(kind: 'file' | 'folder', item: Item) {
    setDialog({ type: 'rename', kind, id: item.id, name: item.name })
    setDialogValue(item.name)
  }

  function startDelete(kind: 'file' | 'folder', item: Item) {
    setDialog({ type: 'delete', kind, id: item.id, name: item.name })
  }

  function downloadFile(file: Item) {
    const link = document.createElement('a')
    link.href = `/api/projects/${token}/files/${encodeURIComponent(file.id)}`
    link.download = file.name
    link.target = '_blank'
    link.rel = 'noreferrer'
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  if (loading && !project) return <div className="drop-shell"><div className="drop-loading"><div className="drop-logo">MINIMICAL<span>DROP</span></div><Loader2 className="drop-spin" size={20}/><p>Opening your private project space</p></div></div>
  if (error && !project) return <div className="drop-shell"><div className="drop-empty"><div className="drop-logo">MINIMICAL<span>DROP</span></div><AlertCircle size={28}/><h2>Upload space unavailable</h2><p>{error}</p></div></div>
  if (!project) return null

  const folders = items.filter(item => item.mimeType === FOLDER_MIME)
  const files = items.filter(item => item.mimeType !== FOLDER_MIME)
  const usage = project.storageLimitBytes ? Math.min(100, usedBytes / project.storageLimitBytes * 100) : 0
  const reservedUsage = project.storageLimitBytes ? Math.min(100, (usedBytes + pendingBytes) / project.storageLimitBytes * 100) : 0
  const expires = new Date(project.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
  const isRoot = currentFolderId === rootId

  return <div className="drop-shell">
    <header className="drop-topbar">
      <div className="drop-logo">MINIMICAL<span>DROP</span></div>
      <div className="drop-secure"><span className="drop-secure-dot"/> PRIVATE CLIENT SPACE</div>
    </header>

    <main className="drop-main">
      <section className="drop-intro">
        <div>
          <div className="drop-kicker">PROJECT DELIVERY</div>
          <h1>{project.name}</h1>
          <p className="drop-intro-meta">Prepared for {project.clientName} <span/> Access expires {expires}</p>
        </div>
        <div className="drop-intro-note"><span>PRIVATE BY DESIGN</span><p>Files move directly between this space and the studio storage. Your access link is temporary.</p></div>
      </section>

      <section className="drop-card">
        <div className="drop-toolbar">
          <div className="drop-breadcrumbs">{trail.map((item, index) => <span key={item.id}>{index > 0 && <ChevronRight size={13}/>}<button onClick={() => void goToTrail(index)} className={index === trail.length - 1 ? 'active' : ''}>{item.name}</button></span>)}</div>
          <div className="drop-actions"><button className="drop-button ghost" onClick={() => setShowFolder(true)}><FolderPlus size={15}/> New folder</button><button className="drop-button accent" onClick={() => input.current?.click()}><Upload size={15}/> Upload</button></div>
        </div>

        <div className="drop-body">
          <input ref={input} hidden type="file" multiple onChange={e => addFiles(e.target.files)}/>

          <div className="dropzone-v2" onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); addFiles(e.dataTransfer.files) }} onClick={() => input.current?.click()}>
            <div className="dropzone-glow"/><div className="drop-upload-mark"><ArrowUp size={21}/></div><div className="dropzone-copy"><strong>Drop files anywhere</strong><span>or click to browse from your computer</span></div><div className="dropzone-hint">DIRECT TO DRIVE</div>
          </div>

          {uploads.length > 0 && <section className="drop-section drop-upload-section"><div className="drop-section-head"><span>Current transfers</span><span>{uploads.filter(u => u.status === 'uploading').length ? 'Uploading' : 'Complete'}</span></div>{uploads.map(upload => <div className="drop-row transfer" key={upload.id}><div className="drop-file-icon"><Upload size={16}/></div><div className="drop-row-main"><strong>{upload.name}</strong><span>{upload.status === 'complete' ? 'Uploaded successfully' : upload.status === 'error' ? upload.error : `${Math.round(upload.progress * 100)}% uploaded`}</span></div>{upload.status === 'uploading' && <div className="drop-transfer-progress"><i style={{ width: `${upload.progress * 100}%` }}/></div>}{upload.status === 'complete' && <Check size={17} className="drop-success"/>}{upload.status === 'error' && <AlertCircle size={17} className="drop-error"/>}</div>)}</section>}

          {!isRoot && <button className="drop-parent" onClick={() => void goToTrail(Math.max(0, trail.length - 2))}><ArrowLeft size={15}/> Back to {trail.length > 1 ? trail[trail.length - 2]?.name : project.name}</button>}

          {folders.length > 0 && <section className="drop-section"><div className="drop-section-head"><span>Folders</span><span>{folders.length} {folders.length === 1 ? 'folder' : 'folders'}</span></div><div className="drop-list">{folders.map(folder => <div className="drop-row" key={folder.id}><button className="drop-row-click" onClick={() => void openFolder(folder)}><div className="drop-folder-icon"><Folder size={17}/></div><div className="drop-row-main"><strong>{folder.name}</strong><span>Folder</span></div></button><div className="drop-row-actions"><button title="Rename folder" aria-label={`Rename ${folder.name}`} onClick={() => startRename('folder', folder)}><Pencil size={14}/></button><button title="Delete folder" aria-label={`Delete ${folder.name}`} onClick={() => startDelete('folder', folder)}><Trash2 size={14}/></button><button className="drop-open" title="Open folder" aria-label={`Open ${folder.name}`} onClick={() => void openFolder(folder)}><ChevronRight size={16}/></button></div></div>)}</div></section>}

          <section className="drop-section"><div className="drop-section-head"><span>Files</span><span>{files.length} {files.length === 1 ? 'file' : 'files'}</span></div>{files.length ? <div className="drop-list">{files.map(file => <div className="drop-row" key={file.id}><div className="drop-file-icon"><File size={17}/></div><div className="drop-row-main"><strong>{file.name}</strong><span>{formatBytes(file.sizeBytes)} {file.modifiedTime ? `· ${formatDate(file.modifiedTime)}` : ''}</span></div><div className="drop-row-actions"><button title="Download file" aria-label={`Download ${file.name}`} onClick={() => downloadFile(file)}><Download size={15}/></button><button title="Rename file" aria-label={`Rename ${file.name}`} onClick={() => startRename('file', file)}><Pencil size={14}/></button><button title="Delete file" aria-label={`Delete ${file.name}`} onClick={() => startDelete('file', file)}><Trash2 size={14}/></button><button className="drop-more" title="More actions" aria-label={`More actions for ${file.name}`}><MoreHorizontal size={15}/></button></div></div>)}</div> : <div className="drop-empty-folder"><File size={19}/><span>No files in this folder yet.</span></div>}</section>

          <section className="drop-storage"><div className="drop-storage-top"><div className="drop-storage-title"><HardDrive size={15}/><span>Storage</span></div><div className="drop-storage-value">{formatBytes(usedBytes)}{project.storageLimitBytes ? ` / ${formatBytes(project.storageLimitBytes)}` : ''}</div></div>{project.storageLimitBytes ? <><div className="drop-storage-track"><i style={{ width: `${reservedUsage}%` }}/></div><div className="drop-storage-bottom"><span>{Math.round(usage)}% used{pendingBytes ? ` · ${Math.round(reservedUsage)}% reserved` : ''}</span><span>{pendingBytes ? `${formatBytes(pendingBytes)} uploading` : 'Ready for uploads'}</span></div></> : <div className="drop-storage-bottom"><span>No project storage limit</span><span>Ready for uploads</span></div>}</section>

          {error && <div className="drop-inline-error"><AlertCircle size={15}/>{error}<button onClick={() => void load(currentFolderId || undefined)}><RefreshCw size={14}/></button></div>}
        </div>
      </section>

      <footer className="drop-footer"><span>MINIMICAL DROP</span><span>Private project delivery</span></footer>
    </main>

    {showFolder && <div className="drop-overlay" onClick={() => !actionBusy && setShowFolder(false)}><div className="drop-dialog" onClick={e => e.stopPropagation()}><div className="drop-dialog-head"><div><span className="drop-dialog-kicker">PROJECT ORGANISATION</span><h3>New folder</h3></div><button onClick={() => setShowFolder(false)}><X size={17}/></button></div><input autoFocus value={folderName} onChange={e => setFolderName(e.target.value)} onKeyDown={e => e.key === 'Enter' && void createFolder()} placeholder="Folder name" maxLength={120}/><button className="drop-dialog-submit" disabled={actionBusy || !folderName.trim()} onClick={() => void createFolder()}>{actionBusy ? <Loader2 className="drop-spin" size={15}/> : <FolderPlus size={15}/>} Create folder</button></div></div>}

    {dialog && <div className="drop-overlay" onClick={() => !actionBusy && setDialog(null)}><div className="drop-dialog" onClick={e => e.stopPropagation()}><div className="drop-dialog-head"><div><span className="drop-dialog-kicker">{dialog.type === 'rename' ? 'EDIT NAME' : 'CONFIRM ACTION'}</span><h3>{dialog.type === 'rename' ? 'Rename item' : `Delete ${dialog.kind}`}</h3></div><button onClick={() => setDialog(null)}><X size={17}/></button></div>{dialog.type === 'rename' ? <><input autoFocus value={dialogValue} onChange={e => setDialogValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && void renameItem()} maxLength={dialog.kind === 'file' ? 255 : 120}/><button className="drop-dialog-submit" disabled={actionBusy || !dialogValue.trim()} onClick={() => void renameItem()}>{actionBusy ? <Loader2 className="drop-spin" size={15}/> : <Pencil size={15}/>} Save name</button></> : <><div className="drop-delete-copy"><Trash2 size={18}/><p>Delete <strong>{dialog.name}</strong>? {dialog.kind === 'folder' ? 'Everything inside this folder will also be permanently deleted.' : 'This file will be permanently removed.'}</p></div><div className="drop-dialog-actions"><button className="drop-cancel" disabled={actionBusy} onClick={() => setDialog(null)}>Cancel</button><button className="drop-delete-submit" disabled={actionBusy} onClick={() => void deleteItem()}>{actionBusy ? <Loader2 className="drop-spin" size={15}/> : <Trash2 size={15}/>} Delete permanently</button></div></>}</div></div>}
  </div>
}
