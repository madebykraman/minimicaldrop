import { NextResponse } from 'next/server'
import { isAdmin } from '@/lib/admin-auth'
import { supabase } from '@/lib/supabase'

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  const projects = await supabase<Array<{ id:string; name:string; client_name:string; client_email:string|null; storage_limit_bytes:number|null; expires_at:string; disabled_at:string|null; delivery_status:string; created_at:string }>>('projects?select=id,name,client_name,client_email,storage_limit_bytes,expires_at,disabled_at,delivery_status,created_at&order=created_at.desc')
  const uploads = await supabase<Array<{ project_id:string; size_bytes:number; status:string }>>('uploads?select=project_id,size_bytes,status')
  const activity = await supabase<Array<{ id:string; project_id:string; event_type:string; file_name:string|null; metadata:unknown; created_at:string }>>('audit_events?select=id,project_id,event_type,file_name,metadata,created_at&order=created_at.desc&limit=80')
  const usage = new Map<string, { usedBytes:number; pendingBytes:number; fileCount:number }>()
  for (const upload of uploads) {
    const current = usage.get(upload.project_id) || { usedBytes:0, pendingBytes:0, fileCount:0 }
    const size = Number(upload.size_bytes || 0)
    if (upload.status === 'complete') { current.usedBytes += size; current.fileCount += 1 }
    if (upload.status === 'uploading') current.pendingBytes += size
    usage.set(upload.project_id, current)
  }
  const now = Date.now()
  const enriched = projects.map(project => {
    const stats = usage.get(project.id) || { usedBytes:0, pendingBytes:0, fileCount:0 }
    const expires = new Date(project.expires_at).getTime()
    return { ...project, ...stats, active: !project.disabled_at && expires > now, daysToExpiry: Math.ceil((expires-now)/86400000) }
  })
  const totals = enriched.reduce((acc,p) => ({ projects:acc.projects+1, active:acc.active+(p.active?1:0), usedBytes:acc.usedBytes+p.usedBytes, pendingBytes:acc.pendingBytes+p.pendingBytes, limitedBytes:acc.limitedBytes+(p.storage_limit_bytes||0) }), { projects:0, active:0, usedBytes:0, pendingBytes:0, limitedBytes:0 })
  return NextResponse.json({ projects:enriched, totals, activity })
}
