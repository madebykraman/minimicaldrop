// Sanity-check the legacy production build transforms before running Next.js.
// They currently rewrite JSX/CSS at build time, so a silent string-match
// miss can remove user-visible features even though TypeScript still passes.
const fs = require('node:fs')

const workspace = fs.readFileSync('app/u/[token]/workspace-v5.tsx', 'utf8')
const css = fs.readFileSync('app/drop.css', 'utf8')
const admin = fs.readFileSync('app/admin/admin.css', 'utf8')
const finderCss = fs.readFileSync('app/finder-ui.css', 'utf8')
const adminPage = fs.readFileSync('app/admin/page.tsx', 'utf8')
const layout = fs.readFileSync('app/layout.tsx', 'utf8')
const appearance = fs.readFileSync('app/appearance.css', 'utf8')
const homepage = fs.readFileSync('app/page.tsx', 'utf8')
const opsPage = fs.readFileSync('app/admin/ops/page.tsx', 'utf8')
const projectRoute = fs.readFileSync('app/api/admin/projects/route.ts', 'utf8')
const projectRead = projectRoute.split('export async function GET()')[1]?.split('export async function POST(')[0] || ''

const checks = [
  ['8 MB resumable chunks', workspace.includes('const CHUNK = 8 * 1024 * 1024')],
  ['upload recovery actions', workspace.includes('v5-recovery-resume')],
  ['navigation state feedback', workspace.includes('v5-nav-status')],
  ['optimistic deletion fallback', workspace.includes('startViewTransition')],
  ['responsive design audit styles', workspace.includes('/* audit-responsive: 2026-11 */')],
  ['delete interaction styles', css.includes('/* v1-delete-polish */')],
  ['admin login styles', admin.includes('/* v1.1 admin login surface */')],
  ['Finder app shell and functional view toggle', workspace.includes('finder-app-shell') && workspace.includes("changeView('grid')") && workspace.includes("changeView('list')")],
  ['Finder card component and actionable controls', workspace.includes('function FinderCard(') && workspace.includes('finder-card-actions')],
  ['Finder navigation and transfer queue', workspace.includes('finder-sidebar') && workspace.includes('finder-transfers')],
  ['Studio project card and list controls', adminPage.includes('finder-project-card') && adminPage.includes('changeProjectView')],
  ['Responsive Finder breakpoints and accessible focus', finderCss.includes('@media(max-width:700px)') && finderCss.includes(':focus-visible')],
  ['Finder styles imported for all surfaces', layout.includes("import './finder-ui.css'")],
  ['System font stack without external font downloads', !layout.includes('next/font/google') && appearance.includes('SF Pro Text')],
  ['Minimal homepage with real links only', homepage.includes('mac-home-hero') && homepage.includes('mac-home-preview') && !homepage.includes('<button')],
  ['Shared blue visual system', layout.includes("import './appearance.css'") && appearance.includes('--mac-blue:#007aff')],
  ['Admin operations use neutral surfaces', opsPage.includes('className="mac-ops"') && opsPage.includes("background: '#f5f5f7'")],
  ['Client selection and deferred search remain functional', workspace.includes('allVisibleSelected') && workspace.includes('useDeferredValue(search)')],
  ['Folder cache ignores stale network responses', workspace.includes('latestLoadId.current') && workspace.includes('folderCache.current.set') && workspace.includes('currentFolderRef.current')],
  ['Essential actions remain visible', workspace.includes('finder-new-folder') && workspace.includes('Upload</span>')],
  ['Secondary controls are in an accessible menu', workspace.includes('finder-workspace-options') && workspace.includes('More file options')],
  ['Navigation contains retry-safe success checks', workspace.includes('if (!await load(item.id)) setTrail(previous)')],
  ['Build transform cannot duplicate navigation state', fs.readFileSync('scripts/v1-runtime-polish.cjs','utf8').includes("if (!source.includes('const [navigating, setNavigating]'))")],
  ['Consistent app icon on client and studio', workspace.includes("from '@/components/drop-icon'") && adminPage.includes("from '@/components/drop-icon'")],
  ['Project listing reads independent tables concurrently', projectRead.includes('Promise.all')],
  ['Minimal client shell and on-demand details', workspace.includes('finder-project-details') && workspace.includes('finder-stage-app-icon') && workspace.includes('finder-workspace-options')],
  ['Card actions stay available in a menu', workspace.includes('finder-card-more') && workspace.includes('finder-card-actions')],
  ['Delivery updates are collapsible', fs.readFileSync('app/u/[token]/delivery-panel.tsx','utf8').includes('drop-delivery-more')],
  ['Client and admin skeletons are present', workspace.includes('finder-loading-window') && adminPage.includes('finder-admin-loading')],
  ['Dashboard distinguishes unavailable data from an empty list', adminPage.includes('projectsLoaded') && adminPage.includes('finder-admin-data-unavailable')],
  ['Project listing is read-only and never fetches refresh tokens', projectRead.length > 0 && !/method:\s*['"](?:PATCH|DELETE|POST)/.test(projectRead) && !projectRead.includes('refresh_token')],
]

const failed = checks.filter(([, passed]) => !passed)
if (failed.length) {
  for (const [label] of failed) console.error(`Build contract failed: ${label}`)
  process.exitCode = 1
} else {
  console.log(`Build contracts verified: ${checks.length} checks`)
}
