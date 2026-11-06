import { NextResponse } from 'next/server'
import { isAdmin } from '@/lib/admin-auth'

export async function GET() {
  const authorized = await isAdmin()
  return NextResponse.json(
    { authenticated: authorized },
    { status: authorized ? 200 : 401, headers: { 'Cache-Control': 'private, no-store, max-age=0' } }
  )
}
