'use client'

import { FormEvent, useEffect, useState } from 'react'

const GB = 1024 ** 3

type Account = { id: string; label: string; google_email: string; root_folder_id: string | null }
type Project = { id: string; name: string; client_name: string; client_email: string | null; storage_limit_bytes: number | null; expires_at: string; disabled_at: string | null }

async function request(url: string, init?: RequestInit) {
  const response = await fetch(url, init)
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'Request failed')
  return data
}

export default function AdminPage() {
  const [loggedIn, setLoggedIn] = useState(false)
  const [checking, setChecking] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [accounts, setAccounts] = useState<Account[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [resultUrl, setResultUrl] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const [name, setName] = useState('')
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [storageGb, setStorageGb] = useState('500')

  async function load() {
    try {
      const data = await request('/api/admin/projects')
      setLoggedIn(true); setAccounts(data.accounts); setProjects(data.projects)
    } catch { setLoggedIn(false) }
    finally { setChecking(false) }
  }

  useEffect(() => { load() }, [])

  async function login(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('')
    try {
      await request('/api/admin/login', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email,password}) })
      window.location.href = '/admin'
    } catch (e) { setError(e instanceof Error ? e.message : 'Login failed') }
    finally { setBusy(false) }
  }

  async function createProject(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setResultUrl('')
    try {
      const data = await request('/api/admin/projects', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ name, clientName, clientEmail, expiresAt, storageLimitBytes: storageGb ? Number(storageGb) * GB : null }) })
      setResultUrl(data.url); setName(''); setClientName(''); setClientEmail(''); await load()
    } catch (e) { setError(e instanceof Error ? e.message : 'Project creation failed') }
    finally { setBusy(false) }
  }

  if (checking) return <main className="main"><p>Loading admin…</p></main>
  if (!loggedIn) return <main className="main" style={{maxWidth:520}}><div className="eyebrow">MINIMICAL DROP / ADMIN</div><h1 style={{fontSize:'clamp(42px,7vw,70px)',lineHeight:.95,letterSpacing:'-.06em'}}>Private control room.</h1><form onSubmit={login} className="workspace" style={{padding:24,marginTop:30}}><label className="sectionTitle">Email</label><input value={email} onChange={e=>setEmail(e.target.value)} type="email" autoComplete="username" required style={{width:'100%',margin:'8px 0 18px',padding:13,border:'1px solid #deded7',borderRadius:10}}/><label className="sectionTitle">Password</label><input value={password} onChange={e=>setPassword(e.target.value)} type="password" autoComplete="current-password" required style={{width:'100%',margin:'8px 0 18px',padding:13,border:'1px solid #deded7',borderRadius:10}}/><button className="btn primary" disabled={busy} style={{width:'100%'}}>{busy?'Signing in…':'Sign in'}</button>{error&&<p className="meta" style={{marginTop:14}}>{error}</p>}</form></main>

  return <main className="main">
    <div className="hero"><div><div className="eyebrow">MINIMICAL DROP / ADMIN</div><h1>Project control.</h1></div><p>Connect Drive, create client spaces and generate private upload links.</p></div>
    <section className="workspace"><div className="content">
      <div className="sectionTitle">Google Drive</div>
      {accounts.length ? accounts.map(account=><div className="folder" key={account.id}><div style={{flex:1}}><div className="folderName">{account.label}</div><div className="folderCount">{account.google_email}</div></div></div>) : <p className="meta">No Drive account connected.</p>}
      <a className="btn lime" href="/api/google/connect" style={{display:'inline-block',textDecoration:'none',marginTop:12}}>Connect Google Drive</a>

      <div className="sectionTitle" style={{marginTop:34}}>New project</div>
      <form onSubmit={createProject}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}><input value={name} onChange={e=>setName(e.target.value)} required placeholder="Project name" style={{padding:13,border:'1px solid #deded7',borderRadius:10}}/><input value={clientName} onChange={e=>setClientName(e.target.value)} required placeholder="Client name" style={{padding:13,border:'1px solid #deded7',borderRadius:10}}/></div>
        <input value={clientEmail} onChange={e=>setClientEmail(e.target.value)} type="email" placeholder="Client email (optional)" style={{width:'100%',marginTop:12,padding:13,border:'1px solid #deded7',borderRadius:10}}/>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginTop:12}}><input value={expiresAt} onChange={e=>setExpiresAt(e.target.value)} type="date" required style={{padding:13,border:'1px solid #deded7',borderRadius:10}}/><input value={storageGb} onChange={e=>setStorageGb(e.target.value)} type="number" min="1" placeholder="Storage GB" style={{padding:13,border:'1px solid #deded7',borderRadius:10}}/></div>
        <button className="btn primary" disabled={busy} style={{marginTop:12}}>{busy?'Creating…':'Create project + Drive folder'}</button>
      </form>
      {resultUrl&&<div className="folder" style={{marginTop:16}}><div style={{flex:1}}><div className="folderName">Client link created</div><div className="folderCount" style={{wordBreak:'break-all'}}>{resultUrl}</div></div><button className="btn" onClick={()=>navigator.clipboard.writeText(resultUrl)}>Copy</button></div>}
      {error&&<p className="meta" style={{marginTop:14}}>{error}</p>}

      <div className="sectionTitle" style={{marginTop:34}}>Projects</div>
      {projects.length ? projects.map(project=><div className="folder" key={project.id}><div style={{flex:1}}><div className="folderName">{project.name}</div><div className="folderCount">{project.client_name} · expires {new Date(project.expires_at).toLocaleDateString('en-IN')}</div></div><div className="folderCount">{project.disabled_at ? 'Disabled' : 'Active'}</div></div>) : <p className="meta">No projects yet.</p>}
    </div></section>
  </main>
}
