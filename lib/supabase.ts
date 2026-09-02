import 'server-only'

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

export function requireSupabase() {
  if (!url || !key) throw new Error('Supabase is not configured')
  return { url: url.replace(/\/$/, ''), key }
}

export async function supabase<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { url, key } = requireSupabase()
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
    cache: 'no-store',
  })
  if (!response.ok) throw new Error(`Supabase ${response.status}: ${await response.text()}`)
  const text = await response.text()
  return (text ? JSON.parse(text) : null) as T
}
