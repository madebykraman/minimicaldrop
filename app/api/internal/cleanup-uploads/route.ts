import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) return NextResponse.json({ error: 'Cleanup is not configured.' }, { status: 503 })

  const authorization = request.headers.get('authorization') || ''
  if (authorization !== `Bearer ${secret}`) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const stale = await supabase<Array<{ id: string }>>(`uploads?status=in.(initiated,uploading)&created_at=lt.${encodeURIComponent(cutoff)}&select=id`)
  if (!stale.length) return NextResponse.json({ cleaned: 0 })

  await supabase(`uploads?id=in.(${stale.map(row => encodeURIComponent(row.id)).join(',')})&status=in.(initiated,uploading)`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ status: 'failed' }),
  })
  return NextResponse.json({ cleaned: stale.length })
}
