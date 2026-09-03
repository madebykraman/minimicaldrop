import { NextResponse } from 'next/server'
import { accessTokenFromRefreshToken, createDriveFolder } from '@/lib/google-drive'
import { getProjectByToken } from '@/lib/project-access'
import { rateLimit } from '@/lib/rate-limit'
import { supabase } from '@/lib/supabase'

function validFolderName(value: string) {
  return value.length > 0 && value.length <= 120 && !/[\u0000-\u001f\u007f]/.test(value)
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const limited = rateLimit(request, 'folder-create', 30, token)
  if (limited) return limited
  const project = await getProjectByToken(token)
  if (!project) return NextResponse.json({ error: 'Upload space is unavailable or expired.' }, { status: 404 })
  const body = await request.json().catch(() => null) as { name?: string; parentId?: string } | null
  const name = body?.name?.trim() || ''
  if (!validFolderName(name)) return NextResponse.json({ error: 'Folder name is required.' }, { status: 400 })

  const parent = body?.parentId || project.drive_folder_id
  if (!/^[A-Za-z0-9_-]+$/.test(parent)) return NextResponse.json({ error: 'Invalid parent folder.' }, { status: 400 })
  let parentId: string | null = null
  if (parent !== project.drive_folder_id) {
    const parents = await supabase<Array<{ id: string }>>(`folders?project_id=eq.${project.id}&drive_folder_id=eq.${encodeURIComponent(parent)}&select=id&limit=1`)
    if (!parents[0]) return NextResponse.json({ error: 'Folder is not part of this project.' }, { status: 403 })
    parentId = parents[0].id
  }

  const accounts = await supabase<Array<{ refresh_token: string }>>(`drive_accounts?id=eq.${project.drive_account_id}&select=refresh_token&limit=1`)
  const account = accounts[0]
  if (!account) return NextResponse.json({ error: 'Storage account unavailable.' }, { status: 500 })
  const folder = await createDriveFolder((await accessTokenFromRefreshToken(account.refresh_token)).access_token, name, parent)
  await supabase('folders', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ project_id: project.id, name, drive_folder_id: folder.id, parent_id: parentId }) })
  await supabase('audit_events', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ project_id: project.id, event_type: 'folder.created', metadata: { name, parentId: parent } }) })
  return NextResponse.json({ id: folder.id, name: folder.name })
}
