'use client'

import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { ArrowLeft, Check, ExternalLink, MessageSquare, Save } from 'lucide-react'

type Project = { id: string; name: string; client_name: string; client_email: string | null; expires_at: string; disabled_at: string | null; delivery_status: string; client_message: string | null }
type Activity = { id: string; event_type: string; file_name: string | null; created_at: string }

const statuses = [['in_progress', 'In progress'], ['ready', 'Ready for delivery'], ['delivered', 'Delivered'], ['archived', 'Archived']]

async function request(url: string, init?: RequestInit) {
  const response = await fetch(url, init)
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'Request failed')
  return data
}

export default function DeliveryOpsPage() {
  const [projects, setProjects] = useState<Project[]>([]); const [selected, setSelected] = useState<Project | null>(null); const [activity, setActivity] = useState<Activity[]>([])
  const [query, setQuery] = useState(''); const [status, setStatus] = useState('all'); const [message, setMessage] = useState(''); const [deliveryStatus, setDeliveryStatus] = useState('in_progress')
  const [saving, setSaving] = useState(false); const [notice, setNotice] = useState(''); const [error, setError] = useState('')

  async function load() { try { const data = await request('/api/admin/projects'); setProjects(data.projects || []) } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load projects') } }
  async function openProject(project: Project) {
    setSelected(project); setMessage(project.client_message || ''); setDeliveryStatus(project.delivery_status || 'in_progress'); setNotice(''); setError('')
    try { const data = await request(`/api/admin/projects/${project.id}`); setSelected(data.project); setActivity(data.activity || []); setMessage(data.project.client_message || ''); setDeliveryStatus(data.project.delivery_status || 'in_progress') } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load project') }
  }
  async function save() {
    if (!selected) return
    setSaving(true); setNotice(''); setError('')
    try {
      await request(`/api/admin/projects/${selected.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deliveryStatus, clientMessage: message }) })
      setSelected(prev => prev ? { ...prev, delivery_status: deliveryStatus, client_message: message } : prev)
      setProjects(prev => prev.map(p => p.id === selected.id ? { ...p, delivery_status: deliveryStatus, client_message: message } : p))
      setNotice('Project delivery state saved.')
      const data = await request(`/api/admin/projects/${selected.id}`); setSelected(data.project); setActivity(data.activity || [])
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to save project') } finally { setSaving(false) }
  }

  useEffect(() => { void load() }, [])
  const filtered = useMemo(() => projects.filter(p => { const hay = `${p.name} ${p.client_name} ${p.client_email || ''}`.toLowerCase(); return (!query || hay.includes(query.toLowerCase())) && (status === 'all' || (p.delivery_status || 'in_progress') === status) }), [projects, query, status])

  if (selected) return <main style={shell}>
    <button style={back} onClick={() => setSelected(null)}><ArrowLeft size={15}/> Projects</button>
    <div style={header}><div><small style={eyebrow}>DELIVERY OPERATIONS</small><h1 style={h1}>{selected.name}</h1><p style={muted}>Prepared for {selected.client_name}{selected.client_email ? ` · ${selected.client_email}` : ''}</p></div><span style={privatePill}>CLIENT-FACING CONTROLS</span></div>
    <section style={grid}>
      <div style={card}><small style={eyebrow}>CLIENT-FACING STATE</small><label style={label}>Delivery status</label><select value={deliveryStatus} onChange={e => setDeliveryStatus(e.target.value)} style={input}>{statuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><label style={label}>Message for client</label><textarea value={message} onChange={e => setMessage(e.target.value)} maxLength={1000} placeholder="Optional note shown above the client workspace." style={{ ...input, minHeight: 140, resize: 'vertical' }}/><div style={row}><button style={primary} disabled={saving} onClick={() => void save()}><Save size={15}/>{saving ? 'Saving…' : 'Save delivery state'}</button>{notice && <span style={success}><Check size={14}/>{notice}</span>}</div>{error && <p style={errorText}>{error}</p>}</div>
      <div style={card}><small style={eyebrow}>PROJECT HEALTH</small><div style={metric}><span>Expiry</span><strong>{new Date(selected.expires_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</strong></div><div style={metric}><span>State</span><strong>{selected.disabled_at ? 'Disabled' : 'Active'}</strong></div><div style={metric}><span>Delivery</span><strong>{statuses.find(x => x[0] === deliveryStatus)?.[1] || deliveryStatus}</strong></div><p style={muted}>Use the main Admin project controls to change expiry, storage, project name, client details or access link.</p></div>
      <div style={{ ...card, gridColumn: '1 / -1' }}><small style={eyebrow}>RECENT ACTIVITY</small>{activity.length ? activity.slice(0, 12).map(item => <div key={item.id} style={activityRow}><span>{item.event_type.replaceAll('.', ' ')}</span><small>{item.file_name || ''} · {new Date(item.created_at).toLocaleString('en-IN')}</small></div>) : <p style={muted}>No activity recorded yet.</p>}</div>
    </section>
  </main>

  return <main style={shell}>
    <a href="/admin" style={back}><ArrowLeft size={15}/> Admin</a>
    <div style={header}><div><small style={eyebrow}>MINIMICAL DROP</small><h1 style={h1}>Delivery operations</h1><p style={muted}>Set what the client sees without exposing studio controls.</p></div><MessageSquare size={22} opacity={0.5}/></div>
    <div style={filters}><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search projects or clients" style={input}/><select value={status} onChange={e => setStatus(e.target.value)} style={input}>{[['all','All states'], ...statuses].map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></div>
    <section style={list}>{filtered.map(project => <button key={project.id} onClick={() => void openProject(project)} style={projectRow}><span><strong>{project.name}</strong><small>{project.client_name}</small></span><span style={state}>{statuses.find(x => x[0] === (project.delivery_status || 'in_progress'))?.[1] || 'In progress'}</span><ExternalLink size={14} opacity={0.45}/></button>)}{!filtered.length && <p style={muted}>No matching projects.</p>}</section>
  </main>
}

const shell: CSSProperties = { minHeight: '100vh', padding: '42px clamp(18px, 4vw, 64px)', background: '#08070c', color: '#f7f5fa', fontFamily: 'Inter, system-ui, sans-serif' }
const header: CSSProperties = { maxWidth: 1100, margin: '24px auto 30px', display: 'flex', justifyContent: 'space-between', gap: 24, alignItems: 'flex-start' }
const h1: CSSProperties = { margin: '6px 0', fontSize: 'clamp(30px, 5vw, 54px)', letterSpacing: '-.04em' }
const muted: CSSProperties = { color: '#9992a6', lineHeight: 1.6, margin: '6px 0' }
const eyebrow: CSSProperties = { fontSize: 10, letterSpacing: '.15em', fontWeight: 700, color: '#a992c9' }
const back: CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 7, color: '#c9b6e8', textDecoration: 'none', background: 'none', border: 0, padding: 0, cursor: 'pointer' }
const privatePill: CSSProperties = { border: '1px solid rgba(118,80,173,.28)', padding: '8px 10px', borderRadius: 999, fontSize: 10, letterSpacing: '.1em', color: '#bca8d8' }
const grid: CSSProperties = { maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(260px,1fr)', gap: 14 }
const card: CSSProperties = { border: '1px solid rgba(118,80,173,.22)', borderRadius: 18, padding: 22, background: 'rgba(20,16,28,.82)' }
const label: CSSProperties = { display: 'block', margin: '20px 0 7px', fontSize: 12, color: '#c7c0d1' }
const input: CSSProperties = { width: '100%', minHeight: 44, boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(153,146,166,.22)', background: '#0e0b13', color: '#f7f5fa', font: 'inherit' }
const primary: CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 7, minHeight: 44, padding: '0 16px', borderRadius: 10, border: 0, background: '#7650ad', color: '#fff', fontWeight: 700, cursor: 'pointer' }
const row: CSSProperties = { display: 'flex', alignItems: 'center', gap: 12, marginTop: 16, flexWrap: 'wrap' }
const success: CSSProperties = { display: 'inline-flex', gap: 5, alignItems: 'center', color: '#bfe8c7', fontSize: 12 }
const errorText: CSSProperties = { color: '#efaaaa', fontSize: 12 }
const metric: CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: 20, padding: '14px 0', borderBottom: '1px solid rgba(153,146,166,.12)', fontSize: 13 }
const activityRow: CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: 15, padding: '12px 0', borderBottom: '1px solid rgba(153,146,166,.1)', fontSize: 13 }
const filters: CSSProperties = { maxWidth: 1100, margin: '0 auto 14px', display: 'grid', gridTemplateColumns: '1fr 220px', gap: 10 }
const list: CSSProperties = { maxWidth: 1100, margin: '0 auto', border: '1px solid rgba(118,80,173,.22)', borderRadius: 18, overflow: 'hidden', background: 'rgba(20,16,28,.72)' }
const projectRow: CSSProperties = { width: '100%', display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 15, alignItems: 'center', textAlign: 'left', padding: '18px 20px', border: 0, borderBottom: '1px solid rgba(153,146,166,.1)', background: 'transparent', color: '#f7f5fa', cursor: 'pointer' }
const state: CSSProperties = { fontSize: 11, letterSpacing: '.08em', color: '#bca8d8' }
