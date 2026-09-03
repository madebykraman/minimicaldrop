const fs = require('node:fs')
const path = require('node:path')

const file = path.join(process.cwd(), 'app', 'admin', 'admin.css')
let css = fs.readFileSync(file, 'utf8')
const marker = '/* v1.1 admin login surface */'
if (!css.includes(marker)) {
  css += `

${marker}
.p5-login{position:relative!important;grid-template-columns:minmax(0,1fr) minmax(360px,440px)!important;align-items:center!important;gap:clamp(60px,10vw,150px)!important;padding:clamp(28px,6vw,80px) clamp(28px,7vw,110px)!important;overflow:hidden!important;background:#08070c!important}
.p5-login:before{content:"";position:absolute;inset:-20%;pointer-events:none;background:radial-gradient(circle at 72% 35%,rgba(76,43,129,.18),transparent 24%),radial-gradient(circle at 88% 80%,rgba(118,80,173,.11),transparent 28%);animation:p5-login-drift 12s ease-in-out infinite alternate}
.p5-login>*{position:relative;z-index:1}
.p5-login .p5-brand{position:absolute!important;top:30px!important;left:clamp(28px,7vw,110px)!important}
.p5-login-copy{max-width:650px!important;justify-self:end!important}
.p5-login-copy h1{font-size:clamp(58px,7vw,104px)!important;letter-spacing:-.075em!important;line-height:.86!important;margin:14px 0 18px!important}
.p5-login-copy p{max-width:480px!important;line-height:1.7!important}
.p5-login-form{width:100%!important;box-sizing:border-box!important;padding:30px!important;border:1px solid rgba(255,255,255,.09)!important;background:linear-gradient(145deg,rgba(22,17,29,.92),rgba(10,8,14,.92))!important;box-shadow:0 35px 100px rgba(0,0,0,.38)!important;backdrop-filter:blur(16px)!important;animation:p5-form-in .5s cubic-bezier(.22,1,.36,1) both}
.p5-login-form input{transition:border-color .22s ease,box-shadow .22s ease,background-color .22s ease}
.p5-login-form input:focus{box-shadow:0 0 0 3px rgba(118,80,173,.09)!important}
.p5-login-form>button{transition:transform .22s cubic-bezier(.22,1,.36,1),box-shadow .22s ease}
.p5-login-form>button:hover{transform:translateY(-1px);box-shadow:0 14px 36px rgba(76,43,129,.2)}
.p5-login-form>button:active{transform:scale(.99)}
@keyframes p5-login-drift{from{transform:translate3d(-2%,0,0) scale(1)}to{transform:translate3d(2%,1%,0) scale(1.04)}}
@keyframes p5-form-in{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
@media(max-width:800px){.p5-login{display:block!important;padding:100px 20px 40px!important}.p5-login .p5-brand{left:20px!important}.p5-login-copy{max-width:none!important}.p5-login-form{margin-top:38px!important}}
@media(prefers-reduced-motion:reduce){.p5-login:before,.p5-login-form{animation:none!important}.p5-login-form>button{transition:none!important}}
`
  fs.writeFileSync(file, css)
}
