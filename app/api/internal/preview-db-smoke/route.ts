import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Temporary, read-only smoke test for preview deployments. Never returns data.
export async function GET() {
  if (process.env.VERCEL_ENV !== 'preview') return new Response(null, { status: 404 })
  const headers = { 'Cache-Control': 'private, no-store, max-age=0' }
  try {
    await supabase<Array<{ id: string }>>('projects?select=id&limit=1')
    return NextResponse.json({ database: 'reachable' }, { headers })
  } catch {
    return NextResponse.json({ database: 'unavailable' }, { status: 503, headers })
  }
}
