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
  if (!name || name.length > MAX_NAME || !Number.isSafeInteger(size) || size < 0) return NextResponse.json({ error: 'Invalid upload metadata.' }, { status: 400 })

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

  const { access_token } = await accessTokenFromRefreshToken(account.refresh_token)
  const mimeType = body?.mimeType?.trim() || 'application/octet-stream'
  const sessionUrl = await initiateResumableUpload(access_token, name, mimeType, size, parentId)

  try {
    const uploadId = await supabase<string>('rpc/reserve_upload', {
      method: 'POST',
      body: JSON.stringify({
        p_project_id: project.id,
        p_folder_id: folderId,
        p_name: name,
        p_mime_type: mimeType,
        p_size_bytes: size,
        p_session_url: sessionUrl,
      }),
    })

    if (!uploadId) return NextResponse.json({ error: 'Upload session could not be created.' }, { status: 500 })
    return NextResponse.json({ uploadId, sessionUrl })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to reserve upload space.'
    if (message.toLowerCase().includes('storage limit')) return NextResponse.json({ error: 'This upload would exceed the project storage limit.' }, { status: 413 })
    throw error
  }
}
