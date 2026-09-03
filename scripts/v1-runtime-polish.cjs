const fs = require('node:fs')
const path = require('node:path')

const root = process.cwd()
const workspace = path.join(root, 'app', 'u', '[token]', 'workspace-v5.tsx')
const dropCss = path.join(root, 'app', 'drop.css')
const adminPage = path.join(root, 'app', 'admin', 'page.tsx')
const adminCss = path.join(root, 'app', 'admin', 'admin.css')

let source = fs.readFileSync(workspace, 'utf8')

const stateLine = "const [used, setUsed] = useState(0); const [pending, setPending] = useState(0); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [recoveries, setRecoveries] = useState<Recovery[]>([]); const [queue, setQueue] = useState<QueueItem[]>([])"
const stateLineNext = stateLine + "; const [navigating, setNavigating] = useState(false)"
source = source.replace(stateLine, stateLineNext)

const oldOpen = "async function openFolder(item: Item) { await load(item.id); setTrail(prev => [...prev, { id: item.id, name: item.name }]); setSelected([]) }"
const newOpen = "async function openFolder(item: Item) { setNavigating(true); setTrail(prev => [...prev, { id: item.id, name: item.name }]); setSelected([]); try { await load(item.id) } finally { setNavigating(false) } }"
source = source.replace(oldOpen, newOpen)

const oldTrail = "async function goTrail(index: number) { const target = trail[index]; if (!target) return; await load(target.id === rootId ? undefined : target.id); setTrail(prev => prev.slice(0, index + 1)); setSelected([]) }"
const newTrail = "async function goTrail(index: number) { const target = trail[index]; if (!target) return; setNavigating(true); setTrail(prev => prev.slice(0, index + 1)); setSelected([]); try { await load(target.id === rootId ? undefined : target.id) } finally { setNavigating(false) } }"
source = source.replace(oldTrail, newTrail)

const oldCreate = "async function createFolder() { const name = folderName.trim(); if (!name) return; setBusy(true); try { await jsonFetch(`/api/projects/${token}/folders`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, parentId: folderId || undefined }) }); setFolderName(''); setShowFolder(false); await load(folderId || undefined) } catch (e) { setError(e instanceof Error ? e.message : 'Unable to create folder') } finally { setBusy(false) } }"
const newCreate = "async function createFolder() { const name = folderName.trim(); if (!name || busy) return; const tempId = `creating-${crypto.randomUUID()}`; const optimistic: Item = { id: tempId, name, mimeType: FOLDER_MIME, sizeBytes: 0, modifiedTime: new Date().toISOString() }; setItems(prev => [...prev, optimistic]); setFolderName(''); setShowFolder(false); setBusy(true); setError(''); try { const data = await jsonFetch(`/api/projects/${token}/folders`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, parentId: folderId || undefined }) }); setItems(prev => prev.map(item => item.id === tempId ? { ...optimistic, id: data.id, name: data.name || name } : item)); } catch (e) { setItems(prev => prev.filter(item => item.id !== tempId)); setError(e instanceof Error ? e.message : 'Unable to create folder') } finally { setBusy(false) } }"
source = source.replace(oldCreate, newCreate)

const workspaceMarker = '<section className="v5-workspace">'
const workspaceInsert = '<section className="v5-workspace">{navigating && <div className="v5-nav-status" role="status"><Loader2 size={15} className="v5-spin"/><span>Opening folder</span></div>}'
source = source.replace(workspaceMarker, workspaceInsert)

fs.writeFileSync(workspace, source)

