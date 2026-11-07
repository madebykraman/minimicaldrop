import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'

const read = p => readFileSync(p, 'utf8')
const legacyPrimary = /#(?:7650ad|4c2b81|b79be4|c9b6e8|a98bce|7752b0|7858af)|rgba\(183\s*,\s*155\s*,\s*228/i
const sharedCss = [
  'app/globals.css', 'app/brand.css', 'app/drop.css', 'app/delivery.css',
  'app/legal.css','app/finder-ui.css','app/appearance.css',
  'app/admin/admin.css','app/admin/p5-base.css','app/admin-finish.css',
  'app/admin/studio-overview.css','app/admin/admin-delivery.css',
]
test('Old primary purple accents cannot leak back into loaded styles', () => {
  for (const file of sharedCss) assert.ok(!legacyPrimary.test(read(file)), file + ' still contains legacy accent')
})
test('Legacy script-injected client styles also use consistent accents', () => {
  for (const file of ['scripts/v1-polish.cjs','scripts/v1-runtime-polish.cjs','scripts/v1-delete-polish.cjs']) {
    assert.ok(!legacyPrimary.test(read(file)), file + ' still generates purple styles')
  }
})
test('Only the current public homepage stylesheet is loaded', () => {
  const layout = read('app/layout.tsx')
  assert.ok(!layout.includes("import './home.css'"))
  assert.ok(!existsSync('app/home.css'))
  assert.ok(read('app/appearance.css').includes('.mac-home'))
})
test('Remaining legacy build stages preserve resumable upload and deletion', () => {
  const build=JSON.parse(read('package.json')).scripts.build
  assert.ok(build.includes('v1-polish.cjs'))
  assert.ok(build.includes('v1-runtime-polish.cjs'))
  assert.ok(build.includes('v1-delete-polish.cjs'))
})
