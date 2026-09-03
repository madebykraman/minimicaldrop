import { NextResponse } from 'next/server'
import { accessTokenFromRefreshToken, getDriveFile, queryResumableUpload } from '@/lib/google-drive'
import { getProjectByToken } from '@/lib/project-access'
import { rateLimit } from '@/lib/rate-limit'
import { supabase } from '@/lib/supabase'

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const limited = rateLimit(request, 'upload-complete', 30, token)
  if (limited) return limited
  const project = await getProjectByToken(token)
  if (!project) return NextResponse.json({ error: 'Upload space is unavailable or expired.' }, { status: 404 })

  const body = await request.json().catch(() => null) as { uploadId?: string } | null
  if (!body?.uploadId || !/^[0-9a-f-]{36}$/i.test(body.uploadId)) return NextResponse.json({ error: 'Upload completion data is required.' }, { status: 400 })

  const uploads = await supabase<Array<{ id: string; project_id: string; folder_id: string | null; drive_file_id: string | null; session_url: string | null; size_bytes: number; status: string; name: string }>>(`uploads?id=eq.${encodeURIComponent(body.uploadId)}&project_id=eq.${project.id}&select=id,project_id,folder_id,drive_file_id,session_url,size_bytes,status,name&limit=1`)
  const upload = uploads[0]
  if (!upload) return NextResponse.json({ error: 'Upload session not found.' }, { status: 404 })
  if (upload.status === 'complete') return NextResponse.json({ ok: true, driveFileId: upload.drive_file_id })

  const accounts = await supabase<Array<{ refresh_token: string }>>(`drive_accounts?id=eq.${project.drive_account_id}&select=refresh_token&limit=1`)
  const account = accounts[0]
  if (!account) return NextResponse.json({ error: 'Storage account unavailable.' }, { status: 500 })
  const access = await accessTokenFromRefreshToken(account.refresh_token)

  let driveFileId = ''
  if (upload.session_url) {
    const status = await queryResumableUpload(access.access_token, upload.session_url, Number(upload.size_bytes))
    if ((status.status === 200 || status.status === 201) && status.data?.id) driveFileId = status.data.id
  }
  if (!driveFileId) return NextResponse.json({ error: 'Google Drive has not finished receiving this upload.' }, { status: 409 })

  const file = await getDriveFile(access.access_token, driveFileId).catch(() => null)
  const expectedParent = upload.folder_id
    ? (await supabase<Array<{ drive_folder_id: string }>>(`folders?id=eq.${upload.folder_id}&project_id=eq.${project.id}&select=drive_folder_id&limit=1`))[0]?.drive_folder_id
    : project.drive_folder_id
  if (!file || file.trashed || !expectedParent || !file.parents?.includes(expectedParent) || Number(file.size || 0) !== Number(upload.size_bytes)) return NextResponse.json({ error: 'Google Drive did not confirm the uploaded file.' }, { status: 409 })

  const now = new Date().toISOString()
  await supabase(`uploads?id=eq.${encodeURIComponent(upload.id)}&project_id=eq.${project.id}&status=eq.uploading`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ drive_file_id: driveFileId, session_url: null, status: 'complete', completed_at: now, last_activity_at: now }) })
  await supabase('audit_events', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ project_id: project.id, event_type: 'upload.completed', file_name: upload.name, metadata: { uploadId: upload.id, driveFileId, size: upload.size_bytes } }) })
  return NextResponse.json({ ok: true, driveFileId })
}
