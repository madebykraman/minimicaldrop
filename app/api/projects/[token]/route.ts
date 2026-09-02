import { NextResponse } from 'next/server'
import { accessTokenFromRefreshToken, listDriveChildren } from '@/lib/google-drive'
import { getProjectByToken } from '@/lib/project-access'
import { supabase } from '@/lib/supabase'

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
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
  const drive = await listDriveChildren(access_token, parentId)
  const usageRows = await supabase<Array<{ size_bytes: number }>>(`uploads?project_id=eq.${project.id}&status=eq.complete&select=size_bytes`)
  const usedBytes = usageRows.reduce((sum, row) => sum + Number(row.size_bytes || 0), 0)

  return NextResponse.json({
    project: { id: project.id, name: project.name, clientName: project.client_name, expiresAt: project.expires_at, storageLimitBytes: project.storage_limit_bytes },
    currentFolderId: parentId,
    items: drive.files.map(file => ({ id: file.id, name: file.name, mimeType: file.mimeType, sizeBytes: file.size ? Number(file.size) : 0, modifiedTime: file.modifiedTime || null })),
    usedBytes,
  })
}
