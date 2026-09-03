import { NextResponse } from 'next/server'
import { accessTokenFromRefreshToken, getDriveFile, listDriveChildren, queryResumableUpload } from '@/lib/google-drive'
import { getProjectByToken } from '@/lib/project-access'
import { rateLimit } from '@/lib/rate-limit'
import { supabase } from '@/lib/supabase'

const FOLDER_MIME = 'application/vnd.google-apps.folder'

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const limited = rateLimit(request, 'workspace', 90, token)
  if (limited) return limited
  const project = await getProjectByToken(token)
  if (!project) return NextResponse.json({ error: 'Upload space is unavailable or expired.' }, { status: 404 })

  const url = new URL(request.url)
  const parentId = url.searchParams.get('parentId') || project.drive_folder_id
  if (parentId !== project.drive_folder_id) {
    const folders = await supabase<Array<{ id: string; drive_folder_id: string }>>(`folders?project_id=eq.${project.id}&drive_folder_id=eq.${encodeURIComponent(parentId)}&select=id,drive_folder_id&limit=1`)
    if (!folders[0]) return NextResponse.json({ error: 'Folder is not part of this project.' }, { status: 403 })
  }

  const accounts = await supabase<Array<{ refresh_token: string }>>(`drive_accounts?id=eq.${project.drive_account_id}&select=refresh_token&limit=1`)
  const account = accounts[0]
  if (!account) return NextResponse.json({ error: 'Storage account unavailable.' }, { status: 500 })
  const { access_token } = await accessTokenFromRefreshToken(account.refresh_token)

  const [folderRows, uploadRows, pendingRows] = await Promise.all([
    supabase<Array<{ id: string; drive_folder_id: string }>>(`folders?project_id=eq.${project.id}&select=id,drive_folder_id`),
    supabase<Array<{ id: string; drive_file_id: string; size_bytes: number; name: string }>>(`uploads?project_id=eq.${project.id}&status=eq.complete&select=id,drive_file_id,size_bytes,name`),
    supabase<Array<{ id: string; folder_id: string | null; session_url: string | null; size_bytes: number; name: string }>>(`uploads?project_id=eq.${project.id}&status=eq.uploading&select=id,folder_id,session_url,size_bytes,name&limit=100`),
  ])

  const projectFolderIds = [project.drive_folder_id, ...folderRows.map(row => row.drive_folder_id)]
  const folderResults = await Promise.all(projectFolderIds.map(folderId => listDriveChildren(access_token, folderId)))
  const liveFiles = new Map<string, { size: number; name: string }>()
  for (const result of folderResults) for (const file of result.files) if (file.mimeType !== FOLDER_MIME) liveFiles.set(file.id, { size: Number(file.size || 0), name: file.name })

  await Promise.all(uploadRows.map(async upload => {
    const live = liveFiles.get(upload.drive_file_id)
    if (!live) {
      await supabase(`uploads?id=eq.${encodeURIComponent(upload.id)}&project_id=eq.${project.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'deleted' }) })
      await supabase('audit_events', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ project_id: project.id, event_type: 'file.deleted.externally', file_name: upload.name, metadata: { driveFileId: upload.drive_file_id } }) })
      return
    }
    if (live.size !== Number(upload.size_bytes) || live.name !== upload.name) await supabase(`uploads?id=eq.${encodeURIComponent(upload.id)}&project_id=eq.${project.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ size_bytes: live.size, name: live.name }) })
  }))

  const folderMap = new Map(folderRows.map(row => [row.id, row.drive_folder_id]))
  await Promise.all(pendingRows.map(async upload => {
    if (!upload.session_url) {
      await supabase(`uploads?id=eq.${encodeURIComponent(upload.id)}&project_id=eq.${project.id}&status=eq.uploading`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'failed' }) }).catch(() => undefined)
      return
    }

    const status = await queryResumableUpload(access_token, upload.session_url, Number(upload.size_bytes)).catch(() => null)
    if (!status) return
    if (status.status === 200 || status.status === 201) {
      const driveFileId = status.data?.id
      const expectedParent = upload.folder_id ? folderMap.get(upload.folder_id) : project.drive_folder_id
      const file = driveFileId ? await getDriveFile(access_token, driveFileId).catch(() => null) : null
      const valid = !!file && !file.trashed && !!expectedParent && !!file.parents?.includes(expectedParent) && Number(file.size || 0) === Number(upload.size_bytes)
      if (valid && driveFileId) {
        const now = new Date().toISOString()
        await supabase(`uploads?id=eq.${encodeURIComponent(upload.id)}&project_id=eq.${project.id}&status=eq.uploading`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ drive_file_id: driveFileId, session_url: null, status: 'complete', completed_at: now, last_activity_at: now }) }).catch(() => undefined)
        await supabase('audit_events', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ project_id: project.id, event_type: 'upload.completed.reconciled', file_name: upload.name, metadata: { uploadId: upload.id, driveFileId, size: upload.size_bytes } }) }).catch(() => undefined)
      } else {
        await supabase(`uploads?id=eq.${encodeURIComponent(upload.id)}&project_id=eq.${project.id}&status=eq.uploading`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'failed', session_url: null }) }).catch(() => undefined)
      }
      return
    }
    if (status.status === 404 || status.status === 410) {
      await supabase(`uploads?id=eq.${encodeURIComponent(upload.id)}&project_id=eq.${project.id}&status=eq.uploading`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'failed', session_url: null }) }).catch(() => undefined)
    }
  }))

  const drive = await listDriveChildren(access_token, parentId)
  const usageRows = await supabase<Array<{ size_bytes: number }>>(`uploads?project_id=eq.${project.id}&status=eq.complete&select=size_bytes`)
  const pendingNow = await supabase<Array<{ size_bytes: number }>>(`uploads?project_id=eq.${project.id}&status=eq.uploading&select=size_bytes`)
  const usedBytes = usageRows.reduce((sum, row) => sum + Number(row.size_bytes || 0), 0)
  const pendingBytes = pendingNow.reduce((sum, row) => sum + Number(row.size_bytes || 0), 0)

  return NextResponse.json({
    project: {
      id: project.id,
      name: project.name,
      clientName: project.client_name,
      expiresAt: project.expires_at,
      storageLimitBytes: project.storage_limit_bytes,
      deliveryStatus: project.delivery_status || 'in_progress',
      clientMessage: project.client_message || null,
    },
    currentFolderId: parentId,
    items: drive.files.map(file => ({ id: file.id, name: file.name, mimeType: file.mimeType, sizeBytes: file.size ? Number(file.size) : 0, modifiedTime: file.modifiedTime || null })),
    usedBytes,
    pendingBytes,
  })
}
