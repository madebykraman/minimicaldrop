/** Headers for Supabase REST service-to-service calls.
 * Opaque sb_* API keys are not JWTs; do not send them as Bearer tokens.
 * Legacy service_role JWTs still require Authorization for compatibility.
 */
export function supabaseRequestHeaders(key: string, init?: HeadersInit): Headers {
  const headers = new Headers(init)
  headers.set('apikey', key)
  if (key.startsWith('sb_secret_') || key.startsWith('sb_publishable_')) {
    headers.delete('Authorization')
  } else {
    headers.set('Authorization', `Bearer ${key}`)
  }
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  return headers
}
