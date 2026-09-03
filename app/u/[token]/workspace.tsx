'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowUp, ChevronRight, File, Folder, FolderPlus, Upload, X } from 'lucide-react'

type Item = { id: string; name: string; mimeType: string; sizeBytes: number; modifiedTime: string | null }
type Project = { id: string; name: string; clientName: string; expiresAt: string; storageLimitBytes: number | null }
type UploadState = { name: string; progress: number; status: 'uploading' | 'complete' | 'error'; error?: string }
const FOLDER_MIME = 'application/vnd.google-apps.folder'
const CHUNK = 8 * 1024 * 1024

function formatBytes(bytes: number) {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / 1024 ** i).toFixed(i ? 1 : 0)} ${units[i]}`
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

      if (result.status === 308 && result.range) {
        const match = result.range.match(/bytes=0-(\d+)/)
        if (match) {
          offset = Number(match[1]) + 1
          onProgress(offset / file.size)
          continue
        }
      }

      if (result.status >= 400 && result.status < 500) {
        throw new Error(`Google upload failed (${result.status})`)
      }
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
      continue
    }

    const status = await jsonFetch(`${statusUrl}?uploadId=${encodeURIComponent(uploadId)}`)
    if (status.complete && status.driveFileId) {
      onProgress(1)
      return { id: status.driveFileId }
    }
    if (typeof status.uploadedBytes === 'number' && status.uploadedBytes > offset) {
      offset = Math.min(file.size, status.uploadedBytes)
      onProgress(offset / file.size)
      continue
    }
    throw new Error('Upload connection failed')
  }

  throw new Error('Google did not confirm the upload')
}

export default function Workspace({ token }: { token: string }) {
  const input = useRef<HTMLInputElement>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [currentFolderId, setCurrentFolderId] = useState('')
  const [rootId, setRootId] = useState('')
  const [usedBytes, setUsedBytes] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [folderName, setFolderName] = useState('')
  const [showFolder, setShowFolder] = useState(false)
  const [uploads, setUploads] = useState<UploadState[]>([])

  async function load(parentId?: string) {
    setLoading(true); setError('')
    try {
      const data = await jsonFetch(`/api/projects/${token}${parentId ? `?parentId=${encodeURIComponent(parentId)}` : ''}`)
      setProject(data.project); setItems(data.items); setUsedBytes(data.usedBytes)
      if (!rootId) setRootId(data.currentFolderId)
      setCurrentFolderId(data.currentFolderId)
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load project') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [token])

  async function createFolder() {
    const name = folderName.trim()
    if (!name) return
    try {
      await jsonFetch(`/api/projects/${token}/folders`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, parentId: currentFolderId || undefined }) })
      setFolderName(''); setShowFolder(false); await load(currentFolderId || undefined)
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to create folder') }
  }

  async function uploadFile(file: File) {
    setUploads(prev => [...prev, { name: file.name, progress: 0, status: 'uploading' }])
    const setProgress = (progress: number) => setUploads(prev => prev.map(u => u.name === file.name ? { ...u, progress } : u))
    try {
      const init = await jsonFetch(`/api/projects/${token}/upload`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: file.name, mimeType: file.type, size: file.size, parentId: currentFolderId || undefined }) })
      const statusUrl = `/api/projects/${token}/upload/status`
      const driveFile = await uploadToGoogle(file, init.sessionUrl, statusUrl, init.uploadId, setProgress)
      await jsonFetch(`/api/projects/${token}/upload/complete`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ uploadId: init.uploadId }) })
      setUploads(prev => prev.map(u => u.name === file.name ? { ...u, progress: 1, status: 'complete' } : u))
      await load(currentFolderId || undefined)
    } catch (e) {
      setUploads(prev => prev.map(u => u.name === file.name ? { ...u, status: 'error', error: e instanceof Error ? e.message : 'Upload failed' } : u))
    }
  }

  function addFiles(list: FileList | null) {
    if (!list) return
    Array.from(list).forEach(file => { void uploadFile(file) })
    if (input.current) input.current.value = ''
  }

  if (loading && !project) return <div className="shell"><header className="topbar"><div className="brand">MINIMICAL <span>DROP</span></div></header><main className="main"><p>Loading secure upload space…</p></main></div>
  if (error && !project) return <div className="shell"><header className="topbar"><div className="brand">MINIMICAL <span>DROP</span></div></header><main className="main"><div className="workspace"><div className="content"><h2>Upload space unavailable</h2><p>{error}</p></div></div></main></div>
  if (!project) return null

  const folders = items.filter(item => item.mimeType === FOLDER_MIME)
  const files = items.filter(item => item.mimeType !== FOLDER_MIME)
  const usage = project.storageLimitBytes ? Math.min(100, usedBytes / project.storageLimitBytes * 100) : 0
  const isRoot = currentFolderId === rootId
  const expires = new Date(project.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })

  return <div className="shell">
    <header className="topbar"><div className="brand">MINIMICAL <span>DROP</span></div><div className="eyebrow">PRIVATE CLIENT PORTAL</div></header>
    <main className="main">
      <div className="hero"><div><div className="eyebrow">FILE DELIVERY / UPLOAD</div><h1>Your files.<br/>One private place.</h1></div><p>A private project space for sending files directly to the studio. Your access link is temporary and your Google Drive credentials are never shared.</p></div>
      <section className="workspace">
        <div className="workspaceHead"><div><div className="projectTitle">{project.name}</div><div className="meta">{project.clientName} · Access expires {expires}</div></div><div className="actions"><button className="btn" onClick={()=>setShowFolder(true)}><FolderPlus size={14}/> New folder</button><button className="btn lime" onClick={()=>input.current?.click()}><Upload size={14}/> Upload</button></div></div>
        <div className="content">
          <input ref={input} hidden type="file" multiple onChange={e=>addFiles(e.target.files)}/>
          <div className="dropzone" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();addFiles(e.dataTransfer.files)}} onClick={()=>input.current?.click()}>
            <div><div className="dropicon"><ArrowUp size={20}/></div><h2>Drop files here</h2><p>or click to browse your computer</p></div>
          </div>
          {uploads.length > 0 && <div className="folders"><div className="sectionTitle">Uploads</div>{uploads.map((u,i)=><div className="folder" key={`${u.name}-${i}`}><div className="folderIcon"><Upload size={16}/></div><div style={{flex:1}}><div className="folderName">{u.name}</div><div className="folderCount">{u.status === 'complete' ? 'Uploaded' : u.status === 'error' ? u.error : `${Math.round(u.progress*100)}%`}</div></div>{u.status === 'uploading' && <div style={{width:90,height:4,background:'#e9e9e3',borderRadius:9,overflow:'hidden'}}><i style={{display:'block',height:'100%',width:`${u.progress*100}%`,background:'#171713'}}/></div>}</div>)}</div>}
          <div className="folders"><div className="sectionTitle">{!isRoot && <button className="btn" style={{marginRight:8,padding:'6px 9px'}} onClick={()=>load(rootId)}><ArrowLeft size={13}/></button>} Folders</div>{folders.map(folder=><button className="folder" style={{width:'100%',textAlign:'left'}} key={folder.id} onClick={()=>load(folder.id)}><div className="folderIcon"><Folder size={17}/></div><div style={{flex:1}}><div className="folderName">{folder.name}</div><div className="folderCount">Folder</div></div><ChevronRight size={16} color="#aaa"/></button>)}</div>
          <div className="folders"><div className="sectionTitle">Files</div>{files.length ? files.map(file=><div className="folder" key={file.id}><div className="folderIcon"><File size={17}/></div><div style={{flex:1}}><div className="folderName">{file.name}</div><div className="folderCount">{formatBytes(file.sizeBytes)}</div></div></div>) : <div className="meta">No files in this folder yet.</div>}</div>
          <div className="footer"><span>Storage · {formatBytes(usedBytes)}{project.storageLimitBytes ? ` of ${formatBytes(project.storageLimitBytes)}` : ''}</span><span>{project.storageLimitBytes ? `${Math.round(usage)}% used` : 'No limit set'}</span></div>{project.storageLimitBytes && <div className="progress"><i style={{width:`${usage}%`}}/></div>}
          {error && <p className="meta" style={{marginTop:16}}>{error}</p>}
        </div>
      </section>
    </main>
    {showFolder&&<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.28)',display:'grid',placeItems:'center',zIndex:30}} onClick={()=>setShowFolder(false)}><div style={{width:'min(420px,calc(100% - 32px))',background:'#fff',borderRadius:16,padding:24}} onClick={e=>e.stopPropagation()}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><b>New folder</b><button className="btn" onClick={()=>setShowFolder(false)}><X size={15}/></button></div><input autoFocus value={folderName} onChange={e=>setFolderName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&createFolder()} placeholder="Folder name" style={{width:'100%',marginTop:20,padding:'13px 14px',border:'1px solid #deded7',borderRadius:10,outline:'none'}}/><button className="btn primary" style={{marginTop:12,width:'100%'}} onClick={createFolder}>Create folder</button></div></div>}
  </div>
}
