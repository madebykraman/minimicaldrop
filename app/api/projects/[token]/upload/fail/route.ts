import { NextResponse } from 'next/server'
import { accessTokenFromRefreshToken, deleteDriveFile, getDriveFile, queryResumableUpload } from '@/lib/google-drive'
import { getProjectByToken } from '@/lib/project-access'
import { rateLimit } from '@/lib/rate-limit'
import { supabase } from '@/lib/supabase'

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const limited = rateLimit(request, 'upload-fail', 30, token)
  if (limited) return limited
  const project = await getProjectByToken(token)
  if (!project) return NextResponse.json({ error: 'Upload space is unavailable or expired.' }, { status: 404 })

  const body = await request.json().catch(() => null) as { uploadId?: string } | null
  if (!body?.uploadId || !/^[0-9a-f-]{36}$/i.test(body.uploadId)) return NextResponse.json({ error: 'Upload ID is required.' }, { status: 400 })

  const uploads = await supabase<Array<{ id: string; name: string; size_bytes: number; status: string; drive_file_id: string | null; session_url: string | null }>>(`uploads?id=eq.${encodeURIComponent(body.uploadId)}&project_id=eq.${project.id}&select=id,name,size_bytes,status,drive_file_id,session_url&limit=1`)
  const upload = uploads[0]
  if (!upload) return NextResponse.json({ error: 'Upload session not found.' }, { status: 404 })
  if (upload.status === 'failed' || upload.status === 'deleted') return NextResponse.json({ ok: true })
  if (upload.status === 'complete' && upload.drive_file_id) return NextResponse.json({ error: 'Upload already completed.' }, { status: 409 })

  const accounts = await supabase<Array<{ refresh_token: string }>>(`drive_accounts?id=eq.${project.drive_account_id}&select=refresh_token&limit=1`)
  const account = accounts[0]
  if (!account) return NextResponse.json({ error: 'Storage account unavailable.' }, { status: 500 })
  const access = await accessTokenFromRefreshToken(account.refresh_token)

  if (upload.session_url) {
    const status = await queryResumableUpload(access.access_token, upload.session_url, Number(upload.size_bytes))
    if ((status.status === 200 || status.status === 201) && status.data?.id) {
      const file = await getDriveFile(access.access_token, status.data.id).catch(() => null)
      if (file && !file.trashed && Number(file.size || 0) === Number(upload.size_bytes)) return NextResponse.json({ error: 'Upload completed in Google Drive. Refresh the project instead of cancelling it.' }, { status: 409 })
      await deleteDriveFile(access.access_token, status.data.id).catch(() => undefined)
    }
  }

  const now = new Date().toISOString()
  await supabase(`uploads?id=eq.${encodeURIComponent(upload.id)}&project_id=eq.${project.id}&status=in.(initiated,uploading)`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'failed', session_url: null, last_activity_at: now }) })
  await supabase('audit_events', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ project_id: project.id, event_type: 'upload.failed', file_name: upload.name, metadata: { uploadId: upload.id } }) })
  return NextResponse.json({ ok: true })
}
