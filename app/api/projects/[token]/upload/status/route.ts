import { NextResponse } from 'next/server'
import { accessTokenFromRefreshToken, queryResumableUpload } from '@/lib/google-drive'
import { getProjectByToken } from '@/lib/project-access'
import { supabase } from '@/lib/supabase'

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const project = await getProjectByToken(token)
  if (!project) return NextResponse.json({ error: 'Upload space is unavailable or expired.' }, { status: 404 })

  const uploadId = new URL(request.url).searchParams.get('uploadId')
  if (!uploadId) return NextResponse.json({ error: 'Upload ID is required.' }, { status: 400 })

  const uploads = await supabase<Array<{ id: string; drive_file_id: string | null; size_bytes: number; status: string }>>(`uploads?id=eq.${encodeURIComponent(uploadId)}&project_id=eq.${project.id}&select=id,drive_file_id,size_bytes,status&limit=1`)
  const upload = uploads[0]
  if (!upload) return NextResponse.json({ error: 'Upload session not found.' }, { status: 404 })
  if (upload.status === 'complete') return NextResponse.json({ complete: true, uploadedBytes: upload.size_bytes })
  if (!upload.drive_file_id) return NextResponse.json({ error: 'Upload session is missing.' }, { status: 409 })

  const accounts = await supabase<Array<{ refresh_token: string }>>(`drive_accounts?id=eq.${project.drive_account_id}&select=refresh_token&limit=1`)
  const account = accounts[0]
  if (!account) return NextResponse.json({ error: 'Storage account unavailable.' }, { status: 500 })
  const access = await accessTokenFromRefreshToken(account.refresh_token)
  const result = await queryResumableUpload(access.access_token, upload.drive_file_id, upload.size_bytes)

  if (result.status >= 200 && result.status < 300 && result.data?.id) {
    return NextResponse.json({ complete: true, uploadedBytes: upload.size_bytes, driveFileId: result.data.id })
  }
  if (result.status === 308) {
    const match = result.range?.match(/bytes=0-(\d+)/)
    const uploadedBytes = match ? Number(match[1]) + 1 : 0
    return NextResponse.json({ complete: false, uploadedBytes })
  }
  if (result.status === 404) return NextResponse.json({ error: 'Google upload session expired.' }, { status: 410 })
  return NextResponse.json({ error: `Unable to determine upload status (${result.status}).` }, { status: 502 })
}
