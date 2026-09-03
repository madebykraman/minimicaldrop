import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const STALE_MS = 24 * 60 * 60 * 1000

async function cleanup() {
  const cutoff = new Date(Date.now() - STALE_MS).toISOString()
  const stale = await supabase<Array<{ id: string; project_id: string; name: string }>>(`uploads?status=in.(initiated,uploading)&last_activity_at=lt.${encodeURIComponent(cutoff)}&select=id,project_id,name`)
  if (!stale.length) return { cleaned: 0 }

  await supabase(`uploads?id=in.(${stale.map(row => encodeURIComponent(row.id)).join(',')})&status=in.(initiated,uploading)`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ status: 'failed', session_url: null, last_activity_at: new Date().toISOString() }),
  })

  await Promise.all(stale.map(row => supabase('audit_events', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ project_id: row.project_id, event_type: 'upload.abandoned', file_name: row.name, metadata: { uploadId: row.id, ageHours: 24 } }),
  }).catch(() => undefined)))

  return { cleaned: stale.length }
}

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return request.headers.get('authorization') === `Bearer ${secret}`
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  return NextResponse.json(await cleanup())
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  return NextResponse.json(await cleanup())
}
