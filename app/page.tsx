'use client'

import { useRef, useState } from 'react'
import { ArrowUp, ChevronRight, Folder, FolderPlus, Upload, X } from 'lucide-react'

const initialFolders = [
  { name: 'RAW FOOTAGE', count: '0 files' },
  { name: 'ALBUM IMAGES', count: '0 files' },
  { name: 'DOCUMENTS', count: '0 files' },
]

export default function Home() {
  const [folders, setFolders] = useState(initialFolders)
  const [files, setFiles] = useState<File[]>([])
  const [folderName, setFolderName] = useState('')
  const [showFolder, setShowFolder] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  function addFiles(list: FileList | null) {
    if (!list) return
    setFiles(prev => [...prev, ...Array.from(list)])
  }
  function createFolder() {
    const name = folderName.trim()
    if (!name) return
    setFolders(prev => [...prev, { name: name.toUpperCase(), count: '0 files' }])
    setFolderName(''); setShowFolder(false)
  }

  return <div className="shell">
    <header className="topbar"><div className="brand">MINIMICAL <span>DROP</span></div><div className="eyebrow">PRIVATE CLIENT PORTAL</div></header>
    <main className="main">
      <div className="hero"><div><div className="eyebrow">FILE DELIVERY / UPLOAD</div><h1>Your files.<br/>One private place.</h1></div><p>A simple, secure space for your project files. Upload directly to the studio without sharing your Google Drive credentials.</p></div>
      <section className="workspace">
        <div className="workspaceHead"><div><div className="projectTitle">SHARMA WEDDING</div><div className="meta">Client upload space · Access expires 24 September 2026</div></div><div className="actions"><button className="btn" onClick={()=>setShowFolder(true)}><FolderPlus size={14}/> New folder</button><button className="btn lime" onClick={()=>input.current?.click()}><Upload size={14}/> Upload</button></div></div>
        <div className="content">
          <input ref={input} hidden type="file" multiple onChange={e=>addFiles(e.target.files)}/>
          <div className="dropzone" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();addFiles(e.dataTransfer.files)}} onClick={()=>input.current?.click()}>
            <div><div className="dropicon"><ArrowUp size={20}/></div><h2>Drop files here</h2><p>or click to browse your computer</p>{files.length>0&&<p style={{marginTop:12,fontWeight:600,color:'#171713'}}>{files.length} file{files.length>1?'s':''} selected</p>}</div>
          </div>
          <div className="folders"><div className="sectionTitle">Folders</div>{folders.map((f,i)=><div className="folder" key={f.name}><div className="folderIcon"><Folder size={17}/></div><div style={{flex:1}}><div className="folderName">{f.name}</div><div className="folderCount">{f.count}</div></div><ChevronRight size={16} color="#aaa"/></div>)}</div>
          <div className="footer"><span>Storage · 287.6 GB of 500 GB</span><span>57% used</span></div><div className="progress"><i/></div>
        </div>
      </section>
    </main>
    {showFolder&&<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.28)',display:'grid',placeItems:'center',zIndex:30}} onClick={()=>setShowFolder(false)}><div style={{width:'min(420px,calc(100% - 32px))',background:'#fff',borderRadius:16,padding:24}} onClick={e=>e.stopPropagation()}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><b>New folder</b><button className="btn" onClick={()=>setShowFolder(false)}><X size={15}/></button></div><input autoFocus value={folderName} onChange={e=>setFolderName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&createFolder()} placeholder="Folder name" style={{width:'100%',marginTop:20,padding:'13px 14px',border:'1px solid #deded7',borderRadius:10,outline:'none'}}/><button className="btn primary" style={{marginTop:12,width:'100%'}} onClick={createFolder}>Create folder</button></div></div>}
  </div>
}
