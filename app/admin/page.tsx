'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { AlertCircle, Archive, Check, ChevronLeft, Copy, ExternalLink, Folder, Grid2X2, HardDrive, LayoutList, Link2, LockKeyhole, LogOut, Menu, Plus, RefreshCw, Search, Shield, X } from 'lucide-react'
import DropIcon from '@/components/drop-icon'
import StudioOverview from '@/app/admin/studio-overview'
import AdminDelivery from '@/app/admin/admin-delivery'

const GB = 1024 ** 3
type Account = { id: string; label: string; google_email: string; root_folder_id: string | null }
type Project = { id: string; name: string; client_name: string; client_email: string | null; drive_account_id: string; drive_folder_id: string; storage_limit_bytes: number | null; expires_at: string; disabled_at: string | null; created_at: string }
type Detail = { project: Project; account: Account | null; storage: { usedBytes: number; pendingBytes: number; limitBytes: number | null; availableBytes: number | null }; clientAccess: { path: string; tokenStoredAsHash: boolean; active: boolean }; activity: { id: string; event_type: string; file_name: string | null; metadata: unknown; created_at: string }[] }

async function request(url: string, init?: RequestInit) { const r = await fetch(url, init); const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || 'Request failed'); return d }
function bytes(value: number | null) { if (value == null) return 'Unlimited'; if (!value) return '0 B'; const u = ['B','KB','MB','GB','TB']; const i = Math.min(Math.floor(Math.log(value)/Math.log(1024)),u.length-1); return `${(value/1024**i).toFixed(i ? 1 : 0)} ${u[i]}` }
function dateLabel(v: string) { return new Date(v).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}) }
function dateInput(v: string) { const d=new Date(v); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }
function eventLabel(v: string) { return v.replaceAll('.',' ').replace(/(^|\s)\S/g,c=>c.toUpperCase()) }

