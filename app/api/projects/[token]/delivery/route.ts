import { NextResponse } from 'next/server'
import { getProjectByToken } from '@/lib/project-access'
import { adminNotificationEmail, projectClientUrl, sendDropEmail } from '@/lib/email'
import { rateLimit } from '@/lib/rate-limit'
import { supabase } from '@/lib/supabase'

const MAX_COMMENT=2000
function label(status:string){return ({in_progress:'IN PROGRESS',ready:'READY FOR REVIEW',ready_for_review:'READY FOR REVIEW',changes_requested:'CHANGES REQUESTED',approved:'APPROVED',delivered:'DELIVERED',archived:'ARCHIVED'} as Record<string,string>)[status]||'PROJECT STATUS'}
function cleanComment(value:unknown){if(typeof value!=='string')return null;const v=value.trim();return v&&v.length<=MAX_COMMENT&&!/[\u0000-\u001f\u007f]/.test(v)?v:null}
function safeMetadata(metadata:Record<string,unknown>|null){if(!metadata)return null;const safe:Record<string,unknown>={};for(const key of ['role','author','body','from','to'])if(metadata[key]!==undefined)safe[key]=metadata[key];return safe}

export async function GET(request:Request,{params}:{params:Promise<{token:string}>}){
 const {token}=await params;const limited=rateLimit(request,'delivery',60,token);if(limited)return limited
 const project=await getProjectByToken(token);if(!project)return NextResponse.json({error:'Upload space is unavailable or expired.'},{status:404})
 const events=await supabase<Array<{id:string;event_type:string;file_name:string|null;metadata:Record<string,unknown>|null;created_at:string}>>(`audit_events?project_id=eq.${project.id}&select=id,event_type,file_name,metadata,created_at&order=created_at.desc&limit=100`)
 const activity=events.filter(e=>!e.event_type.startsWith('notification.')).map(e=>({id:e.id,type:e.event_type,fileName:e.file_name,metadata:safeMetadata(e.metadata),createdAt:e.created_at}))
 return NextResponse.json({status:project.delivery_status||'in_progress',statusLabel:label(project.delivery_status||'in_progress'),message:project.client_message||null,activity})
}

export async function POST(request:Request,{params}:{params:Promise<{token:string}>}){
 const {token}=await params;const limited=rateLimit(request,'delivery-write',12,token);if(limited)return limited
 const project=await getProjectByToken(token);if(!project)return NextResponse.json({error:'Upload space is unavailable or expired.'},{status:404})
 const body=await request.json().catch(()=>null) as {action?:string;comment?:string}|null;const action=body?.action;const comment=cleanComment(body?.comment)
 if(action==='comment'&&!comment)return NextResponse.json({error:'Comment is required and must be 2,000 characters or fewer.'},{status:400})
 if(!['comment','approve','request_changes'].includes(action||''))return NextResponse.json({error:'Invalid delivery action.'},{status:400})
 const current=project.delivery_status||'in_progress';let nextStatus=current;let eventType='delivery.comment_added';let subject='New project comment';let title='A client comment was added';let bodyText=comment||''
 if(action==='approve'){if(!['ready_for_review','ready'].includes(current))return NextResponse.json({error:'This delivery is not currently awaiting approval.'},{status:409});nextStatus='approved';eventType='delivery.approved';subject=`Approved: ${project.name}`;title='Delivery approved';bodyText=`${project.client_name} approved the current delivery for ${project.name}.`}
 if(action==='request_changes'){if(!['ready_for_review','ready','approved'].includes(current))return NextResponse.json({error:'Changes can only be requested while a delivery is under review.'},{status:409});if(!comment)return NextResponse.json({error:'Please describe the changes you need.'},{status:400});nextStatus='changes_requested';eventType='delivery.changes_requested';subject=`Changes requested: ${project.name}`;title='Changes were requested';bodyText=`${project.client_name} requested changes to ${project.name}.\n\n${comment}`}
 if(nextStatus!==current)await supabase(`projects?id=eq.${encodeURIComponent(project.id)}`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({delivery_status:nextStatus})})
 await supabase('audit_events',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({project_id:project.id,event_type:eventType,metadata:{role:'client',author:project.client_name,...(comment?{body:comment}:{}),...(nextStatus!==current?{from:current,to:nextStatus}:{})}})})
 let emailSent=false;const adminEmail=adminNotificationEmail();if(adminEmail){try{const result=await sendDropEmail(adminEmail,subject,title,bodyText,projectClientUrl(token));emailSent=!!result.sent}catch{}await supabase('audit_events',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({project_id:project.id,event_type:emailSent?'notification.email_sent':'notification.email_skipped',metadata:{audience:'studio',trigger:eventType}})}).catch(()=>undefined)}
 return NextResponse.json({ok:true,status:nextStatus,statusLabel:label(nextStatus),emailSent})
}
