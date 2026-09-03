import { NextResponse } from 'next/server'
import { accessTokenFromRefreshToken, deleteDriveFile, renameDriveFile } from '@/lib/google-drive'
import { getProjectByToken } from '@/lib/project-access'
import { supabase } from '@/lib/supabase'

async function getFolderContext(token: string, folderId: string) {
  const project = await getProjectByToken(token)
  if (!project) return { error: NextResponse.json({ error: 'Upload space is unavailable or expired.' }, { status: 404 }) }
  if (!folderId || folderId.length > 200) return { error: NextResponse.json({ error: 'Invalid folder.' }, { status: 400 }) }

  const folders = await supabase<Array<{ id: string; name: string; drive_folder_id: string; parent_id: string | null }>>(`folders?id=eq.${encodeURIComponent(folderId)}&project_id=eq.${project.id}&select=id,name,drive_folder_id,parent_id&limit=1`)
  if (!folders[0]) return { error: NextResponse.json({ error: 'Folder not found.' }, { status: 404 }) }

  const accounts = await supabase<Array<{ refresh_token: string }>>(`drive_accounts?id=eq.${project.drive_account_id}&select=refresh_token&limit=1`)
  const account = accounts[0]
  if (!account) return { error: NextResponse.json({ error: 'Storage account unavailable.' }, { status: 500 }) }
  const access = await accessTokenFromRefreshToken(account.refresh_token)
  return { project, folder: folders[0], accessToken: access.access_token }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ token: string; folderId: string }> }) {
  const { token, folderId } = await params
  const result = await getFolderContext(token, folderId)
  if ('error' in result) return result.error

  const body = await request.json().catch(() => null) as { name?: string } | null
  const name = body?.name?.trim()
  if (!name || name.length > 120) return NextResponse.json({ error: 'A valid folder name is required.' }, { status: 400 })

  const folder = await renameDriveFile(result.accessToken, result.folder.drive_folder_id, name)
  await supabase(`folders?id=eq.${encodeURIComponent(folderId)}&project_id=eq.${result.project.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ name: folder.name }) })
  await supabase('audit_events', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ project_id: result.project.id, event_type: 'folder.renamed', metadata: { folderId, name: folder.name } }) })
  return NextResponse.json({ id: folder.id, name: folder.name })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ token: string; folderId: string }> }) {
  const { token, folderId } = await params
  const result = await getFolderContext(token, folderId)
  if ('error' in result) return result.error

  const allFolders = await supabase<Array<{ id: string; drive_folder_id: string; parent_id: string | null }>>(`folders?project_id=eq.${result.project.id}&select=id,drive_folder_id,parent_id`)
  const descendants = new Set<string>([folderId])
  let changed = true
  while (changed) {
    changed = false
    for (const folder of allFolders) {
      if (folder.parent_id && descendants.has(folder.parent_id) && !descendants.has(folder.id)) {
        descendants.add(folder.id)
        changed = true
      }
    }
  }

  const descendantIds = Array.from(descendants)
  const uploads = await supabase<Array<{ id: string; name: string; drive_file_id: string | null }>>(`uploads?project_id=eq.${result.project.id}&folder_id=in.(${descendantIds.map(encodeURIComponent).join(',')})&status=eq.complete&select=id,name,drive_file_id`)
  for (const upload of uploads) {
    if (upload.drive_file_id) {
      await deleteDriveFile(result.accessToken, upload.drive_file_id).catch(() => undefined)
    }
    await supabase(`uploads?id=eq.${encodeURIComponent(upload.id)}&project_id=eq.${result.project.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'failed' }) })
  }

  await deleteDriveFile(result.accessToken, result.folder.drive_folder_id)
  await supabase(`folders?id=in.(${descendantIds.map(encodeURIComponent).join(',')})&project_id=eq.${result.project.id}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } })
  await supabase('audit_events', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ project_id: result.project.id, event_type: 'folder.deleted', metadata: { folderId, name: result.folder.name, descendantCount: descendantIds.length, fileCount: uploads.length } }) })
  return NextResponse.json({ ok: true })
}
