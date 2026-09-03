import { NextResponse } from 'next/server'
import { accessTokenFromRefreshToken, downloadDriveFile, getDriveFile } from '@/lib/google-drive'
import { getProjectByToken } from '@/lib/project-access'
import { supabase } from '@/lib/supabase'

export async function GET(request: Request, { params }: { params: Promise<{ token: string; fileId: string }> }) {
  const { token, fileId } = await params
  const project = await getProjectByToken(token)
  if (!project) return NextResponse.json({ error: 'Upload space is unavailable or expired.' }, { status: 404 })
  if (!fileId || fileId.length > 200) return NextResponse.json({ error: 'Invalid file.' }, { status: 400 })

  const accounts = await supabase<Array<{ refresh_token: string }>>(`drive_accounts?id=eq.${project.drive_account_id}&select=refresh_token&limit=1`)
  const account = accounts[0]
  if (!account) return NextResponse.json({ error: 'Storage account unavailable.' }, { status: 500 })

  const access = await accessTokenFromRefreshToken(account.refresh_token)
  const file = await getDriveFile(access.access_token, fileId).catch(() => null)
  if (!file || file.trashed || file.mimeType === 'application/vnd.google-apps.folder') return NextResponse.json({ error: 'File not found.' }, { status: 404 })
  if (file.capabilities?.canDownload === false) return NextResponse.json({ error: 'This file cannot be downloaded.' }, { status: 403 })

  const folderRows = await supabase<Array<{ drive_folder_id: string }>>(`folders?project_id=eq.${project.id}&select=drive_folder_id`)
  const allowedParents = new Set([project.drive_folder_id, ...folderRows.map(row => row.drive_folder_id)])
  if (!file.parents?.some(parent => allowedParents.has(parent))) return NextResponse.json({ error: 'File is not part of this project.' }, { status: 403 })

  const range = request.headers.get('range') || undefined
  const response = await downloadDriveFile(access.access_token, file.id, range)
  const headers = new Headers()
  headers.set('Content-Type', file.mimeType || 'application/octet-stream')
  headers.set('Content-Disposition', `attachment; filename="${file.name.replace(/["\\\r\n]/g, '_')}"`)
  headers.set('Accept-Ranges', 'bytes')
  if (file.size) headers.set('Content-Length', file.size)
  if (range) {
    const contentRange = response.headers.get('Content-Range')
    if (contentRange) headers.set('Content-Range', contentRange)
  }
  return new Response(response.body, { status: response.status, headers })
}
