import { NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { isAdmin } from '@/lib/admin-auth'
import { hashToken } from '@/lib/google-drive'
import { supabase } from '@/lib/supabase'

function bytes(value: unknown) {
  const n = Number(value)
  return Number.isSafeInteger(n) && n > 0 ? n : null
}

export async function GET(_request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  const { projectId } = await params
  if (!projectId) return NextResponse.json({ error: 'Project ID is required.' }, { status: 400 })

  const projects = await supabase<Array<{
    id: string
    name: string
    client_name: string
    client_email: string | null
    drive_account_id: string
    drive_folder_id: string
    storage_limit_bytes: number | null
    expires_at: string
    disabled_at: string | null
    created_at: string
  }>>(`projects?id=eq.${encodeURIComponent(projectId)}&select=id,name,client_name,client_email,drive_account_id,drive_folder_id,storage_limit_bytes,expires_at,disabled_at,created_at&limit=1`)
  const project = projects[0]
  if (!project) return NextResponse.json({ error: 'Project not found.' }, { status: 404 })

  const [accounts, completeRows, pendingRows, activity] = await Promise.all([
    supabase<Array<{ id: string; label: string; google_email: string; root_folder_id: string | null }>>(`drive_accounts?id=eq.${encodeURIComponent(project.drive_account_id)}&select=id,label,google_email,root_folder_id&limit=1`),
    supabase<Array<{ size_bytes: number }>>(`uploads?project_id=eq.${project.id}&status=eq.complete&select=size_bytes`),
    supabase<Array<{ size_bytes: number }>>(`uploads?project_id=eq.${project.id}&status=eq.uploading&select=size_bytes`),
    supabase<Array<{ id: string; event_type: string; file_name: string | null; metadata: unknown; created_at: string }>>(`audit_events?project_id=eq.${project.id}&select=id,event_type,file_name,metadata,created_at&order=created_at.desc&limit=100`),
  ])

  const usedBytes = completeRows.reduce((sum, row) => sum + Number(row.size_bytes || 0), 0)
  const pendingBytes = pendingRows.reduce((sum, row) => sum + Number(row.size_bytes || 0), 0)

  return NextResponse.json({
    project,
    account: accounts[0] || null,
    storage: {
      usedBytes,
      pendingBytes,
      limitBytes: project.storage_limit_bytes,
      availableBytes: project.storage_limit_bytes == null ? null : Math.max(0, Number(project.storage_limit_bytes) - usedBytes - pendingBytes),
    },
    clientAccess: {
      path: '/u/••••••••••••••••',
      tokenStoredAsHash: true,
      active: !project.disabled_at && new Date(project.expires_at).getTime() > Date.now(),
    },
    activity,
  })
}

export async function PATCH(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  const { projectId } = await params
  if (!projectId) return NextResponse.json({ error: 'Project ID is required.' }, { status: 400 })

  const existing = await supabase<Array<{ id: string; name: string; client_name: string; client_email: string | null; storage_limit_bytes: number | null; expires_at: string; disabled_at: string | null }>>(`projects?id=eq.${encodeURIComponent(projectId)}&select=id,name,client_name,client_email,storage_limit_bytes,expires_at,disabled_at&limit=1`)
  const project = existing[0]
  if (!project) return NextResponse.json({ error: 'Project not found.' }, { status: 404 })

  const body = await request.json().catch(() => null) as {
    name?: string
    clientName?: string
    clientEmail?: string | null
    expiresAt?: string
    storageLimitBytes?: number | null
    disabled?: boolean
    regenerateToken?: boolean
  } | null

  const patch: Record<string, unknown> = {}
  if (body?.name !== undefined) {
    const name = body.name.trim()
    if (!name || name.length > 160) return NextResponse.json({ error: 'Invalid project name.' }, { status: 400 })
    patch.name = name
  }
  if (body?.clientName !== undefined) {
    const clientName = body.clientName.trim()
    if (!clientName || clientName.length > 160) return NextResponse.json({ error: 'Invalid client name.' }, { status: 400 })
    patch.client_name = clientName
  }
  if (body?.clientEmail !== undefined) patch.client_email = body.clientEmail?.trim() || null

  let nextExpiresAt = project.expires_at
  if (body?.expiresAt !== undefined) {
    const expires = new Date(body.expiresAt)
    if (Number.isNaN(expires.getTime()) || expires.getTime() <= Date.now()) return NextResponse.json({ error: 'A future expiry date is required.' }, { status: 400 })
    nextExpiresAt = expires.toISOString()
    patch.expires_at = nextExpiresAt
  }

  if (body?.storageLimitBytes !== undefined) {
    const limit = body.storageLimitBytes == null ? null : bytes(body.storageLimitBytes)
    if (body.storageLimitBytes != null && !limit) return NextResponse.json({ error: 'Invalid storage limit.' }, { status: 400 })
    if (limit) {
      const rows = await supabase<Array<{ size_bytes: number }>>(`uploads?project_id=eq.${project.id}&status=eq.complete&select=size_bytes`)
      const used = rows.reduce((sum, row) => sum + Number(row.size_bytes || 0), 0)
      if (limit < used) return NextResponse.json({ error: 'Storage limit cannot be lower than current usage.' }, { status: 409 })
    }
    patch.storage_limit_bytes = limit
  }

  if (body?.disabled !== undefined) {
    if (!body.disabled && new Date(nextExpiresAt).getTime() <= Date.now()) return NextResponse.json({ error: 'Extend the project expiry before enabling this project.' }, { status: 409 })
    patch.disabled_at = body.disabled ? new Date().toISOString() : null
  }

  let token: string | null = null
  if (body?.regenerateToken) {
    token = crypto.randomBytes(32).toString('base64url')
    patch.access_token_hash = hashToken(token)
  }

  if (Object.keys(patch).length) {
    await supabase(`projects?id=eq.${encodeURIComponent(projectId)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(patch) })
  }

  if (body?.regenerateToken) {
    await supabase('audit_events', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ project_id: projectId, event_type: 'project.token_regenerated' }) })
  }
  if (body?.disabled !== undefined) {
    await supabase('audit_events', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ project_id: projectId, event_type: body.disabled ? 'project.disabled' : 'project.enabled' }) })
  }
  if (body?.expiresAt !== undefined || body?.storageLimitBytes !== undefined || body?.name !== undefined || body?.clientName !== undefined || body?.clientEmail !== undefined) {
    await supabase('audit_events', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ project_id: projectId, event_type: 'project.updated', metadata: { fields: Object.keys(patch).filter(field => field !== 'access_token_hash' && field !== 'disabled_at') } }) })
  }

  return NextResponse.json({ ok: true, token, url: token ? `${process.env.NEXT_PUBLIC_APP_URL || ''}/u/${token}` : null })
}
