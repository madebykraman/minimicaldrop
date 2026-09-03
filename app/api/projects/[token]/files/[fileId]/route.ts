import { NextResponse } from 'next/server'
import { accessTokenFromRefreshToken, deleteDriveFile, downloadDriveFile, getDriveFile, renameDriveFile } from '@/lib/google-drive'
import { getProjectByToken } from '@/lib/project-access'
import { rateLimit } from '@/lib/rate-limit'
import { supabase } from '@/lib/supabase'

async function getProjectFile(request: Request, token: string, fileId: string) {
  const limited = rateLimit(request, 'file-action', 60, token)
  if (limited) return { error: limited }
  const project = await getProjectByToken(token)
  if (!project) return { error: NextResponse.json({ error: 'Upload space is unavailable or expired.' }, { status: 404 }) }
  if (!fileId || fileId.length > 200 || !/^[A-Za-z0-9_-]+$/.test(fileId)) return { error: NextResponse.json({ error: 'Invalid file.' }, { status: 400 }) }

  const accounts = await supabase<Array<{ refresh_token: string }>>(`drive_accounts?id=eq.${project.drive_account_id}&select=refresh_token&limit=1`)
  const account = accounts[0]
  if (!account) return { error: NextResponse.json({ error: 'Storage account unavailable.' }, { status: 500 }) }
  const access = await accessTokenFromRefreshToken(account.refresh_token)
  const file = await getDriveFile(access.access_token, fileId).catch(() => null)
  if (!file || file.trashed || file.mimeType === 'application/vnd.google-apps.folder') return { error: NextResponse.json({ error: 'File not found.' }, { status: 404 }) }

  const folderRows = await supabase<Array<{ drive_folder_id: string }>>(`folders?project_id=eq.${project.id}&select=drive_folder_id`)
  const allowedParents = new Set([project.drive_folder_id, ...folderRows.map(row => row.drive_folder_id)])
  if (!file.parents?.some(parent => allowedParents.has(parent))) return { error: NextResponse.json({ error: 'File is not part of this project.' }, { status: 403 }) }

  return { project, accessToken: access.access_token, file }
}

function safeFilename(name: string) {
  return name.replace(/["\\\r\n]/g, '_').replace(/[\u0000-\u001f\u007f]/g, '_')
}

export async function GET(request: Request, { params }: { params: Promise<{ token: string; fileId: string }> }) {
  const { token, fileId } = await params
  const inline = new URL(request.url).searchParams.get('inline') === '1'

  if (inline) {
    const limited = rateLimit(request, 'file-preview', 60, token)
    if (limited) return limited
    const project = await getProjectByToken(token)
    if (!project) return NextResponse.json({ error: 'Upload space is unavailable or expired.' }, { status: 404 })
    if (!fileId || fileId.length > 200 || !/^[A-Za-z0-9_-]+$/.test(fileId)) return NextResponse.json({ error: 'Invalid file.' }, { status: 400 })

    const uploads = await supabase<Array<{ id: string; name: string; mime_type: string | null; size_bytes: number; folder_id: string | null }>>(`uploads?project_id=eq.${project.id}&drive_file_id=eq.${encodeURIComponent(fileId)}&status=eq.complete&select=id,name,mime_type,size_bytes,folder_id&limit=1`)
    const upload = uploads[0]
    if (!upload) return NextResponse.json({ error: 'File not found.' }, { status: 404 })
    if (upload.folder_id) {
      const folders = await supabase<Array<{ id: string }>>(`folders?project_id=eq.${project.id}&id=eq.${encodeURIComponent(upload.folder_id)}&select=id&limit=1`)
      if (!folders[0]) return NextResponse.json({ error: 'File is not part of this project.' }, { status: 403 })
    }

    const accounts = await supabase<Array<{ refresh_token: string }>>(`drive_accounts?id=eq.${project.drive_account_id}&select=refresh_token&limit=1`)
    const account = accounts[0]
    if (!account) return NextResponse.json({ error: 'Storage account unavailable.' }, { status: 500 })
    const access = await accessTokenFromRefreshToken(account.refresh_token)
    const range = request.headers.get('range') || undefined
    const response = await downloadDriveFile(access.access_token, fileId, range)
    const headers = new Headers()
    headers.set('Content-Type', upload.mime_type || 'application/octet-stream')
    headers.set('Content-Disposition', `inline; filename="${safeFilename(upload.name)}"`)
    headers.set('Accept-Ranges', 'bytes')
    headers.set('Cache-Control', 'private, max-age=3600, stale-while-revalidate=60')
    headers.set('X-Content-Type-Options', 'nosniff')
    const contentLength = response.headers.get('Content-Length')
    if (contentLength) headers.set('Content-Length', contentLength)
    const contentRange = response.headers.get('Content-Range')
    if (contentRange) headers.set('Content-Range', contentRange)
    return new Response(response.body, { status: response.status, headers })
  }

  const result = await getProjectFile(request, token, fileId)
  if ('error' in result) return result.error
  const { project, accessToken, file } = result
  if (file.capabilities?.canDownload === false) return NextResponse.json({ error: 'This file cannot be downloaded.' }, { status: 403 })

  const range = request.headers.get('range') || undefined
  const response = await downloadDriveFile(accessToken, file.id, range)
  const headers = new Headers()
  headers.set('Content-Type', file.mimeType || 'application/octet-stream')
  headers.set('Content-Disposition', `attachment; filename="${safeFilename(file.name)}"`)
  headers.set('Accept-Ranges', 'bytes')
  headers.set('Cache-Control', 'private, no-store, max-age=0')
  headers.set('X-Content-Type-Options', 'nosniff')
  const contentLength = response.headers.get('Content-Length')
  if (contentLength) headers.set('Content-Length', contentLength)
  const contentRange = response.headers.get('Content-Range')
  if (contentRange) headers.set('Content-Range', contentRange)
  await supabase('audit_events', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ project_id: project.id, event_type: 'file.downloaded', file_name: file.name, metadata: { driveFileId: file.id, range: range || null } }) })
  return new Response(response.body, { status: response.status, headers })
}

