// Sanity-check the legacy production build transforms before running Next.js.
// They currently rewrite JSX/CSS at build time, so a silent string-match
// miss can remove user-visible features even though TypeScript still passes.
const fs = require('node:fs')

const workspace = fs.readFileSync('app/u/[token]/workspace-v5.tsx', 'utf8')
const css = fs.readFileSync('app/drop.css', 'utf8')
const admin = fs.readFileSync('app/admin/admin.css', 'utf8')

const checks = [
  ['8 MB resumable chunks', workspace.includes('const CHUNK = 8 * 1024 * 1024')],
  ['upload recovery actions', workspace.includes('v5-recovery-resume')],
  ['navigation state feedback', workspace.includes('v5-nav-status')],
  ['optimistic deletion fallback', workspace.includes('startViewTransition')],
  ['responsive design audit styles', workspace.includes('/* audit-responsive: 2026-11 */')],
  ['delete interaction styles', css.includes('/* v1-delete-polish */')],
  ['admin login styles', admin.includes('/* v1.1 admin login surface */')],
]

const failed = checks.filter(([, passed]) => !passed)
if (failed.length) {
  for (const [label] of failed) console.error(`Build contract failed: ${label}`)
  process.exitCode = 1
} else {
  console.log(`Build contracts verified: ${checks.length} checks`)
}