export default function AdminPage() {
  const [loggedIn,setLoggedIn]=useState(false),[checking,setChecking]=useState(true),[reloading,setReloading]=useState(false),[projectsLoaded,setProjectsLoaded]=useState(false),[accounts,setAccounts]=useState<Account[]>([]),[projects,setProjects]=useState<Project[]>([]),[selectedId,setSelectedId]=useState<string|null>(null),[detail,setDetail]=useState<Detail|null>(null),[showCreate,setShowCreate]=useState(false),[loadingDetail,setLoadingDetail]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState(''),[loadError,setLoadError]=useState(false),[freshLink,setFreshLink]=useState(''),[query,setQuery]=useState(''),[status,setStatus]=useState<'all'|'active'|'inactive'>('all')
  const [projectView,setProjectView]=useState<'grid'|'list'>('grid'),[adminSidebarOpen,setAdminSidebarOpen]=useState(false)
  const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[form,setForm]=useState({name:'',clientName:'',clientEmail:'',expiresAt:'',storageGb:'10'})
  async function load(){
    setReloading(true)
    if (new URLSearchParams(window.location.search).get('drive') === 'connected') {
      setMessage('Google Drive connected successfully.')
      window.history.replaceState(null, '', '/admin')
    }
    try {
      const d = await request('/api/admin/projects')
      setLoggedIn(true)
      setLoadError(false)
      setProjectsLoaded(true)
      setError('')
      setAccounts(d.accounts || [])
      setProjects(d.projects || [])
    } catch (e) {
      if (e instanceof Error && e.message === 'Unauthorized.') {
        setLoggedIn(false)
        setLoadError(false)
        setProjectsLoaded(false)
      } else {
        setLoggedIn(true)
        setLoadError(true)
        setError('Unable to refresh project data. Your projects have not been deleted. Check the connection and retry.')
      }
    } finally {
      setChecking(false)
      setReloading(false)
    }
  }
  async function loadDetail(id:string){setSelectedId(id);setLoadingDetail(true);setError('');setMessage('');try{setDetail(await request(`/api/admin/projects/${id}`))}catch(e){setError(e instanceof Error?e.message:'Unable to load project');setSelectedId(null)}finally{setLoadingDetail(false)}}
  useEffect(()=>{void load()},[])
  useEffect(()=>{try{const saved=localStorage.getItem('drop-admin-view');if(saved==='grid'||saved==='list')setProjectView(saved)}catch{}},[])
  function changeProjectView(mode:'grid'|'list'){setProjectView(mode);try{localStorage.setItem('drop-admin-view',mode)}catch{}}
  function navigateProjects(next:'all'|'active'|'inactive'){setStatus(next);setSelectedId(null);setDetail(null);setFreshLink('');setAdminSidebarOpen(false)}
  useEffect(() => {
    if (!showCreate) return
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowCreate(false)
    }
    document.addEventListener('keydown', onEscape)
    return () => document.removeEventListener('keydown', onEscape)
  }, [showCreate])
  const activeCount=useMemo(()=>projects.filter(p=>!p.disabled_at&&new Date(p.expires_at).getTime()>Date.now()).length,[projects])
  const filtered=useMemo(()=>projects.filter(p=>{const active=!p.disabled_at&&new Date(p.expires_at).getTime()>Date.now();return(!query||`${p.name} ${p.client_name} ${p.client_email||''}`.toLowerCase().includes(query.toLowerCase()))&&(status==='all'||(status==='active'&&active)||(status==='inactive'&&!active))}),[projects,query,status])
  async function login(e:FormEvent){e.preventDefault();setBusy(true);setError('');try{await request('/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});window.location.href='/admin'}catch(e){setError(e instanceof Error?e.message:'Sign in failed')}finally{setBusy(false)}}
  async function create(e:FormEvent){e.preventDefault();setBusy(true);setError('');try{const d=await request('/api/admin/projects',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:form.name,clientName:form.clientName,clientEmail:form.clientEmail,expiresAt:form.expiresAt,storageLimitBytes:form.storageGb?Number(form.storageGb)*GB:null})});setFreshLink(d.url);setShowCreate(false);setForm({name:'',clientName:'',clientEmail:'',expiresAt:'',storageGb:'10'});await load();await loadDetail(d.id)}catch(e){setError(e instanceof Error?e.message:'Project creation failed')}finally{setBusy(false)}}
  async function update(patch:Record<string,unknown>,success='Project updated'){if(!selectedId)return;setBusy(true);setError('');try{const d=await request(`/api/admin/projects/${selectedId}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(patch)});if(d.url)setFreshLink(d.url);setMessage(success);await load();await loadDetail(selectedId)}catch(e){setError(e instanceof Error?e.message:'Update failed')}finally{setBusy(false)}}
  async function archive(){if(!selectedId||!window.confirm('Archive this project? The client link will stop working. Drive files will remain in place.'))return;setBusy(true);try{await request(`/api/admin/projects/${selectedId}`,{method:'DELETE'});setMessage('Project archived');setSelectedId(null);setDetail(null);await load()}catch(e){setError(e instanceof Error?e.message:'Archive failed')}finally{setBusy(false)}}
  async function logout(){await request('/api/admin/logout',{method:'POST'}).catch(()=>undefined);window.location.href='/admin'}
  function copy(v:string){void navigator.clipboard?.writeText(v);setMessage('Copied to clipboard')}
  if(checking)return <main className="p5-admin finder-admin-loading" role="status" aria-label="Loading control room"><div className="finder-admin-loading-content"><span className="finder-loading-line short"/><span className="finder-loading-line title"/><span className="finder-loading-line medium"/><div className="finder-loading-grid"><i/><i/><i/></div><p>Opening control room…</p></div></main>
  if(!loggedIn)return <main className="p5-admin p5-login"><div className="p5-brand">MINIMICAL<span>DROP</span></div><div className="p5-login-copy"><span>PRIVATE INFRASTRUCTURE</span><h1>Control room.</h1><p>Manage client delivery spaces, storage and access.</p></div><form onSubmit={login} className="p5-login-form"><label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="username" required/></label><label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" required/></label>{error&&<div className="p5-error">{error}</div>}<button disabled={busy}>{busy?'Signing in…':'Enter control room'}</button><p className="p5-login-private"><LockKeyhole size={14}/> Administrator access only. No public registration.</p></form></main>
  return <main className="p5-admin finder-admin-shell"><div className="finder-admin-window-bar"><div className="finder-traffic" aria-hidden="true"><span/><span/><span/></div><div className="finder-admin-window-title"><Folder size={15}/> Minimical Drop <b>/</b> Studio</div><div className="finder-admin-window-actions"><span className="finder-admin-secure"><i/> Private</span><span className="finder-admin-count"><i/>{projectsLoaded?activeCount:'—'} active</span><button className="finder-admin-signout" onClick={()=>void logout()} aria-label="Sign out" title="Sign out"><LogOut size={16}/></button></div></div>
    <div className="finder-admin-layout">
      {adminSidebarOpen && <button className="finder-admin-scrim" onClick={()=>setAdminSidebarOpen(false)} aria-label="Close navigation"/>}
      <aside className={`finder-admin-sidebar ${adminSidebarOpen?'open':''}`} id="finder-admin-navigation" aria-label="Admin navigation">
        <div className="finder-admin-sidebar-brand"><DropIcon size={38}/><span className="finder-admin-brand-copy"><strong>Control Room</strong><small>Studio workspace</small></span></div>
        <p>WORKSPACE</p>
        <button className={status==='all'&&!selectedId?'active':''} onClick={()=>navigateProjects('all')}><Grid2X2 size={17}/> All projects <em>{projectsLoaded?projects.length:'—'}</em></button>
        <button className={status==='active'&&!selectedId?'active':''} onClick={()=>navigateProjects('active')}><Folder size={17}/> Active <em>{projectsLoaded?activeCount:'—'}</em></button>
        <button className={status==='inactive'&&!selectedId?'active':''} onClick={()=>navigateProjects('inactive')}><Archive size={17}/> Archived & inactive</button>
        <p>TOOLS</p>
        <a href="/api/google/connect"><HardDrive size={17}/> Connect Drive</a>
        <div className="finder-admin-inline-tools"><StudioOverview/><AdminDelivery/></div>
        <button onClick={()=>{void load();setAdminSidebarOpen(false)}}><RefreshCw size={17}/> Refresh projects</button>
        <div className="finder-admin-sidebar-bottom"><div><span>DRIVE ACCOUNTS</span><strong>{projectsLoaded?accounts.length:'—'} connected</strong></div><span><i/> Secure workspace</span></div>
      </aside>
      <div className="finder-admin-workspace">
        <button className="finder-admin-mobile-toggle" onClick={()=>setAdminSidebarOpen(true)} aria-expanded={adminSidebarOpen} aria-controls="finder-admin-navigation"><Menu size={19}/> Menu</button>
    {selectedId&&detail?<><section className="p5-detail-head"><div className="p5-detail-copy"><button className="p5-detail-back" onClick={()=>{setSelectedId(null);setDetail(null);setFreshLink('')}}><ChevronLeft size={15}/> All projects</button><h1>{detail.project.name}</h1><p>{detail.project.client_name}{detail.project.client_email?` · ${detail.project.client_email}`:''}</p></div><strong className={detail.clientAccess.active?'on':'off'}><i/>{detail.clientAccess.active?'Active':'Inactive'}</strong></section>
      <section className="p5-grid"><div className="p5-panel p5-panel-access"><div className="p5-panel-title"><div><span>ACCESS & IDENTITY</span><h2>Project settings</h2></div><button onClick={()=>void loadDetail(selectedId)} aria-label="Refresh"><RefreshCw size={15}/></button></div><div className="p5-fields"><label>Project name<input defaultValue={detail.project.name} key={detail.project.name} onBlur={e=>e.target.value.trim()&&e.target.value.trim()!==detail.project.name&&void update({name:e.target.value.trim()})}/></label><label>Client name<input defaultValue={detail.project.client_name} key={detail.project.client_name} onBlur={e=>e.target.value.trim()&&e.target.value.trim()!==detail.project.client_name&&void update({clientName:e.target.value.trim()})}/></label><label>Client email<input type="email" defaultValue={detail.project.client_email||''} key={detail.project.client_email||''} onBlur={e=>e.target.value!==(detail.project.client_email||'')&&void update({clientEmail:e.target.value||null})}/></label><label>Expiry<input type="date" defaultValue={dateInput(detail.project.expires_at)} key={detail.project.expires_at} onChange={e=>e.target.value&&void update({expiresAt:e.target.value})}/></label></div>
        <div className="p5-link"><div><span>CLIENT LINK</span><strong>{detail.clientAccess.path}</strong><small>Only a newly generated link can be copied. Tokens are stored as hashes.</small></div><button onClick={()=>{if(window.confirm('Regenerate this client link? The previous link will stop working.'))void update({regenerateToken:true},'New client link generated')}} disabled={busy}><RefreshCw size={14}/> Regenerate</button></div>
        {freshLink&&<div className="p5-fresh"><Link2 size={14}/><code>{freshLink}</code><button onClick={()=>copy(freshLink)} aria-label="Copy new client link"><Copy size={14}/></button><a href={freshLink} target="_blank" rel="noreferrer" aria-label="Open new client link"><ExternalLink size={14}/></a></div>}
        <details className="finder-admin-advanced"><summary>Advanced project actions</summary><div className="p5-actions"><button disabled={busy} onClick={()=>void update({disabled:!detail.project.disabled_at},detail.project.disabled_at?'Project enabled':'Project disabled')}>{detail.project.disabled_at?'Re-enable project':'Disable project'}</button><button className="danger" disabled={busy} onClick={()=>void archive()}><Archive size={14}/> Archive</button></div></details></div>
        <div className="p5-panel p5-panel-storage"><div className="p5-panel-title"><div><span>STORAGE</span><h2>{bytes(detail.storage.usedBytes)} used</h2></div><HardDrive size={17}/></div><div className="p5-storage-line"><span>Used + pending</span><strong>{bytes(detail.storage.usedBytes+detail.storage.pendingBytes)}</strong></div><div className="p5-track"><i style={{width:`${detail.storage.limitBytes?Math.min(100,(detail.storage.usedBytes+detail.storage.pendingBytes)/detail.storage.limitBytes*100):0}%`}}/></div><div className="p5-storage-line"><span>{detail.storage.pendingBytes?`${bytes(detail.storage.pendingBytes)} reserved`:'No active uploads'}</span><strong>{bytes(detail.storage.limitBytes)}</strong></div><label className="p5-limit">Storage limit<select value={detail.storage.limitBytes?String(detail.storage.limitBytes/GB):''} onChange={e=>void update({storageLimitBytes:e.target.value?Number(e.target.value)*GB:null})}><option value="5">5 GB</option><option value="10">10 GB</option><option value="25">25 GB</option><option value="50">50 GB</option><option value="100">100 GB</option><option value="500">500 GB</option><option value="1000">1 TB</option><option value="">Unlimited</option></select></label></div>
        <div className="p5-panel p5-panel-drive"><div className="p5-panel-title"><div><span>CONNECTED STORAGE</span><h2>Google Drive</h2></div><Shield size={17}/></div><div className="p5-drive"><b>G</b><div><strong>{detail.account?.google_email||'Unavailable'}</strong><span>Project folder · {detail.project.name}</span></div></div><p className="p5-note">Drive is the storage adapter. Client access never exposes the connected account or credentials.</p></div>
        <div className="p5-panel p5-activity p5-panel-activity"><div className="p5-panel-title"><div><span>ACTIVITY</span><h2>Recent project events</h2></div></div>{detail.activity.length?<div>{detail.activity.map(a=><div className="p5-event" key={a.id}><div><strong>{a.file_name||eventLabel(a.event_type)}</strong><span>{a.file_name?eventLabel(a.event_type):'Project event'}</span></div><time>{new Date(a.created_at).toLocaleString('en-IN',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</time></div>)}</div>:<p className="p5-empty">No activity yet.</p>}</div></section>
    </>:<><section className="p5-dashboard"><div><span>MINIMICAL DROP / CONTROL ROOM</span><h1>Projects.</h1><p>Private delivery spaces, managed from one place.</p></div><button disabled={!projectsLoaded||loadError} title={!projectsLoaded||loadError?'Project data must load before creating a new project':undefined} onClick={()=>{setShowCreate(true);setError('');const d=new Date(Date.now()+30*86400000);setForm(f=>({...f,expiresAt:dateInput(d.toISOString())}))}}><Plus size={16}/> New project</button></section>{message&&<div className="p5-message" role="status"><Check size={14}/>{message}</div>}{error&&<div className="p5-error p5-wide finder-admin-error" role="alert"><AlertCircle size={17}/><span>{error}</span>{loadError&&<button type="button" disabled={reloading} onClick={()=>void load()}><RefreshCw size={14} className={reloading?'p5-spin':''}/>{reloading?'Retrying…':'Retry loading'}</button>}</div>}<div className="p5-summary"><div><span>PROJECTS</span><b>{projectsLoaded?projects.length:'—'}</b></div><div><span>ACTIVE</span><b>{projectsLoaded?activeCount:'—'}</b></div><div><span>DRIVE ACCOUNTS</span><b>{projectsLoaded?accounts.length:'—'}</b></div></div><section className="p5-projects finder-admin-projects" aria-label="Project manager">
  <div className="p5-project-tools">
    <label><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search projects and clients…" aria-label="Search projects"/></label>
    <select value={status} onChange={e=>setStatus(e.target.value as typeof status)} aria-label="Filter project status"><option value="all">All projects</option><option value="active">Active</option><option value="inactive">Inactive</option></select>
    <div className="finder-view-toggle" role="group" aria-label="Project view">
      <button className={projectView==='grid'?'active':''} onClick={()=>changeProjectView('grid')} aria-label="Card view" title="Card view" aria-pressed={projectView==='grid'}><Grid2X2 size={17}/></button>
      <button className={projectView==='list'?'active':''} onClick={()=>changeProjectView('list')} aria-label="List view" title="List view" aria-pressed={projectView==='list'}><LayoutList size={17}/></button>
    </div>
  </div>
  <div className="finder-admin-section-head"><strong>{status==='active'?'Active projects':status==='inactive'?'Archived & inactive':'Your projects'}</strong><span>{projectsLoaded?`${filtered.length} ${filtered.length===1?'space':'spaces'}`:'Connection pending'}</span></div>
  {!projectsLoaded ? <div className="finder-admin-data-unavailable" role="status"><div><AlertCircle size={25}/></div><strong>Project data is unavailable</strong><p>Your projects are still stored safely. The dashboard couldn't read them just now.</p><button type="button" disabled={reloading} onClick={()=>void load()}><RefreshCw size={15} className={reloading?'p5-spin':''}/>{reloading?'Reconnecting…':'Reconnect to database'}</button></div> : filtered.length ? (projectView==='grid' ?
    <div className="finder-admin-card-grid">
      {filtered.map(p=>{const active=!p.disabled_at&&new Date(p.expires_at).getTime()>Date.now();return <button className="finder-project-card" key={p.id} onClick={()=>void loadDetail(p.id)}>
        <div className="finder-project-card-top"><span className="finder-project-card-icon"><Folder size={24}/></span><span className={active?'on':'off'}><i/>{p.disabled_at?'Disabled':active?'Active':'Expired'}</span></div>
        <strong>{p.name}</strong><span className="finder-project-client">{p.client_name}</span>
        <span className="finder-project-email">{p.client_email||'Private client workspace'}</span>
        <div className="finder-project-card-meta"><span><HardDrive size={14}/>{bytes(p.storage_limit_bytes)}</span><span>Expires {dateLabel(p.expires_at)}</span></div>
        <div className="finder-project-card-open">Open workspace <ExternalLink size={14}/></div>
      </button>})}
    </div> :
    <><div className="p5-list-head"><span>PROJECT</span><span>CLIENT</span><span>STORAGE</span><span>EXPIRY</span><span>STATUS</span></div>
    {filtered.map(p=>{const active=!p.disabled_at&&new Date(p.expires_at).getTime()>Date.now();return <button className="p5-row" key={p.id} onClick={()=>void loadDetail(p.id)}><div><strong>{p.name}</strong><span>{p.client_email||'No client email'}</span></div><span>{p.client_name}</span><span>{bytes(p.storage_limit_bytes)}</span><span>{dateLabel(p.expires_at)}</span><span className={active?'on':'off'}><i/>{p.disabled_at?'Disabled':active?'Active':'Expired'}</span></button>})}</>
  ) : <div className="finder-admin-empty"><Folder size={30}/><strong>No matching projects</strong><span>Try a different search or filter.</span></div>}
</section><section className="p5-drive-strip"><div><span>CONNECTED STORAGE</span><strong>{projectsLoaded?`${accounts.length} Google Drive ${accounts.length===1?'account':'accounts'}`:'Storage connection pending'}</strong></div><div>{accounts.map(a=><span key={a.id}>● {a.google_email}</span>)}<a href="/api/google/connect"><Plus size={13}/> Connect Drive</a></div></section></>}
      </div>
    </div>
    {showCreate&&<div className="p5-modal-bg" onMouseDown={e=>e.target===e.currentTarget&&setShowCreate(false)}><form className="p5-modal" onSubmit={create} role="dialog" aria-modal="true" aria-labelledby="p5-create-title"><button type="button" className="p5-close" onClick={()=>setShowCreate(false)} aria-label="Close"><X size={17}/></button><span>NEW PROJECT</span><h2 id="p5-create-title">Create delivery space</h2><label>Project name<input autoFocus value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Project / campaign name" required/></label><label>Client name<input value={form.clientName} onChange={e=>setForm({...form,clientName:e.target.value})} placeholder="Client or company" required/></label><label>Client email<input type="email" value={form.clientEmail} onChange={e=>setForm({...form,clientEmail:e.target.value})} placeholder="Optional"/></label><div className="p5-modal-grid"><label>Expiry<input type="date" value={form.expiresAt} onChange={e=>setForm({...form,expiresAt:e.target.value})} required/></label><label>Storage<select value={form.storageGb} onChange={e=>setForm({...form,storageGb:e.target.value})}><option value="5">5 GB</option><option value="10">10 GB</option><option value="25">25 GB</option><option value="50">50 GB</option><option value="100">100 GB</option><option value="500">500 GB</option><option value="">Unlimited</option></select></label></div>{error&&<div className="p5-error">{error}</div>}<div className="p5-modal-actions"><button type="button" onClick={()=>setShowCreate(false)}>Cancel</button><button className="primary" disabled={busy}>{busy?'Creating…':'Create project'}</button></div></form></div>}
    {loadingDetail&&<div className="p5-overlay"><RefreshCw className="p5-spin" size={18}/></div>}</main>
}
