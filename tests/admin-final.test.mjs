import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'

const read = path => readFileSync(path,'utf8')
const layout = read('app/layout.tsx')
const dashboard = read('app/admin/page.tsx')
const login = read('app/api/admin/login/route.ts')
const opsGuard = read('app/admin/ops/layout.tsx')
const overview = read('app/admin/studio-overview.tsx')
const deliveries = read('app/admin/admin-delivery.tsx')
const css = read('app/admin-finish.css')

test('Only configured administrator credentials can create an admin session', () => {
  assert.ok(login.includes('body.email !== process.env.ADMIN_EMAIL'))
  assert.ok(login.includes('validAdminPassword('))
  assert.ok(login.includes('setAdminCookie()'))
  assert.ok(!existsSync('app/api/admin/register/route.ts'))
  assert.ok(!existsSync('app/api/admin/signup/route.ts'))
})
test('Delivery operations requires a signed admin session server side', () => {
  assert.ok(opsGuard.includes('await isAdmin()'))
  assert.ok(opsGuard.includes("redirect('/admin')"))
})
test('Floating global layer is not mounted', () => {
  assert.ok(!layout.includes('GlobalChrome'))
  assert.ok(!layout.includes('<GlobalChrome'))
  assert.ok(layout.includes("import './admin-finish.css'"))
})
test('Sidebar has functional tools without floating triggers', () => {
  assert.ok(dashboard.includes('finder-admin-inline-tools'))
  assert.ok(dashboard.includes('<StudioOverview/>'))
  assert.ok(dashboard.includes('<AdminDelivery/>'))
  assert.ok(css.includes('position:static!important'))
})
test('Mobile modal panels portal outside transformed sidebar', () => {
  assert.ok(overview.includes('createPortal('))
  assert.ok(deliveries.includes('createPortal('))
  assert.ok(overview.includes('document.body)'))
  assert.ok(deliveries.includes('document.body)'))
})
test('High-impact project changes require an extra step', () => {
  assert.ok(dashboard.includes('finder-admin-advanced'))
  assert.ok(dashboard.includes('Regenerate this client link?'))
})
test('Admin typography, hierarchy and responsive CSS use unified blue', () => {
  assert.ok(dashboard.includes('finder-admin-brand-copy'))
  assert.ok(css.includes('.finder-admin-brand-copy'))
  assert.ok(css.includes('--studio-blue: #007aff'))
  assert.ok(css.includes('@media(max-width:600px)'))
})
