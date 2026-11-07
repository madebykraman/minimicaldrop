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
const finalStudioCss = fs.readFileSync('app/admin-finish.css', 'utf8')
const adminOpsGuard = fs.readFileSync('app/admin/ops/layout.tsx', 'utf8')
const globalLayout = fs.readFileSync('app/layout.tsx', 'utf8')
const finderRefinements = fs.readFileSync('app/finder-refinements.css', 'utf8')
const filePackage = JSON.parse(fs.readFileSync('package.json', 'utf8'))
const folderRoute = fs.readFileSync('app/api/projects/[token]/route.ts', 'utf8')
const googleDrive = fs.readFileSync('lib/google-drive.ts', 'utf8')
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
  ['Geist Sans and Mono self-hosted globally', layout.includes("import { GeistSans } from 'geist/font/sans'") && layout.includes("import { GeistMono } from 'geist/font/mono'") && filePackage.dependencies.geist === '1.9.2'],
  ['Finder refinements loaded last', layout.includes("import './finder-refinements.css'")],
  ['Full folder names are not clipped', finderRefinements.includes('white-space: normal !important') && finderRefinements.includes('overflow-wrap: anywhere !important')],
  ['Folder cards fit mobile screens', finderRefinements.includes('grid-template-columns: minmax(0,1fr) !important')],
  ['Folder permission checked before Drive list', folderRoute.includes('if (!permitted) return NextResponse.json') && folderRoute.includes('listDriveChildren(access_token, parentId)')],
  ['Independent folder metadata reads run concurrently', folderRoute.includes('Promise.all([')],
  ['Concurrent Google token refreshes share a request', googleDrive.includes('tokenRefreshInFlight.get(refreshToken)') && googleDrive.includes('tokenRefreshInFlight.set(refreshToken, request)')],
  ['Minimal homepage with real links only', homepage.includes('mac-home-hero') && homepage.includes('mac-home-preview') && !homepage.includes('<button')],
  ['Shared blue visual system', layout.includes("import './appearance.css'") && appearance.includes('--mac-blue:#007aff')],
  ['Admin operations use neutral surfaces', opsPage.includes('className="mac-ops"') && opsPage.includes("background: '#f5f5f7'")],
  ['Client selection and deferred search remain functional', workspace.includes('allVisibleSelected') && workspace.includes('useDeferredValue(search)')],
  ['Folder cache ignores stale network responses', workspace.includes('latestLoadId.current') && workspace.includes('folderCache.current.set') && workspace.includes('currentFolderRef.current')],
  ['Folder prefetch shares requests', workspace.includes('folderRequests.current.get(id)') && workspace.includes('getFolderRequest(parentId)')],
  ['Cached folders are usable before revalidation finishes', workspace.includes('void fetchLatest().catch') && workspace.includes('return true')],
  ['Folder names get accessible labels', workspace.includes('aria-label=') && workspace.includes('Open ${item.name}')],
  ['Essential actions remain visible', workspace.includes('finder-new-folder') && workspace.includes('Upload</span>')],
  ['Secondary controls are in an accessible menu', workspace.includes('finder-workspace-options') && workspace.includes('More file options')],
  ['Navigation contains retry-safe success checks', workspace.includes('if (!await load(item.id)) setTrail(previous)')],
  ['Build transform cannot duplicate navigation state', fs.readFileSync('scripts/v1-runtime-polish.cjs','utf8').includes("if (!source.includes('const [navigating, setNavigating]'))")],
  ['Consistent app icon on client and studio', workspace.includes("from '@/components/drop-icon'") && adminPage.includes("from '@/components/drop-icon'")],
  ['No floating global admin widgets', !globalLayout.includes('<GlobalChrome') && adminPage.includes('finder-admin-inline-tools')],
  ['Studio tool panels are rendered from sidebar', adminPage.includes('<StudioOverview/>') && adminPage.includes('<AdminDelivery/>')],
  ['Operations page server-side restricted', adminOpsGuard.includes('await isAdmin()') && adminOpsGuard.includes("redirect('/admin')")],
  ['Project actions advanced and link regeneration confirmed', adminPage.includes('finder-admin-advanced') && adminPage.includes('Regenerate this client link?')],
  ['Consistent final studio style imported last', globalLayout.includes("import './admin-finish.css'") && finalStudioCss.includes('--studio-blue: #007aff')],
  ['Admin base is external CSS (no inline cascade)', layout.includes("import './admin/p5-base.css'") && !adminPage.includes('function AdminStyles()')],
  ['Sidebar brand copy is not forced into icon box', adminPage.includes('<span className="finder-admin-brand-copy">') && finalStudioCss.includes('.finder-admin-sidebar-brand>.finder-admin-brand-copy')],
  ['One Finder title bar and no duplicated admin heading', adminPage.includes('finder-admin-window-actions') && !adminPage.includes('finder-admin-head-label')],
  ['Balanced admin project panel grid', adminPage.includes('p5-panel-access') && adminPage.includes('p5-panel-drive') && finalStudioCss.includes('grid-template-areas:"access storage"')],
  ['Legacy build patch steps removed safely', !filePackage.scripts.build.includes('v1-admin-polish.cjs') && !filePackage.scripts.build.includes('v1-navigation-patch.cjs')],


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
