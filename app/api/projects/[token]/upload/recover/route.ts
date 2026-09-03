import { NextResponse } from 'next/server'
import { accessTokenFromRefreshToken, getDriveFile, queryResumableUpload } from '@/lib/google-drive'
import { getProjectByToken } from '@/lib/project-access'
import { supabase } from '@/lib/supabase'

const RECOVERY_WINDOW_MS = 24 * 60 * 60 * 1000

function offsetFromRange(range: string | null) {
  const match = range?.match(/bytes=0-(\d+)/)
  return match ? Number(match[1]) + 1 : 0
}

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const project = await getProjectByToken(token)
  if (!project) return NextResponse.json({ error: 'Upload space is unavailable or expired.' }, { status: 404 })

  const cutoff = new Date(Date.now() - RECOVERY_WINDOW_MS).toISOString()
  const uploads = await supabase<Array<{
    id: string
    folder_id: string | null
    name: string
    mime_type: string | null
    size_bytes: number
    status: string
    session_url: string | null
    created_at: string
  }>>(`uploads?project_id=eq.${project.id}&status=eq.uploading&last_activity_at=gte.${encodeURIComponent(cutoff)}&select=id,folder_id,name,mime_type,size_bytes,status,session_url,created_at&order=created_at.asc`)

  if (!uploads.length) return NextResponse.json({ uploads: [] })

  const accounts = await supabase<Array<{ refresh_token: string }>>(`drive_accounts?id=eq.${project.drive_account_id}&select=refresh_token&limit=1`)
  const account = accounts[0]
  if (!account) return NextResponse.json({ error: 'Storage account unavailable.' }, { status: 500 })
  const access = await accessTokenFromRefreshToken(account.refresh_token)

  const recoverable = []
  for (const upload of uploads) {
    if (!upload.session_url) continue
    const result = await queryResumableUpload(access.access_token, upload.session_url, Number(upload.size_bytes))

    if ((result.status === 200 || result.status === 201) && result.data?.id) {
      const file = await getDriveFile(access.access_token, result.data.id).catch(() => null)
      if (file && !file.trashed && Number(file.size || 0) === Number(upload.size_bytes)) {
        await supabase(`uploads?id=eq.${encodeURIComponent(upload.id)}&project_id=eq.${project.id}`, {
          method: 'PATCH',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({ drive_file_id: result.data.id, session_url: null, status: 'complete', completed_at: new Date().toISOString(), last_activity_at: new Date().toISOString() }),
        })
        await supabase('audit_events', {
          method: 'POST',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({ project_id: project.id, event_type: 'upload.recovered_completed', file_name: upload.name, metadata: { uploadId: upload.id, driveFileId: result.data.id, size: upload.size_bytes } }),
        })
        continue
      }
    }

    if (result.status === 404 || result.status === 410) {
      await supabase(`uploads?id=eq.${encodeURIComponent(upload.id)}&project_id=eq.${project.id}&status=eq.uploading`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ status: 'failed', session_url: null, last_activity_at: new Date().toISOString() }),
      })
      await supabase('audit_events', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ project_id: project.id, event_type: 'upload.recovery_expired', file_name: upload.name, metadata: { uploadId: upload.id } }),
      })
      continue
    }

    const uploadedBytes = result.status === 308 ? offsetFromRange(result.range) : 0
    await supabase(`rpc/touch_upload_activity`, {
      method: 'POST',
      body: JSON.stringify({ p_upload_id: upload.id, p_project_id: project.id }),
    }).catch(() => undefined)

    recoverable.push({
      uploadId: upload.id,
      name: upload.name,
      mimeType: upload.mime_type,
      sizeBytes: Number(upload.size_bytes),
      uploadedBytes,
      folderId: upload.folder_id,
      sessionUrl: upload.session_url,
      createdAt: upload.created_at,
    })
  }

  return NextResponse.json({ uploads: recoverable })
}
