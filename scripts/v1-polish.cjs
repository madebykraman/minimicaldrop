const fs = require('node:fs')
const path = require('node:path')

const root = process.cwd()
const workspace = path.join(root, 'app', 'u', '[token]', 'workspace-v5.tsx')
const dropCss = path.join(root, 'app', 'drop.css')

let source = fs.readFileSync(workspace, 'utf8')
source = source.replace('const CHUNK = 1024 * 1024', 'const CHUNK = 8 * 1024 * 1024')
fs.writeFileSync(workspace, source)

let css = fs.readFileSync(dropCss, 'utf8')
const marker = '/* v1.0 interaction polish */'
if (!css.includes(marker)) {
  css += `\n\n${marker}\n.client-btn,.client-item,.client-breadcrumbs button,.client-item-actions button,.client-dropzone,.client-dialog-close,.client-preview-top button{transition:transform .24s cubic-bezier(.22,1,.36,1),opacity .24s ease,background-color .24s ease,border-color .24s ease,color .24s ease,box-shadow .24s ease}\n.client-item{animation:client-item-in .34s cubic-bezier(.22,1,.36,1) both}\n.client-item:nth-child(2){animation-delay:.025s}.client-item:nth-child(3){animation-delay:.05s}.client-item:nth-child(4){animation-delay:.075s}.client-item:nth-child(5){animation-delay:.1s}.client-item:nth-child(6){animation-delay:.125s}.client-item:nth-child(7){animation-delay:.15s}.client-item:nth-child(8){animation-delay:.175s}\n.client-item:hover{transform:translateX(2px)}\n.client-item-actions button:hover{transform:translateY(-1px) scale(1.04)}\n.client-btn:hover{box-shadow:0 10px 30px rgba(76,43,129,.14)}\n.client-dropzone:hover{transform:translateY(-1px);box-shadow:0 18px 50px rgba(76,43,129,.1)}\n.client-dialog,.client-overlay .client-dialog{animation:client-dialog-in .34s cubic-bezier(.22,1,.36,1) both}\n.client-overlay{animation:client-overlay-in .22s ease both}\n.client-preview{animation:client-preview-in .3s cubic-bezier(.22,1,.36,1) both}\n.client-recovery{animation:client-item-in .3s cubic-bezier(.22,1,.36,1) both}\n@keyframes client-item-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}\n@keyframes client-dialog-in{from{opacity:0;transform:translateY(12px) scale(.985)}to{opacity:1;transform:none}}\n@keyframes client-overlay-in{from{opacity:0}to{opacity:1}}\n@keyframes client-preview-in{from{opacity:0;transform:scale(1.01)}to{opacity:1;transform:none}}\n@media(prefers-reduced-motion:reduce){.client-item,.client-dialog,.client-overlay,.client-preview,.client-recovery{animation:none!important}.client-btn,.client-item,.client-breadcrumbs button,.client-item-actions button,.client-dropzone{transition:none!important}}\n`
  fs.writeFileSync(dropCss, css)
}
