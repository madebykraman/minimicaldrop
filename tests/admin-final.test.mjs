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

test('Admin structural styling is in CSS cascade, not in page JSX', () => {
  assert.ok(layout.includes("import './admin/p5-base.css'"))
  assert.ok(!dashboard.includes('function AdminStyles()'))
  assert.ok(!dashboard.includes('<AdminStyles/>'))
  assert.ok(existsSync('app/admin/p5-base.css'))
})
test('Sidebar brand no longer inherits fixed-size icon-only div styling', () => {
  assert.ok(dashboard.includes('<span className="finder-admin-brand-copy">'))
  assert.ok(dashboard.includes('<small>Studio workspace</small>'))
  assert.ok(css.includes('.finder-admin-sidebar-brand>.finder-admin-brand-copy'))
})
test('Studio has one title bar and a balanced project details grid', () => {
  assert.ok(dashboard.includes('finder-admin-window-actions'))
  assert.ok(!dashboard.includes('finder-admin-head-label'))
  assert.ok(dashboard.includes('p5-panel-access'))
  assert.ok(dashboard.includes('p5-panel-storage'))
  assert.ok(dashboard.includes('p5-panel-drive'))
  assert.ok(css.includes('grid-template-areas:"access storage"'))
})
test('Obsolete build patches and unused UI modules are removed', () => {
  const pkg = JSON.parse(read('package.json'))
  assert.ok(!pkg.scripts.build.includes('v1-admin-polish.cjs'))
  assert.ok(!pkg.scripts.build.includes('v1-navigation-patch.cjs'))
  assert.ok(!existsSync('scripts/v1-admin-polish.cjs'))
  assert.ok(!existsSync('scripts/v1-navigation-patch.cjs'))
  assert.ok(!existsSync('components/global-chrome.tsx'))
  assert.ok(!existsSync('app/u/[token]/workspace.tsx'))
})
test('Core upload and deletion build patches stay enabled until migrated', () => {
  const build=JSON.parse(read('package.json')).scripts.build
  assert.ok(build.includes('v1-polish.cjs'))
  assert.ok(build.includes('v1-runtime-polish.cjs'))
  assert.ok(build.includes('v1-delete-polish.cjs'))
})
