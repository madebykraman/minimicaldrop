'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Check, CheckCircle2, Clock3, MessageSquare, PackageCheck, Send, XCircle } from 'lucide-react'

type Activity = { id:string; type:string; fileName:string|null; metadata:Record<string,unknown>|null; createdAt:string }
type Data = { status:string; statusLabel:string; message:string|null; activity:Activity[] }

const labels: Record<string,string> = { in_progress:'IN PROGRESS', ready:'READY FOR REVIEW', ready_for_review:'READY FOR REVIEW', changes_requested:'CHANGES REQUESTED', approved:'APPROVED', delivered:'DELIVERED', archived:'ARCHIVED' }
const icons: Record<string, typeof Clock3> = { in_progress:Clock3, ready_for_review:CheckCircle2, ready:CheckCircle2, changes_requested:XCircle, approved:Check, delivered:PackageCheck, archived:PackageCheck }

function eventLabel(type:string) { return type.replace(/^project\.|^delivery\.|^upload\.|^file\.|^folder\./,'').replaceAll('.',' ').replace(/(^|\s)\S/g,c=>c.toUpperCase()) }
function formatDate(value:string) { return new Date(value).toLocaleString('en-IN',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}) }

export default function DeliveryPanel({ token }:{token:string}) {
  const [data,setData]=useState<Data|null>(null)
  const [comment,setComment]=useState('')
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [notice,setNotice]=useState('')

  async function load() { try { const r=await fetch(`/api/projects/${token}/delivery`); if(!r.ok)return; setData(await r.json()) } catch {} }
  useEffect(()=>{void load()},[token])

  const activity=useMemo(()=>data?.activity.filter(item=>!item.type.startsWith('notification.'))||[],[data])
  if (!data || data.status === 'in_progress' && !data.message && !activity.some(a=>a.type.startsWith('delivery.'))) return null

  const status=data.status||'in_progress'
  const Icon=icons[status]||Clock3
  const canReview=status==='ready_for_review'||status==='ready'
  const canComment=status!=='archived'

  async function action(action:'approve'|'request_changes'|'comment', body?:string) {
    setBusy(true);setError('');setNotice('')
    try { const r=await fetch(`/api/projects/${token}/delivery`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,comment:body})}); const result=await r.json().catch(()=>({})); if(!r.ok)throw new Error(result.error||'Unable to update delivery'); setNotice(action==='approve'?'Delivery approved.':action==='request_changes'?'Changes requested.':'Comment added.');setComment('');await load() } catch(e){setError(e instanceof Error?e.message:'Unable to update delivery')} finally{setBusy(false)}
  }
  function submitComment(e:FormEvent){e.preventDefault();if(comment.trim())void action('comment',comment.trim())}

  return <section className="drop-delivery" aria-label="Delivery status">
    <div className="drop-delivery-head">
      <div className="drop-delivery-status"><span className="drop-delivery-kicker">DELIVERY / {labels[status]||'STATUS'}</span><div><span className="drop-delivery-icon"><Icon size={17}/></span><div><h2>{data.statusLabel||labels[status]||'Project status'}</h2><p>{status==='approved'?'Approved and awaiting final delivery.':status==='delivered'?'Delivery complete.':canReview?'The latest delivery is ready for your review.':status==='changes_requested'?'Changes have been requested.': 'The project is currently in progress.'}</p></div></div></div>
      {canReview&&<div className="drop-delivery-actions"><button disabled={busy} onClick={()=>void action('request_changes',comment.trim()||undefined)} className="secondary"><XCircle size={14}/> Request changes</button><button disabled={busy} onClick={()=>void action('approve')} className="primary"><CheckCircle2 size={14}/> Approve delivery</button></div>}
    </div>
    {data.message&&<div className="drop-delivery-message"><span>MESSAGE FROM MINIMICAL</span><p>{data.message}</p></div>}
    {notice&&<div className="drop-delivery-notice"><Check size={14}/>{notice}</div>}
    {error&&<div className="drop-delivery-error">{error}</div>}
    {canComment&&<form className="drop-delivery-comment" onSubmit={submitComment}><div><MessageSquare size={15}/><div><strong>Project conversation</strong><span>Use this for delivery notes, feedback or review context.</span></div></div><textarea value={comment} onChange={e=>setComment(e.target.value)} maxLength={2000} placeholder="Write a note for the Minimical team…"/><div><small>{comment.length}/2000</small><button disabled={busy||!comment.trim()} className="primary" type="submit"><Send size={13}/> Comment</button></div></form>}
    {activity.length>0&&<div className="drop-delivery-history"><div className="drop-delivery-history-head"><span>ACTIVITY</span><strong>Delivery history</strong></div><div className="drop-delivery-events">{activity.slice(0,40).map(event=>{const body=typeof event.metadata?.body==='string'?event.metadata.body:null;const role=event.metadata?.role==='client'?'CLIENT':'MINIMICAL';return <article key={event.id}><i/><div><div className="drop-delivery-event-top"><strong>{event.fileName||eventLabel(event.type)}</strong><time>{formatDate(event.createdAt)}</time></div><span>{event.fileName?eventLabel(event.type):role}</span>{body&&<p>{body}</p>}</div></article>})}</div></div>}
  </section>
}
