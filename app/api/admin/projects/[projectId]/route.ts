import { NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { isAdmin } from '@/lib/admin-auth'
import { hashToken } from '@/lib/google-drive'
import { supabase } from '@/lib/supabase'

function bytes(value: unknown) {
  const n = Number(value)
  return Number.isSafeInteger(n) && n > 0 ? n : null
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
  if (body?.expiresAt !== undefined) {
    const expires = new Date(body.expiresAt)
    if (Number.isNaN(expires.getTime()) || expires.getTime() <= Date.now()) return NextResponse.json({ error: 'A future expiry date is required.' }, { status: 400 })
    patch.expires_at = expires.toISOString()
  }
  if (body?.storageLimitBytes !== undefined) {
    const limit = body.storageLimitBytes == null ? null : bytes(body.storageLimitBytes)
    if (body.storageLimitBytes != null && !limit) return NextResponse.json({ error: 'Invalid storage limit.' }, { status: 400 })
    patch.storage_limit_bytes = limit
  }
  if (body?.disabled !== undefined) patch.disabled_at = body.disabled ? new Date().toISOString() : null

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
