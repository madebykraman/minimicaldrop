import { NextResponse } from 'next/server'
import { getProjectByToken } from '@/lib/project-access'
import { supabase } from '@/lib/supabase'

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const project = await getProjectByToken(token)
  if (!project) return NextResponse.json({ error: 'Upload space is unavailable or expired.' }, { status: 404 })

  const body = await request.json().catch(() => null) as { uploadId?: string; driveFileId?: string; size?: number } | null
  if (!body?.uploadId || !body.driveFileId) return NextResponse.json({ error: 'Upload completion data is required.' }, { status: 400 })

  const uploads = await supabase<Array<{ id: string; project_id: string; size_bytes: number; status: string }>>(`uploads?id=eq.${encodeURIComponent(body.uploadId)}&project_id=eq.${project.id}&select=id,project_id,size_bytes,status&limit=1`)
  const upload = uploads[0]
  if (!upload) return NextResponse.json({ error: 'Upload session not found.' }, { status: 404 })
  if (upload.status === 'complete') return NextResponse.json({ ok: true })

  await supabase(`uploads?id=eq.${encodeURIComponent(upload.id)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ drive_file_id: body.driveFileId, status: 'complete', completed_at: new Date().toISOString() }),
  })

  await supabase(`projects?id=eq.${project.id}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ storage_used_bytes: Number(project.storage_used_bytes || 0) + Number(upload.size_bytes) }),
  })

  await supabase('audit_events', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ project_id: project.id, event_type: 'upload.completed', metadata: { uploadId: upload.id, driveFileId: body.driveFileId, size: upload.size_bytes } }),
  })

  return NextResponse.json({ ok: true })
}
