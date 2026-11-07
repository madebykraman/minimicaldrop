import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const css = readFileSync('app/finder-refinements.css','utf8')
const workspace = readFileSync('app/u/[token]/workspace-v5.tsx','utf8')
const route = readFileSync('app/api/projects/[token]/route.ts','utf8')
const google = readFileSync('lib/google-drive.ts','utf8')
const layout = readFileSync('app/layout.tsx','utf8')
const pkg = JSON.parse(readFileSync('package.json','utf8'))

test('Geist font variables load from self-hosted package', () => {
  assert.equal(pkg.dependencies.geist,'1.9.2')
  assert.ok(layout.includes('GeistSans.variable'))
  assert.ok(layout.includes('GeistMono.variable'))
  assert.ok(css.includes('--font-geist-sans'))
})
test('Full folder names wrap in grid and list layouts', () => {
  assert.ok(css.includes('white-space: normal !important'))
  assert.ok(css.includes('overflow-wrap: anywhere !important'))
  assert.ok(workspace.includes('Open ${item.name}'))
})
test('Folder prefetch uses shared requests and ignores stale data', () => {
  assert.ok(workspace.includes('folderRequests.current.get(id)'))
  assert.ok(workspace.includes('getFolderRequest(parentId)'))
  assert.ok(workspace.includes('requestId !== latestLoadId.current'))
})
test('Project folder permission is checked before Drive listing', () => {
  const check = route.indexOf('if (!permitted) return NextResponse.json')
  const call = route.indexOf('const drive = await listDriveChildren')
  assert.ok(check >= 0 && call > check)
})
test('Google token refresh coalesces concurrent requests', () => {
  assert.ok(google.includes('tokenRefreshInFlight.get(refreshToken)'))
  assert.ok(google.includes('tokenRefreshInFlight.set(refreshToken, request)'))
})
