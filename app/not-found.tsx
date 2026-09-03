import DropLogo from '@/components/drop-logo'

export default function NotFound() {
  return <main className="main" style={{minHeight:'100vh',display:'grid',placeItems:'center',textAlign:'center'}}>
    <div><div className="not-found-brand"><DropLogo width={120} sizes="(max-width: 700px) 100px, 120px" priority /></div><div className="eyebrow">404 / NOT FOUND</div><h1 style={{fontSize:'clamp(48px,9vw,92px)',lineHeight:.9,letterSpacing:'-.07em',margin:'12px 0'}}>Private space<br/>not found.</h1><p className="hero p" style={{display:'block',maxWidth:420,margin:'18px auto 0'}}>This link may have expired, been disabled, or never existed.</p></div>
  </main>
}