let css = fs.readFileSync(dropCss, 'utf8')
const marker = '/* v1.1 smooth interaction layer */'
if (!css.includes(marker)) {
  css += `

${marker}
.v5-workspace{position:relative}
.v5-nav-status{position:absolute;top:9px;left:50%;transform:translateX(-50%);z-index:8;display:flex;align-items:center;gap:8px;padding:7px 11px;border:1px solid rgba(118,80,173,.32);background:rgba(13,10,18,.88);backdrop-filter:blur(12px);border-radius:999px;color:#c9bdd7;font-size:10px;box-shadow:0 12px 40px rgba(0,0,0,.28);animation:v5-status-in .24s cubic-bezier(.22,1,.36,1) both}
.v5-nav-status .v5-spin{color:#9b73c4}
.v5-workspace:after{content:"";position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle at 12% 8%,rgba(76,43,129,.10),transparent 28%),radial-gradient(circle at 86% 92%,rgba(118,80,173,.07),transparent 30%);opacity:.7;z-index:0}
.v5-workspace>*{position:relative;z-index:1}
.v5-header,.v5-hero,.v5-workspace,.v5-storage,.v5-recovery,.v5-transfers{animation:v5-surface-in .45s cubic-bezier(.22,1,.36,1) both}
@keyframes v5-status-in{from{opacity:0;transform:translateX(-50%) translateY(-4px) scale(.97)}to{opacity:1;transform:translateX(-50%) translateY(0) scale(1)}}
@keyframes v5-surface-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.v5-btn,.v5-crumbs button,.v5-row,.v5-item-actions button,.v5-dialog button,.v5-dialog-close{transition:transform .24s cubic-bezier(.22,1,.36,1),opacity .24s ease,background-color .24s ease,border-color .24s ease,color .24s ease,box-shadow .24s ease}
.v5-btn:hover,.v5-row:hover{transform:translateY(-1px)}
.v5-btn:active,.v5-crumbs button:active,.v5-row:active{transform:translateY(0) scale(.99)}
.v5-item,.v5-row{will-change:transform}
.v5-item{animation:v5-item-in .32s cubic-bezier(.22,1,.36,1) both}
@keyframes v5-item-in{from{opacity:0;transform:translateY(7px)}to{opacity:1;transform:none}}
.v5-row:nth-child(2){animation-delay:.02s}.v5-row:nth-child(3){animation-delay:.04s}.v5-row:nth-child(4){animation-delay:.06s}.v5-row:nth-child(5){animation-delay:.08s}.v5-row:nth-child(6){animation-delay:.1s}
@media(max-width:760px){.v5-nav-status{top:7px}.v5-workspace:after{opacity:.45}}
@media(prefers-reduced-motion:reduce){.v5-nav-status,.v5-header,.v5-hero,.v5-workspace,.v5-storage,.v5-recovery,.v5-transfers,.v5-item{animation:none!important}.v5-btn,.v5-crumbs button,.v5-row{transition:none!important}}
`
  fs.writeFileSync(dropCss, css)
}

let admin = fs.readFileSync(adminPage, 'utf8')
const adminMarker = '/* v1.1 admin login polish */'
const adminCssBlock = `
${adminMarker}
.p5-login{position:relative;min-height:100svh;display:grid;grid-template-columns:minmax(0,1fr) minmax(360px,440px);align-items:center;gap:clamp(60px,10vw,150px);padding:clamp(28px,6vw,80px) clamp(28px,7vw,110px);overflow:hidden;background:#08070c}
.p5-login:before{content:"";position:absolute;inset:-20%;pointer-events:none;background:radial-gradient(circle at 72% 35%,rgba(76,43,129,.18),transparent 24%),radial-gradient(circle at 88% 80%,rgba(118,80,173,.11),transparent 28%);animation:p5-login-drift 12s ease-in-out infinite alternate}
.p5-login>*{position:relative;z-index:1}
.p5-login .p5-brand{position:absolute;top:30px;left:clamp(28px,7vw,110px)}
.p5-login-copy{max-width:650px;justify-self:end}
.p5-login-copy h1{font-size:clamp(58px,7vw,104px);letter-spacing:-.075em;line-height:.86;margin:14px 0 18px}
.p5-login-copy p{max-width:480px;line-height:1.7}
.p5-login-form{width:100%;box-sizing:border-box;padding:30px;border:1px solid rgba(255,255,255,.09);background:linear-gradient(145deg,rgba(22,17,29,.92),rgba(10,8,14,.92));box-shadow:0 35px 100px rgba(0,0,0,.38);backdrop-filter:blur(16px);animation:p5-form-in .5s cubic-bezier(.22,1,.36,1) both}
.p5-login-form input{transition:border-color .22s ease,box-shadow .22s ease,background-color .22s ease}
.p5-login-form input:focus{box-shadow:0 0 0 3px rgba(118,80,173,.09)}
.p5-login-form button{transition:transform .22s cubic-bezier(.22,1,.36,1),box-shadow .22s ease}
.p5-login-form button:hover{transform:translateY(-1px);box-shadow:0 14px 36px rgba(76,43,129,.2)}
.p5-login-form button:active{transform:scale(.99)}
@keyframes p5-login-drift{from{transform:translate3d(-2%,0,0) scale(1)}to{transform:translate3d(2%,1%,0) scale(1.04)}}
@keyframes p5-form-in{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
@media(max-width:850px){.p5-login{display:block;padding:100px 20px 40px}.p5-login .p5-brand{left:20px}.p5-login-copy{max-width:none}.p5-login-form{margin-top:38px}}
@media(prefers-reduced-motion:reduce){.p5-login:before,.p5-login-form{animation:none!important}.p5-login-form button{transition:none!important}}
`
if (!admin.includes(adminMarker)) {
  admin = admin.replace('</main>', '</main>')
  fs.writeFileSync(adminPage, admin)
}
let acss = fs.readFileSync(adminCss, 'utf8')
if (!acss.includes(adminMarker)) fs.writeFileSync(adminCss, acss + '\n' + adminCssBlock)
