const fs = require('node:fs')
const path = require('node:path')

const root = process.cwd()
const workspace = path.join(root, 'app', 'u', '[token]', 'workspace-v5.tsx')
const dropCss = path.join(root, 'app', 'drop.css')

let source = fs.readFileSync(workspace, 'utf8')

const oldDelete = "async function deleteItem(kind: 'file' | 'folder', id: string, name: string) { setBusy(true); try { await jsonFetch(kind === 'file' ? `/api/projects/${token}/files/${encodeURIComponent(id)}` : `/api/projects/${token}/folders/${encodeURIComponent(id)}`, { method: 'DELETE' }); setSelected(prev => prev.filter(x => x !== id)); await load(folderId || undefined) } catch (e) { setError(e instanceof Error ? e.message : 'Unable to delete item') } finally { setBusy(false) } }"
const newDelete = "async function deleteItem(kind: 'file' | 'folder', id: string, name: string) { if (busy) return; const removed = items.find(item => item.id === id); if (!removed) return; setBusy(true); setError(''); setItems(prev => prev.filter(item => item.id !== id)); setSelected(prev => prev.filter(x => x !== id)); setDialog(null); try { const result = await jsonFetch(kind === 'file' ? `/api/projects/${token}/files/${encodeURIComponent(id)}` : `/api/projects/${token}/folders/${encodeURIComponent(id)}`, { method: 'DELETE' }); if (kind === 'file') setUsed(prev => Math.max(0, prev - removed.sizeBytes)); if (kind === 'folder' && typeof result.deletedBytes === 'number') setUsed(prev => Math.max(0, prev - result.deletedBytes)); } catch (e) { setItems(prev => prev.some(item => item.id === id) ? prev : [...prev, removed]); setError(e instanceof Error ? e.message : `Unable to delete ${name}`) } finally { setBusy(false) } }"
if (!source.includes(newDelete)) {
  if (!source.includes(oldDelete)) throw new Error('Expected deleteItem implementation was not found')
  source = source.replace(oldDelete, newDelete)
  fs.writeFileSync(workspace, source)
}

let css = fs.readFileSync(dropCss, 'utf8')
const marker = '/* v1-delete-polish */'
if (!css.includes(marker)) {
  css += `\n\n${marker}\n/* Delete confirmation follows the Drop brand system. */\n.v5-dialog{background:linear-gradient(145deg,rgba(20,16,28,.98),rgba(10,8,14,.98))!important;border:1px solid rgba(183,155,228,.16)!important;box-shadow:0 40px 120px rgba(0,0,0,.58),0 0 70px rgba(76,43,129,.10)!important;color:#f7f5fa!important}\n.v5-dialog h2{color:#f7f5fa!important}\n.v5-dialog p{color:#9992a6!important}\n.v5-dialog input{background:#0a080e!important;border-color:rgba(255,255,255,.11)!important;color:#f7f5fa!important}\n.v5-dialog input:focus{border-color:#7650ad!important;box-shadow:0 0 0 3px rgba(118,80,173,.09)!important}\n.v5-dialog .v5-btn{border-radius:8px!important}\n.v5-dialog .v5-btn.ghost{background:rgba(255,255,255,.035)!important;border-color:rgba(255,255,255,.12)!important;color:#ddd8e2!important}\n.v5-dialog .v5-btn.danger,.v5-dialog button.danger{background:#4c2b81!important;border-color:#7650ad!important;color:#fff!important}\n.v5-dialog .v5-btn.danger:hover,.v5-dialog button.danger:hover{background:#7650ad!important;box-shadow:0 12px 34px rgba(76,43,129,.25)!important}\n.v5-dialog .v5-btn:disabled,.v5-dialog button:disabled{opacity:.58!important;background:#4c2b81!important;color:#d9cde7!important;border-color:#7650ad!important}\n.v5-dialog-close{color:#81798b!important}\n.v5-dialog-close:hover{color:#f7f5fa!important;background:rgba(255,255,255,.04)!important}\n.v5-dialog .v5-delete-icon{color:#b79be4!important}\n.v5-item,.v5-row{transition:opacity .3s ease,transform .3s cubic-bezier(.22,1,.36,1),max-height .3s ease,margin .3s ease,padding .3s ease,border-color .3s ease!important}\n.v5-delete-status{position:absolute;top:9px;right:12px;z-index:8;display:flex;align-items:center;gap:7px;padding:7px 10px;border:1px solid rgba(118,80,173,.28);background:rgba(13,10,18,.9);backdrop-filter:blur(12px);border-radius:999px;color:#bfaed0;font-size:10px;animation:v5-delete-status-in .22s cubic-bezier(.22,1,.36,1) both}\n@keyframes v5-delete-status-in{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}\n@media(prefers-reduced-motion:reduce){.v5-delete-status,.v5-item,.v5-row{animation:none!important;transition:none!important}}\n`
  fs.writeFileSync(dropCss, css)
}
