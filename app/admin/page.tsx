'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Archive, Check, ChevronLeft, Copy, ExternalLink, HardDrive, Link2, LogOut, Plus, RefreshCw, Shield, UserRound, X } from 'lucide-react'

const GB = 1024 ** 3

type Account = { id: string; label: string; google_email: string; root_folder_id: string | null }
type Project = { id: string; name: string; client_name: string; client_email: string | null; drive_account_id: string; drive_folder_id: string; storage_limit_bytes: number | null; expires_at: string; disabled_at: string | null; created_at: string }
type Detail = { project: Project; account: Account | null; storage: { usedBytes: number; pendingBytes: number; limitBytes: number | null; availableBytes: number | null }; clientAccess: { path: string; tokenStoredAsHash: boolean; active: boolean }; activity: { id: string; event_type: string; file_name: string | null; metadata: unknown; created_at: string }[] }

async function request(url: string, init?: RequestInit) {
  const response = await fetch(url, init)
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'Request failed')
  return data
}

function formatBytes(bytes: number | null) {
  if (bytes == null) return 'Unlimited'
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']; const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / 1024 ** i).toFixed(i ? 1 : 0)} ${units[i]}`
}

function dateLabel(value: string) { return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) }
function dateInput(value: string) { const date = new Date(value); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` }
function eventLabel(value: string) { return value.replaceAll('.', ' ').replace(/(^|\s)\S/g, char => char.toUpperCase()) }

export default function AdminPage() {
  const [loggedIn, setLoggedIn] = useState(false)
  const [checking, setChecking] = useState(true)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<Detail | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [link, setLink] = useState('')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [form, setForm] = useState({ name: '', clientName: '', clientEmail: '', expiresAt: '', storageGb: '10' })

  async function load() {
    try {
      const data = await request('/api/admin/projects')
      setLoggedIn(true); setAccounts(data.accounts || []); setProjects(data.projects || [])
    } catch { setLoggedIn(false) }
    finally { setChecking(false) }
  }

  async function loadDetail(id: string) {
    setSelectedId(id); setLoadingDetail(true); setError(''); setMessage('')
    try { setDetail(await request(`/api/admin/projects/${id}`)) }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to load project') }
    finally { setLoadingDetail(false) }
  }

  useEffect(() => { void load() }, [])

  const activeProjects = useMemo(() => projects.filter(project => !project.disabled_at && new Date(project.expires_at).getTime() > Date.now()).length, [projects])

  async function login(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('')
    try { await request('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) }); window.location.href = '/admin' }
    catch (e) { setError(e instanceof Error ? e.message : 'Sign in failed') }
    finally { setBusy(false) }
  }

  async function createProject(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('')
    try {
      const data = await request('/api/admin/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: form.name, clientName: form.clientName, clientEmail: form.clientEmail, expiresAt: form.expiresAt, storageLimitBytes: form.storageGb ? Number(form.storageGb) * GB : null }) })
      setLink(data.url); setShowCreate(false); setForm({ name: '', clientName: '', clientEmail: '', expiresAt: '', storageGb: '10' }); await load(); await loadDetail(data.id)
    } catch (e) { setError(e instanceof Error ? e.message : 'Project creation failed') }
    finally { setBusy(false) }
  }

  async function updateProject(patch: Record<string, unknown>, success = 'Project updated') {
    if (!selectedId) return
    setBusy(true); setError(''); setMessage('')
    try {
      const data = await request(`/api/admin/projects/${selectedId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) })
      if (data.url) setLink(data.url)
      setMessage(success); await load(); await loadDetail(selectedId)
    } catch (e) { setError(e instanceof Error ? e.message : 'Update failed') }
    finally { setBusy(false) }
  }

  async function archiveProject() {
    if (!selectedId || !window.confirm('Archive this project? The client link will stop working. Drive files will remain in place.')) return
    setBusy(true); setError('')
    try { await request(`/api/admin/projects/${selectedId}`, { method: 'DELETE' }); setMessage('Project archived'); await load(); setDetail(null); setSelectedId(null) }
    catch (e) { setError(e instanceof Error ? e.message : 'Archive failed') }
    finally { setBusy(false) }
  }

  async function logout() { await request('/api/admin/logout', { method: 'POST' }).catch(() => undefined); window.location.href = '/admin' }

  if (checking) return <main className="control"><div className="control-loading">MINIMICAL DROP</div></main>
  if (!loggedIn) return <main className="control control-login"><div className="control-login-mark">MINIMICAL<span>DROP</span></div><div className="control-login-copy"><span>PRIVATE INFRASTRUCTURE</span><h1>Control room.</h1><p>Manage client project spaces, storage and access from one private surface.</p></div><form className="control-login-form" onSubmit={login}><label>Email<input value={email} onChange={e => setEmail(e.target.value)} type="email" autoComplete="username" required/></label><label>Password<input value={password} onChange={e => setPassword(e.target.value)} type="password" autoComplete="current-password" required/></label>{error && <div className="control-error">{error}</div>}<button className="control-primary" disabled={busy}>{busy ? 'Signing in…' : 'Enter control room'}</button></form></main>

  return <main className="control">
    <header className="control-header"><div className="control-brand">MINIMICAL<span>DROP</span></div><div className="control-header-right"><span><i/> {activeProjects} active {activeProjects === 1 ? 'project' : 'projects'}</span><button onClick={() => void logout()} title="Sign out"><LogOut size={15}/></button></div></header>
    {selectedId && detail ? <>
      <section className="control-project-head"><button className="control-back" onClick={() => { setSelectedId(null); setDetail(null) }}><ChevronLeft size={16}/> Projects</button><div className="control-project-title"><div><span className="control-eyebrow">PROJECT</span><h1>{detail.project.name}</h1><p>{detail.project.client_name}{detail.project.client_email ? ` · ${detail.project.client_email}` : ''}</p></div><div className={`control-status ${detail.clientAccess.active ? 'active' : 'off'}`}><i/>{detail.clientAccess.active ? 'Active' : 'Inactive'}</div></div></section>
      <section className="control-grid">
        <div className="control-panel control-main-panel">
          <div className="control-panel-head"><div><span className="control-eyebrow">PROJECT SETTINGS</span><h2>Access & identity</h2></div><button className="control-icon-btn" onClick={() => void loadDetail(selectedId)}><RefreshCw size={15}/></button></div>
          <div className="control-fields"><label>Project name<input defaultValue={detail.project.name} key={`name-${detail.project.name}`} onBlur={e => { if (e.target.value.trim() && e.target.value.trim() !== detail.project.name) void updateProject({ name: e.target.value.trim() }) }}/></label><label>Client name<input defaultValue={detail.project.client_name} key={`client-${detail.project.client_name}`} onBlur={e => { if (e.target.value.trim() && e.target.value.trim() !== detail.project.client_name) void updateProject({ clientName: e.target.value.trim() }) }}/></label><label>Client email<input type="email" defaultValue={detail.project.client_email || ''} key={`email-${detail.project.client_email || ''}`} onBlur={e => { if (e.target.value !== (detail.project.client_email || '')) void updateProject({ clientEmail: e.target.value || null }) }}/></label><label>Expiry<input type="date" defaultValue={dateInput(detail.project.expires_at)} key={`expiry-${detail.project.expires_at}`} onChange={e => e.target.value && void updateProject({ expiresAt: e.target.value })}/></label></div>
          <div className="control-link"><div><span className="control-eyebrow">CLIENT LINK</span><strong>{detail.clientAccess.path}</strong><small>Raw token is never stored in the database.</small></div><div><button onClick={() => { setLink(`${window.location.origin}${detail.clientAccess.path}`); void navigator.clipboard.writeText(`${window.location.origin}${detail.clientAccess.path}`) }}><Copy size={14}/> Copy</button><button onClick={() => void updateProject({ regenerateToken: true }, 'New client link generated')}><RefreshCw size={14}/> Regenerate</button></div></div>
          {link && <div className="control-new-link"><Link2 size={14}/><span>{link}</span><button onClick={() => void navigator.clipboard.writeText(link)}><Copy size={14}/></button></div>}
          <div className="control-actions"><button className="control-secondary" disabled={busy} onClick={() => void updateProject({ disabled: !detail.project.disabled_at }, detail.project.disabled_at ? 'Project enabled' : 'Project disabled')}>{detail.project.disabled_at ? 'Re-enable project' : 'Disable project'}</button><button className="control-danger" disabled={busy} onClick={() => void archiveProject()}><Archive size={14}/> Archive</button></div>
        </div>

        <div className="control-panel"><div className="control-panel-head"><div><span className="control-eyebrow">STORAGE</span><h2>{formatBytes(detail.storage.usedBytes)} used</h2></div><HardDrive size={17}/></div><div className="control-storage"><div className="control-storage-line"><span>Used</span><strong>{formatBytes(detail.storage.usedBytes)}</strong></div><div className="control-storage-track"><i style={{ width: `${detail.storage.limitBytes ? Math.min(100, (detail.storage.usedBytes + detail.storage.pendingBytes) / detail.storage.limitBytes * 100) : 0}%` }}/></div><div className="control-storage-line"><span>{detail.storage.pendingBytes ? `${formatBytes(detail.storage.pendingBytes)} reserved` : 'No active uploads'}</span><strong>{formatBytes(detail.storage.limitBytes)}</strong></div></div><label className="control-limit">Storage limit<select value={detail.storage.limitBytes ? String(detail.storage.limitBytes / GB) : ''} onChange={e => void updateProject({ storageLimitBytes: e.target.value ? Number(e.target.value) * GB : null })}><option value="5">5 GB</option><option value="10">10 GB</option><option value="25">25 GB</option><option value="50">50 GB</option><option value="100">100 GB</option><option value="500">500 GB</option><option value="1000">1 TB</option><option value="">Unlimited</option></select></label></div>

        <div className="control-panel"><div className="control-panel-head"><div><span className="control-eyebrow">DRIVE</span><h2>Storage account</h2></div><Shield size={17}/></div><div className="control-drive"><div className="control-drive-mark">G</div><div><strong>{detail.account?.google_email || 'Unavailable'}</strong><span>Project folder · {detail.project.name}</span></div></div><p className="control-note">Google Drive is the storage adapter. Client access never exposes the connected account or its credentials.</p></div>

        <div className="control-panel control-activity"><div className="control-panel-head"><div><span className="control-eyebrow">ACTIVITY</span><h2>Recent project events</h2></div></div>{detail.activity.length ? <div className="control-events">{detail.activity.map(event => <div className="control-event" key={event.id}><div><strong>{event.file_name || eventLabel(event.event_type)}</strong><span>{event.file_name ? eventLabel(event.event_type) : 'Project event'}</span></div><time>{new Date(event.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</time></div>)}</div> : <p className="control-empty">No activity yet.</p>}</div>
      </section>
    </> : <>
      <section className="control-dashboard-head"><div><span className="control-eyebrow">MINIMICAL DROP / CONTROL ROOM</span><h1>Projects.</h1><p>Private delivery spaces, managed from one place.</p></div><button className="control-primary control-new" onClick={() => { setShowCreate(true); setError(''); const d = new Date(Date.now() + 30 * 86400000); setForm(f => ({ ...f, expiresAt: dateInput(d.toISOString()) })) }}><Plus size={16}/> New project</button></section>
      {message && <div className="control-toast"><Check size={14}/>{message}</div>}{error && <div className="control-error control-wide">{error}</div>}
      <section className="control-summary"><div><span>PROJECTS</span><strong>{projects.length}</strong></div><div><span>ACTIVE</span><strong>{activeProjects}</strong></div><div><span>DRIVE ACCOUNTS</span><strong>{accounts.length}</strong></div></section>
      <section className="control-projects"><div className="control-list-head"><span>PROJECT</span><span>CLIENT</span><span>STORAGE</span><span>EXPIRY</span><span>STATUS</span></div>{projects.length ? projects.map(project => <button className="control-project-row" key={project.id} onClick={() => void loadDetail(project.id)}><div><strong>{project.name}</strong><span>{project.client_email || 'No client email'}</span></div><span>{project.client_name}</span><span>{formatBytes(project.storage_limit_bytes)}</span><span>{dateLabel(project.expires_at)}</span><span className={`control-status ${!project.disabled_at && new Date(project.expires_at).getTime() > Date.now() ? 'active' : 'off'}`}><i/>{project.disabled_at ? 'Disabled' : new Date(project.expires_at).getTime() <= Date.now() ? 'Expired' : 'Active'}</span></button>) : <div className="control-empty-projects"><span>No projects yet.</span><button onClick={() => setShowCreate(true)}>Create your first project</button></div>}</section>
      <section className="control-drive-strip"><div><span className="control-eyebrow">CONNECTED STORAGE</span><strong>{accounts.length ? `${accounts.length} Google Drive ${accounts.length === 1 ? 'account' : 'accounts'}` : 'No Google Drive account connected'}</strong></div><div className="control-drive-accounts">{accounts.map(account => <span key={account.id}><i/> {account.google_email}</span>)}<a href="/api/google/connect"><Plus size={13}/> Connect Drive</a></div></section>
    </>}

    {loadingDetail && <div className="control-loading-overlay"><RefreshCw className="control-spin" size={18}/></div>}
    {showCreate && <div className="control-modal-backdrop" onMouseDown={e => e.target === e.currentTarget && setShowCreate(false)}><div className="control-modal"><button className="control-modal-close" onClick={() => setShowCreate(false)}><X size={17}/></button><span className="control-eyebrow">NEW PROJECT</span><h2>Create a private space.</h2><p>A dedicated Drive folder and one-time client access link will be created.</p><form onSubmit={createProject}><div className="control-fields"><label>Project name<input autoFocus value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Muffin" required/></label><label>Client name<input value={form.clientName} onChange={e => setForm({ ...form, clientName: e.target.value })} placeholder="Didi" required/></label></div><label>Client email<input type="email" value={form.clientEmail} onChange={e => setForm({ ...form, clientEmail: e.target.value })} placeholder="Optional"/></label><div className="control-fields"><label>Expires<input type="date" value={form.expiresAt} onChange={e => setForm({ ...form, expiresAt: e.target.value })} required/></label><label>Storage<select value={form.storageGb} onChange={e => setForm({ ...form, storageGb: e.target.value })}><option value="5">5 GB</option><option value="10">10 GB</option><option value="25">25 GB</option><option value="50">50 GB</option><option value="100">100 GB</option><option value="500">500 GB</option><option value="1000">1 TB</option></select></label></div>{error && <div className="control-error">{error}</div>}<button className="control-primary" disabled={busy}>{busy ? 'Creating…' : 'Create project'}</button></form></div></div>}
  </main>
}
