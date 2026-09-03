import { NextResponse } from 'next/server'
import { accessTokenFromRefreshToken, createEmptyDriveFile, initiateResumableUpload } from '@/lib/google-drive'
import { getProjectByToken } from '@/lib/project-access'
import { rateLimit } from '@/lib/rate-limit'
import { supabase } from '@/lib/supabase'

const MAX_NAME = 255

function validName(value: string) {
  return value.length > 0 && value.length <= MAX_NAME && !/[\u0000-\u001f\u007f]/.test(value)
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const limited = rateLimit(request, 'upload-init', 30, token)
  if (limited) return limited
  const project = await getProjectByToken(token)
  if (!project) return NextResponse.json({ error: 'Upload space is unavailable or expired.' }, { status: 404 })

  const body = await request.json().catch(() => null) as { name?: string; mimeType?: string; size?: number; parentId?: string } | null
  const name = body?.name?.trim() || ''
  const size = Number(body?.size)
  if (!validName(name) || !Number.isSafeInteger(size) || size < 0) return NextResponse.json({ error: 'Invalid upload metadata.' }, { status: 400 })

  const parentId = body?.parentId || project.drive_folder_id
  let folderId: string | null = null
  if (parentId !== project.drive_folder_id) {
    const folders = await supabase<Array<{ id: string; drive_folder_id: string }>>(`folders?project_id=eq.${project.id}&drive_folder_id=eq.${encodeURIComponent(parentId)}&select=id,drive_folder_id&limit=1`)
    if (!folders[0]) return NextResponse.json({ error: 'Folder is not part of this project.' }, { status: 403 })
    folderId = folders[0].id
  }

  const accounts = await supabase<Array<{ refresh_token: string }>>(`drive_accounts?id=eq.${project.drive_account_id}&select=refresh_token&limit=1`)
  const account = accounts[0]
  if (!account) return NextResponse.json({ error: 'Storage account unavailable.' }, { status: 500 })
  const accessToken = (await accessTokenFromRefreshToken(account.refresh_token)).access_token
  const mimeType = body?.mimeType?.trim() || 'application/octet-stream'

  if (size === 0) {
    let uploadId: string | null = null
    try {
      uploadId = await supabase<string>('rpc/reserve_upload', {
        method: 'POST',
        body: JSON.stringify({ p_project_id: project.id, p_folder_id: folderId, p_name: name, p_mime_type: mimeType, p_size_bytes: 0, p_session_url: null }),
      })
      if (!uploadId) throw new Error('Upload reservation failed')
      const file = await createEmptyDriveFile(accessToken, name, mimeType, parentId)
      await supabase(`uploads?id=eq.${encodeURIComponent(uploadId)}&project_id=eq.${project.id}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ drive_file_id: file.id, status: 'complete', completed_at: new Date().toISOString(), last_activity_at: new Date().toISOString() }),
      })
      await supabase('audit_events', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ project_id: project.id, event_type: 'upload.completed', file_name: name, metadata: { uploadId, driveFileId: file.id, size: 0 } }) })
      return NextResponse.json({ uploadId, driveFileId: file.id, complete: true })
    } catch (error) {
      if (uploadId) await supabase(`uploads?id=eq.${encodeURIComponent(uploadId)}&project_id=eq.${project.id}&status=eq.uploading`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'failed', session_url: null }) }).catch(() => undefined)
      const message = error instanceof Error ? error.message : 'Unable to create empty file.'
      if (message.toLowerCase().includes('storage limit')) return NextResponse.json({ error: 'This upload would exceed the project storage limit.' }, { status: 413 })
      throw error
    }
  }

  const sessionUrl = await initiateResumableUpload(accessToken, name, mimeType, size, parentId)
  try {
    const uploadId = await supabase<string>('rpc/reserve_upload', {
      method: 'POST',
      body: JSON.stringify({ p_project_id: project.id, p_folder_id: folderId, p_name: name, p_mime_type: mimeType, p_size_bytes: size, p_session_url: sessionUrl }),
    })
    if (!uploadId) return NextResponse.json({ error: 'Upload session could not be created.' }, { status: 500 })
    return NextResponse.json({ uploadId, sessionUrl })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to reserve upload space.'
    if (message.toLowerCase().includes('storage limit')) return NextResponse.json({ error: 'This upload would exceed the project storage limit.' }, { status: 413 })
    throw error
  }
}
