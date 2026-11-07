import { NextResponse } from 'next/server'
import { accessTokenFromRefreshToken, listDriveChildren } from '@/lib/google-drive'
import { getProjectByToken } from '@/lib/project-access'
import { rateLimit } from '@/lib/rate-limit'
import { supabase } from '@/lib/supabase'

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const limited = rateLimit(request, 'workspace', 90, token)
  if (limited) return limited
  const project = await getProjectByToken(token)
  if (!project) return NextResponse.json({ error: 'Upload space is unavailable or expired.' }, { status: 404 })

  const url = new URL(request.url)
  const parentId = url.searchParams.get('parentId') || project.drive_folder_id
  if (!/^[A-Za-z0-9_-]+$/.test(parentId)) return NextResponse.json({ error: 'Invalid folder.' }, { status: 400 })

  const metadataStart = performance.now()
  // Permission and metadata reads are independent. Authorize folder ownership
  // before touching the Drive API; keep invalid folder requests rejected.
  const folderPermission = parentId === project.drive_folder_id
    ? Promise.resolve(true)
    : supabase<Array<{ id: string }>>(`folders?project_id=eq.${project.id}&drive_folder_id=eq.${encodeURIComponent(parentId)}&select=id&limit=1`)
        .then(rows => Boolean(rows[0]))

  const [permitted, accounts, usageRows, pendingRows] = await Promise.all([
    folderPermission,
    supabase<Array<{ refresh_token: string }>>(`drive_accounts?id=eq.${project.drive_account_id}&select=refresh_token&limit=1`),
    supabase<Array<{ size_bytes: number }>>(`uploads?project_id=eq.${project.id}&status=eq.complete&select=size_bytes`),
    supabase<Array<{ size_bytes: number }>>(`uploads?project_id=eq.${project.id}&status=eq.uploading&select=size_bytes`),
  ])
  if (!permitted) return NextResponse.json({ error: 'Folder is not part of this project.' }, { status: 403 })
  const account = accounts[0]
  if (!account) return NextResponse.json({ error: 'Storage account unavailable.' }, { status: 500 })
  const metadataMs = performance.now() - metadataStart

  const { access_token } = await accessTokenFromRefreshToken(account.refresh_token)
  const drive = await listDriveChildren(access_token, parentId)
  const driveMs = performance.now() - metadataStart - metadataMs

  const usedBytes = usageRows.reduce((sum, row) => sum + Number(row.size_bytes || 0), 0)
  const pendingBytes = pendingRows.reduce((sum, row) => sum + Number(row.size_bytes || 0), 0)

  const response = NextResponse.json({
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
  response.headers.set('Server-Timing', `metadata;dur=${metadataMs.toFixed(1)}, drive;dur=${driveMs.toFixed(1)}`)
  return response
}
