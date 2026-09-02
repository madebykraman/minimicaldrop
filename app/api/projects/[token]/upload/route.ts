import { NextResponse } from 'next/server'
import { accessTokenFromRefreshToken, initiateResumableUpload } from '@/lib/google-drive'
import { getProjectByToken } from '@/lib/project-access'
import { supabase } from '@/lib/supabase'

const MAX_NAME = 255

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const project = await getProjectByToken(token)
  if (!project) return NextResponse.json({ error: 'Upload space is unavailable or expired.' }, { status: 404 })

  const body = await request.json().catch(() => null) as { name?: string; mimeType?: string; size?: number; parentId?: string } | null
  const name = body?.name?.trim()
  const size = Number(body?.size)
  if (!name || name.length > MAX_NAME || !Number.isSafeInteger(size) || size < 0) {
    return NextResponse.json({ error: 'Invalid upload metadata.' }, { status: 400 })
  }
  if (project.storage_limit_bytes && size > project.storage_limit_bytes) {
    return NextResponse.json({ error: 'This file exceeds the project storage limit.' }, { status: 413 })
  }

  const accounts = await supabase<Array<{ refresh_token: string }>>(`drive_accounts?id=eq.${project.drive_account_id}&select=refresh_token&limit=1`)
  const account = accounts[0]
  if (!account) return NextResponse.json({ error: 'Storage account unavailable.' }, { status: 500 })
  const parentId = body?.parentId || project.drive_folder_id
  const { access_token } = await accessTokenFromRefreshToken(account.refresh_token)
  const sessionUrl = await initiateResumableUpload(access_token, name, body?.mimeType || 'application/octet-stream', size, parentId)

  const rows = await supabase<Array<{ id: string }>>('uploads', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ project_id: project.id, name, mime_type: body?.mimeType || 'application/octet-stream', size_bytes: size, status: 'uploading' }),
  })
  return NextResponse.json({ uploadId: rows[0]?.id, sessionUrl })
}
