import { NextResponse } from 'next/server'
import { accessTokenFromRefreshToken, deleteDriveFile, renameDriveFile } from '@/lib/google-drive'
import { getProjectByToken } from '@/lib/project-access'
import { rateLimit } from '@/lib/rate-limit'
import { supabase } from '@/lib/supabase'

function validName(value: string) {
  return value.length > 0 && value.length <= 120 && !/[\u0000-\u001f\u007f]/.test(value)
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

async function getFolderContext(request: Request, token: string, folderId: string) {
  const limited = rateLimit(request, 'folder-action', 60, token)
  if (limited) return { error: limited }
  const project = await getProjectByToken(token)
  if (!project) return { error: NextResponse.json({ error: 'Upload space is unavailable or expired.' }, { status: 404 }) }
  if (!folderId || folderId.length > 200 || !/^[A-Za-z0-9_-]+$/.test(folderId)) return { error: NextResponse.json({ error: 'Invalid folder.' }, { status: 400 }) }

  const filter = isUuid(folderId)
    ? `id=eq.${encodeURIComponent(folderId)}`
    : `drive_folder_id=eq.${encodeURIComponent(folderId)}`
  const folders = await supabase<Array<{ id: string; name: string; drive_folder_id: string; parent_id: string | null }>>(`folders?project_id=eq.${project.id}&${filter}&select=id,name,drive_folder_id,parent_id&limit=1`)
  if (!folders[0]) return { error: NextResponse.json({ error: 'Folder not found.' }, { status: 404 }) }

  const accounts = await supabase<Array<{ refresh_token: string }>>(`drive_accounts?id=eq.${project.drive_account_id}&select=refresh_token&limit=1`)
  const account = accounts[0]
  if (!account) return { error: NextResponse.json({ error: 'Storage account unavailable.' }, { status: 500 }) }
  const access = await accessTokenFromRefreshToken(account.refresh_token)
  return { project, folder: folders[0], accessToken: access.access_token }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ token: string; folderId: string }> }) {
  const { token, folderId } = await params
  const result = await getFolderContext(request, token, folderId)
  if ('error' in result) return result.error
  const body = await request.json().catch(() => null) as { name?: string } | null
  const name = body?.name?.trim() || ''
  if (!validName(name)) return NextResponse.json({ error: 'A valid folder name is required.' }, { status: 400 })

  const folder = await renameDriveFile(result.accessToken, result.folder.drive_folder_id, name)
  await supabase(`folders?id=eq.${encodeURIComponent(result.folder.id)}&project_id=eq.${result.project.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ name: folder.name }) })
  await supabase('audit_events', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ project_id: result.project.id, event_type: 'folder.renamed', metadata: { folderId: result.folder.id, driveFolderId: result.folder.drive_folder_id, name: folder.name } }) })
  return NextResponse.json({ id: folder.id, name: folder.name })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ token: string; folderId: string }> }) {
  const { token, folderId } = await params
  const result = await getFolderContext(request, token, folderId)
  if ('error' in result) return result.error

  const allFolders = await supabase<Array<{ id: string; drive_folder_id: string; parent_id: string | null }>>(`folders?project_id=eq.${result.project.id}&select=id,drive_folder_id,parent_id`)
  const descendants = new Set<string>([result.folder.id])
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
  const uploads = await supabase<Array<{ id: string; size_bytes: number }>>(`uploads?project_id=eq.${result.project.id}&folder_id=in.(${descendantIds.map(encodeURIComponent).join(',')})&status=eq.complete&select=id,size_bytes`)
  const deletedBytes = uploads.reduce((total, upload) => total + (Number(upload.size_bytes) || 0), 0)

  // Google Drive permanently deletes a folder and all descendants owned by the account.
  // Do this once instead of deleting every child sequentially. That removes the old
  // multi-request bottleneck and avoids partial folder deletion failures.
  await deleteDriveFile(result.accessToken, result.folder.drive_folder_id)

  await supabase(`uploads?project_id=eq.${result.project.id}&folder_id=in.(${descendantIds.map(encodeURIComponent).join(',')})&status=eq.complete`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'deleted' }) })
  await supabase(`folders?id=in.(${descendantIds.map(encodeURIComponent).join(',')})&project_id=eq.${result.project.id}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } })
  await supabase('audit_events', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ project_id: result.project.id, event_type: 'folder.deleted', metadata: { folderId: result.folder.id, driveFolderId: result.folder.drive_folder_id, name: result.folder.name, descendantCount: descendantIds.length, fileCount: uploads.length, deletedBytes } }) })
  return NextResponse.json({ ok: true, deletedBytes, deletedCount: uploads.length })
}
