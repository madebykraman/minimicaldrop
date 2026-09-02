import 'server-only'
import crypto from 'node:crypto'

const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const DRIVE_API = 'https://www.googleapis.com/drive/v3'
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3/files'

function required(name: string) {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is not configured`)
  return value
}

export function googleAuthUrl(state: string) {
  const params = new URLSearchParams({
    client_id: required('GOOGLE_CLIENT_ID'),
    redirect_uri: required('GOOGLE_REDIRECT_URI'),
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
    scope: process.env.GOOGLE_DRIVE_SCOPE || 'https://www.googleapis.com/auth/drive',
    state,
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

export async function exchangeGoogleCode(code: string) {
  const body = new URLSearchParams({ code, client_id: required('GOOGLE_CLIENT_ID'), client_secret: required('GOOGLE_CLIENT_SECRET'), redirect_uri: required('GOOGLE_REDIRECT_URI'), grant_type: 'authorization_code' })
  const response = await fetch(TOKEN_URL, { method: 'POST', body })
  if (!response.ok) throw new Error(`Google OAuth ${response.status}: ${await response.text()}`)
  return response.json() as Promise<{ access_token: string; refresh_token?: string; expires_in: number }>
}

export async function accessTokenFromRefreshToken(refreshToken: string) {
  const body = new URLSearchParams({ client_id: required('GOOGLE_CLIENT_ID'), client_secret: required('GOOGLE_CLIENT_SECRET'), refresh_token: refreshToken, grant_type: 'refresh_token' })
  const response = await fetch(TOKEN_URL, { method: 'POST', body })
  if (!response.ok) throw new Error(`Google token refresh ${response.status}: ${await response.text()}`)
  return response.json() as Promise<{ access_token: string; expires_in: number }>
}

async function driveRequest<T>(accessToken: string, path: string, init: RequestInit = {}) {
  const response = await fetch(`${DRIVE_API}${path}`, { ...init, headers: { Authorization: `Bearer ${accessToken}`, ...(init.headers || {}) } })
  if (!response.ok) throw new Error(`Drive ${response.status}: ${await response.text()}`)
  return response.json() as Promise<T>
}

export async function createDriveFolder(accessToken: string, name: string, parentId?: string) {
  return driveRequest<{ id: string; name: string }>(accessToken, '/files', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, mimeType: 'application/vnd.google-apps.folder', ...(parentId ? { parents: [parentId] } : {}) }) })
}

export async function listDriveChildren(accessToken: string, parentId: string) {
  const q = `'${parentId}' in parents and trashed = false`
  const params = new URLSearchParams({ q, fields: 'files(id,name,mimeType,size,modifiedTime)', orderBy: 'folder,name' })
  return driveRequest<{ files: Array<{ id: string; name: string; mimeType: string; size?: string; modifiedTime?: string }> }>(accessToken, `/files?${params}`)
}

export async function getDriveFile(accessToken: string, fileId: string) {
  const params = new URLSearchParams({ fields: 'id,name,size,mimeType,parents,trashed' })
  return driveRequest<{ id: string; name: string; size?: string; mimeType: string; parents?: string[]; trashed?: boolean }>(accessToken, `/files/${encodeURIComponent(fileId)}?${params}`)
}

export async function initiateResumableUpload(accessToken: string, name: string, mimeType: string, size: number, parentId: string) {
  const response = await fetch(`${UPLOAD_API}?uploadType=resumable`, { method: 'POST', headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json; charset=UTF-8', 'X-Upload-Content-Type': mimeType || 'application/octet-stream', 'X-Upload-Content-Length': String(size) }, body: JSON.stringify({ name, parents: [parentId] }) })
  if (!response.ok) throw new Error(`Drive upload init ${response.status}: ${await response.text()}`)
  const location = response.headers.get('Location')
  if (!location) throw new Error('Google did not return a resumable upload session')
  return location
}

export function hashToken(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex')
}
