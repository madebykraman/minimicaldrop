import { NextResponse } from 'next/server'
import { isAdmin } from '@/lib/admin-auth'
import { adminNotificationEmail, sendDropEmail } from '@/lib/email'
import { supabase } from '@/lib/supabase'

const MAX_COMMENT = 2000

function clean(value: unknown) { if (typeof value !== 'string') return null; const v = value.trim(); return v && v.length <= MAX_COMMENT && !/[\u0000-\u001f\u007f]/.test(v) ? v : null }

export async function POST(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error:'Unauthorized.' }, { status:401 })
  const { projectId } = await params
  const projects = await supabase<Array<{ id:string; name:string; client_name:string; client_email:string|null; delivery_status:string }>>(`projects?id=eq.${encodeURIComponent(projectId)}&select=id,name,client_name,client_email,delivery_status&limit=1`)
  const project = projects[0]
  if (!project) return NextResponse.json({ error:'Project not found.' }, { status:404 })
  const body = await request.json().catch(()=>null) as { comment?:string } | null
  const comment = clean(body?.comment)
  if (!comment) return NextResponse.json({ error:'Comment is required and must be 2,000 characters or fewer.' }, { status:400 })
  await supabase('audit_events', { method:'POST', headers:{Prefer:'return=minimal'}, body:JSON.stringify({ project_id:project.id, event_type:'delivery.comment_added', metadata:{ role:'studio', author:'MINIMICAL', body:comment } }) })
  let emailSent = false
  if (project.client_email) {
    try { const result = await sendDropEmail(project.client_email, `New project message: ${project.name}`, 'A new message from Minimical', comment) ; emailSent = !!result.sent } catch {}
    await supabase('audit_events', { method:'POST', headers:{Prefer:'return=minimal'}, body:JSON.stringify({ project_id:project.id, event_type:emailSent?'notification.email_sent':'notification.email_failed', metadata:{ audience:'client', trigger:'delivery.comment_added' } }) }).catch(()=>undefined)
  }
  return NextResponse.json({ ok:true, emailSent })
}
