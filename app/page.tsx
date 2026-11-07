import Link from 'next/link'
import { ArrowRight, ArrowUpRight, Check, CloudUpload, FileText, Film, Folder, LockKeyhole } from 'lucide-react'
import DropIcon from '@/components/drop-icon'

export const metadata = {
  title: 'MINIMICAL DROP — Simple private file sharing',
  description: 'A calm, private workspace to share, organise and deliver files with Minimical.',
  robots: { index: true, follow: true },
}

const benefits = [
  { number: '01', title: 'Share', description: 'Send what the project needs, in one place.' },
  { number: '02', title: 'Organise', description: 'Keep files and folders easy to find.' },
  { number: '03', title: 'Deliver', description: 'Review and download the final work.' },
]

export default function Home() {
  return (
    <main className="mac-home">
      <header className="mac-home-header">
        <Link href="/" className="mac-home-brand" aria-label="Minimical Drop home"><DropIcon size={35} className="mac-home-brand-icon"/><strong>minimical<span>drop</span></strong></Link>
        <nav aria-label="Main navigation"><span>Private client workspace</span><a href="https://minimical.online" target="_blank" rel="noopener noreferrer">Minimical <ArrowUpRight size={15}/></a></nav>
      </header>
      <section className="mac-home-hero">
        <div className="mac-home-copy">
          <div className="mac-home-eyebrow"><span/> PRIVATE BY DESIGN</div>
          <h1>Files, without<br/>the fuss.</h1>
          <p>A simple, considered place to exchange everything your Minimical project needs. Share, organise and deliver — without the clutter.</p>
          <div className="mac-home-actions">
            <a href="https://minimical.online" target="_blank" rel="noopener noreferrer" className="mac-home-primary">Start a project <ArrowUpRight size={17}/></a>
            <a href="#how-it-works" className="mac-home-secondary">How it works <ArrowRight size={17}/></a>
          </div>
          <p className="mac-home-private"><LockKeyhole size={14}/> Each project has a private, invite-only link.</p>
        </div>
        <div className="mac-home-preview" aria-label="Illustration of a client project file manager">
          <div className="mac-preview-bar"><div className="mac-preview-dots" aria-hidden="true"><i/><i/><i/></div><span><Folder size={13}/> Project files</span><LockKeyhole size={13}/></div>
          <div className="mac-preview-body">
            <div className="mac-preview-heading"><span>YOUR PROJECT</span><strong>Campaign assets</strong><small>Everything in one place.</small></div>
            <div className="mac-preview-toolbar"><span><CloudUpload size={16}/> Drop files here</span><span className="mac-preview-action">Upload files</span></div>
            <div className="mac-preview-section-title">Files <span>3 items</span></div>
            <div className="mac-preview-files">
              <div><span className="mac-preview-folder"><Folder size={28} strokeWidth={1.65}/></span><strong>Final delivery</strong><small>Folder</small></div>
              <div><span className="mac-preview-image"><Film size={27} strokeWidth={1.65}/></span><strong>Brand film.mp4</strong><small>Video</small></div>
              <div><span className="mac-preview-document"><FileText size={27} strokeWidth={1.65}/></span><strong>Guidelines.pdf</strong><small>Document</small></div>
            </div>
            <div className="mac-preview-foot"><Check size={14}/> Your workspace is private and ready.</div>
          </div>
        </div>
      </section>
      <section className="mac-home-how" id="how-it-works">
        <div className="mac-home-how-head"><span>HOW IT WORKS</span><h2>Three simple steps.</h2></div>
        <div className="mac-home-benefits">{benefits.map(item => <article key={item.number}><span>{item.number}</span><h3>{item.title}</h3><p>{item.description}</p></article>)}</div>
      </section>
      <footer className="mac-home-footer"><span>© {new Date().getFullYear()} Minimical. Made for better collaboration.</span><nav aria-label="Footer"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><a href="https://minimical.online" rel="noopener noreferrer" target="_blank">Minimical <ArrowUpRight size={13}/></a></nav></footer>
    </main>
  )
}
