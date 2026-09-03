import { NextResponse } from 'next/server'
import { accessTokenFromRefreshToken, deleteDriveFile, renameDriveFile } from '@/lib/google-drive'
import { getProjectByToken } from '@/lib/project-access'
import { supabase } from '@/lib/supabase'

export async function PATCH(request: Request, { params }: { params: Promise<{ token: string; fileId: string }> }) {
  const { token, fileId } = await params
  const project = await getProjectByToken(token)
  if (!project) return NextResponse.json({ error: 'Upload space is unavailable or expired.' }, { status: 404 })

  const body = await request.json().catch(() => null) as { name?: string } | null
  const name = body?.name?.trim()
  if (!name || name.length > 255) return NextResponse.json({ error: 'A valid file name is required.' }, { status: 400 })

  const uploads = await supabase<Array<{ id: string }>>(`uploads?project_id=eq.${project.id}&drive_file_id=eq.${encodeURIComponent(fileId)}&status=eq.complete&select=id&limit=1`)
  if (!uploads[0]) return NextResponse.json({ error: 'File not found.' }, { status: 404 })

  const accounts = await supabase<Array<{ refresh_token: string }>>(`drive_accounts?id=eq.${project.drive_account_id}&select=refresh_token&limit=1`)
  const account = accounts[0]
  if (!account) return NextResponse.json({ error: 'Storage account unavailable.' }, { status: 500 })
  const access = await accessTokenFromRefreshToken(account.refresh_token)
  const file = await renameDriveFile(access.access_token, fileId, name)

  await supabase(`uploads?id=eq.${encodeURIComponent(uploads[0].id)}&project_id=eq.${project.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ name: file.name }) })
  await supabase('audit_events', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ project_id: project.id, event_type: 'file.renamed', file_name: file.name, metadata: { driveFileId: fileId } }) })
  return NextResponse.json({ id: file.id, name: file.name })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ token: string; fileId: string }> }) {
  const { token, fileId } = await params
  const project = await getProjectByToken(token)
  if (!project) return NextResponse.json({ error: 'Upload space is unavailable or expired.' }, { status: 404 })

  const uploads = await supabase<Array<{ id: string; name: string }>>(`uploads?project_id=eq.${project.id}&drive_file_id=eq.${encodeURIComponent(fileId)}&status=eq.complete&select=id,name&limit=1`)
  const upload = uploads[0]
  if (!upload) return NextResponse.json({ error: 'File not found.' }, { status: 404 })

  const accounts = await supabase<Array<{ refresh_token: string }>>(`drive_accounts?id=eq.${project.drive_account_id}&select=refresh_token&limit=1`)
  const account = accounts[0]
  if (!account) return NextResponse.json({ error: 'Storage account unavailable.' }, { status: 500 })
  const access = await accessTokenFromRefreshToken(account.refresh_token)
  await deleteDriveFile(access.access_token, fileId)

  await supabase(`uploads?id=eq.${encodeURIComponent(upload.id)}&project_id=eq.${project.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'failed' }) })
  await supabase('audit_events', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ project_id: project.id, event_type: 'file.deleted', file_name: upload.name, metadata: { driveFileId: fileId } }) })
  return NextResponse.json({ ok: true })
}
