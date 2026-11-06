import test from 'node:test'
import assert from 'node:assert/strict'
import { supabaseRequestHeaders } from '../lib/supabase-headers.ts'

test('opaque Supabase secret key uses apikey without JWT Authorization', () => {
  const h = supabaseRequestHeaders('sb_secret_example_key')
  assert.equal(h.get('apikey'), 'sb_secret_example_key')
  assert.equal(h.has('Authorization'), false)
  assert.equal(h.get('Content-Type'), 'application/json')
})

test('legacy service-role JWT remains supported via Authorization header', () => {
  const key = 'eyJ.legacy-jwt.signature'
  const h = supabaseRequestHeaders(key)
  assert.equal(h.get('apikey'), key)
  assert.equal(h.get('Authorization'), `Bearer ${key}`)
})

test('caller-supplied Authorization cannot override server key', () => {
  const h = supabaseRequestHeaders('sb_secret_example_key', {
    Authorization: 'Bearer untrusted',
    apikey: 'wrong',
    Prefer: 'return=minimal',
  })
  assert.equal(h.has('Authorization'), false)
  assert.equal(h.get('apikey'), 'sb_secret_example_key')
  assert.equal(h.get('Prefer'), 'return=minimal')
})