export async function PATCH(request: Request, { params }: { params: Promise<{ token: string; fileId: string }> }) {
  const { token, fileId } = await params
  const result = await getProjectFile(request, token, fileId)
  if ('error' in result) return result.error
  const { project, accessToken } = result
  const body = await request.json().catch(() => null) as { name?: string } | null
  const name = body?.name?.trim()
  if (!name || name.length > 255 || /[\u0000-\u001f\u007f]/.test(name)) return NextResponse.json({ error: 'A valid file name is required.' }, { status: 400 })

  const uploads = await supabase<Array<{ id: string }>>(`uploads?project_id=eq.${project.id}&drive_file_id=eq.${encodeURIComponent(fileId)}&status=eq.complete&select=id&limit=1`)
  if (!uploads[0]) return NextResponse.json({ error: 'File is not managed by this portal.' }, { status: 404 })

  const file = await renameDriveFile(accessToken, fileId, name)
  await supabase(`uploads?id=eq.${encodeURIComponent(uploads[0].id)}&project_id=eq.${project.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ name: file.name }) })
  await supabase('audit_events', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ project_id: project.id, event_type: 'file.renamed', file_name: file.name, metadata: { driveFileId: fileId } }) })
  return NextResponse.json({ id: file.id, name: file.name })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ token: string; fileId: string }> }) {
  const { token, fileId } = await params
  const result = await getProjectFile(request, token, fileId)
  if ('error' in result) return result.error
  const { project, accessToken } = result
  const uploads = await supabase<Array<{ id: string; name: string }>>(`uploads?project_id=eq.${project.id}&drive_file_id=eq.${encodeURIComponent(fileId)}&status=eq.complete&select=id,name&limit=1`)
  const upload = uploads[0]
  if (!upload) return NextResponse.json({ error: 'File is not managed by this portal.' }, { status: 404 })

  await deleteDriveFile(accessToken, fileId)
  await supabase(`uploads?id=eq.${encodeURIComponent(upload.id)}&project_id=eq.${project.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'deleted' }) })
  await supabase('audit_events', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ project_id: project.id, event_type: 'file.deleted', file_name: upload.name, metadata: { driveFileId: fileId } }) })
  return NextResponse.json({ ok: true })
}
