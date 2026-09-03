const fs = require('node:fs')
const path = require('node:path')

const root = process.cwd()
const workspace = path.join(root, 'app', 'u', '[token]', 'workspace-v5.tsx')
const dropCss = path.join(root, 'app', 'drop.css')

let source = fs.readFileSync(workspace, 'utf8')
source = source.replace('const CHUNK = 1024 * 1024', 'const CHUNK = 8 * 1024 * 1024')

const oldRecovery = '{recoveries.length > 0 && <div className="v5-recovery"><RefreshCw size={15}/><div><strong>Uploads ready to resume</strong><span>{recoveries.length} interrupted upload{recoveries.length === 1 ? \'\' : \'s\'} can continue when you select the same file again.</span></div></div>}'
const newRecovery = `{recoveries.length > 0 && <section className="v5-recovery" aria-label="Uploads ready to resume"><div className="v5-recovery-head"><RefreshCw size={16}/><div><strong>{recoveries.length === 1 ? 'Upload ready to resume' : 'Uploads ready to resume'}</strong><span>Select the same file to continue from where it stopped. Nothing already uploaded will be sent again.</span></div></div>{recoveries.map(recovery => { const percent = Math.min(100, Math.round(recovery.uploadedBytes / Math.max(1, recovery.sizeBytes) * 100)); return <div className="v5-recovery-item" key={recovery.uploadId}><div className="v5-recovery-file"><File size={15}/><div><strong>{recovery.name}</strong><span>{percent}% uploaded · {formatBytes(recovery.uploadedBytes)} of {formatBytes(recovery.sizeBytes)}</span></div></div><div className="v5-recovery-progress"><i style={{ width: percent + '%' }}/></div><button className="v5-recovery-resume" onClick={() => input.current?.click()}><Upload size={14}/> Choose file to resume</button></div>})}</section>}`
if (source.includes(oldRecovery) && !source.includes('/* v1-recovery-ux */')) {
  source = source.replace(oldRecovery, newRecovery)
  const styleBlock = `
/* v1-recovery-ux */
.v5-recovery{padding:0;overflow:hidden;animation:v5-recovery-in .34s cubic-bezier(.22,1,.36,1) both}
.v5-recovery-head{display:flex;gap:12px;align-items:flex-start;padding:16px;border-bottom:1px solid rgba(255,255,255,.07);color:#7650ad}
.v5-recovery-head>div{min-width:0}
.v5-recovery-head strong,.v5-recovery-head span{display:block}
.v5-recovery-head strong{font-size:12px;color:#f7f5fa}
.v5-recovery-head span{font-size:11px;line-height:1.5;color:#9992a6;margin-top:4px}
.v5-recovery-item{padding:14px 16px 16px;border-bottom:1px solid rgba(255,255,255,.055)}
.v5-recovery-item:last-child{border-bottom:0}
.v5-recovery-file{display:flex;align-items:center;gap:10px;color:#b9a7d2;min-width:0}
.v5-recovery-file>div{min-width:0}
.v5-recovery-file strong,.v5-recovery-file span{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.v5-recovery-file strong{font-size:11px;color:#f7f5fa}
.v5-recovery-file span{font-size:10px;color:#77707f;margin-top:3px}
.v5-recovery-progress{height:4px;background:#19151f;border-radius:10px;overflow:hidden;margin:11px 0 12px}
.v5-recovery-progress i{display:block;height:100%;background:linear-gradient(90deg,#4c2b81,#7650ad);border-radius:10px;transition:width .45s cubic-bezier(.22,1,.36,1)}
.v5-recovery-resume{height:34px;border:1px solid rgba(118,80,173,.45);background:#17131e;color:#f7f5fa;border-radius:7px;padding:0 10px;display:inline-flex;align-items:center;gap:7px;font:600 10px inherit;cursor:pointer;transition:transform .24s cubic-bezier(.22,1,.36,1),background-color .24s ease,border-color .24s ease,box-shadow .24s ease}
.v5-recovery-resume:hover{transform:translateY(-1px);background:#1c1725;border-color:#7650ad;box-shadow:0 10px 28px rgba(76,43,129,.14)}
@keyframes v5-recovery-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@media(max-width:760px){.v5-recovery-head{padding:14px}.v5-recovery-item{padding:13px 14px 14px}.v5-recovery-resume{width:100%;justify-content:center;height:40px}}
@media(prefers-reduced-motion:reduce){.v5-recovery,.v5-recovery-resume,.v5-recovery-progress i{animation:none!important;transition:none!important}}
`
  source = source.replace('`\n.v5-shell{', '`\n' + styleBlock + '.v5-shell{')
}
fs.writeFileSync(workspace, source)

let css = fs.readFileSync(dropCss, 'utf8')
const marker = '/* v1.0 interaction polish */'
if (!css.includes(marker)) {
  css += `

${marker}
.client-btn,.client-item,.client-breadcrumbs button,.client-item-actions button,.client-dropzone,.client-dialog-close,.client-preview-top button{transition:transform .24s cubic-bezier(.22,1,.36,1),opacity .24s ease,background-color .24s ease,border-color .24s ease,color .24s ease,box-shadow .24s ease}
.client-item{animation:client-item-in .34s cubic-bezier(.22,1,.36,1) both}
.client-item:nth-child(2){animation-delay:.025s}.client-item:nth-child(3){animation-delay:.05s}.client-item:nth-child(4){animation-delay:.075s}.client-item:nth-child(5){animation-delay:.1s}.client-item:nth-child(6){animation-delay:.125s}.client-item:nth-child(7){animation-delay:.15s}.client-item:nth-child(8){animation-delay:.175s}
.client-item:hover{transform:translateX(2px)}
.client-item-actions button:hover{transform:translateY(-1px) scale(1.04)}
.client-btn:hover{box-shadow:0 10px 30px rgba(76,43,129,.14)}
.client-dropzone:hover{transform:translateY(-1px);box-shadow:0 18px 50px rgba(76,43,129,.1)}
.client-dialog,.client-overlay .client-dialog{animation:client-dialog-in .34s cubic-bezier(.22,1,.36,1) both}
.client-overlay{animation:client-overlay-in .22s ease both}
.client-preview{animation:client-preview-in .3s cubic-bezier(.22,1,.36,1) both}
.client-recovery{animation:client-item-in .3s cubic-bezier(.22,1,.36,1) both}
@keyframes client-item-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@keyframes client-dialog-in{from{opacity:0;transform:translateY(12px) scale(.985)}to{opacity:1;transform:none}}
@keyframes client-overlay-in{from{opacity:0}to{opacity:1}}
@keyframes client-preview-in{from{opacity:0;transform:scale(1.01)}to{opacity:1;transform:none}}
@media(prefers-reduced-motion:reduce){.client-item,.client-dialog,.client-overlay,.client-preview,.client-recovery{animation:none!important}.client-btn,.client-item,.client-breadcrumbs button,.client-item-actions button,.client-dropzone{transition:none!important}}
`
  fs.writeFileSync(dropCss, css)
}
