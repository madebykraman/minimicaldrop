import Link from 'next/link'
import DropLogo from '@/components/drop-logo'
import DropIcon from '@/components/drop-icon'

export const metadata = {
  title: 'MINIMICAL DROP — Private project workspace',
  description: 'MINIMICAL DROP is the private project workspace used by Minimical to collect, work with, and deliver project files.',
  robots: { index: true, follow: true },
}

const steps = [
  { number: '01', title: 'Collect', copy: 'A private project space gives your team one clear place to send the files a project needs.' },
  { number: '02', title: 'Work', copy: 'Files stay organised around the project while Minimical handles the production work behind the scenes.' },
  { number: '03', title: 'Deliver', copy: 'Final assets return through the same project space, ready to review, download and keep.' },
]

export default function Home() {
  return (
    <main className="drop-home">
      <header className="drop-home-nav">
        <Link href="/" className="drop-home-brand" aria-label="MINIMICAL DROP home">
          <DropLogo width={128} sizes="(max-width: 700px) 104px, (max-width: 900px) 116px, 128px" priority />
        </Link>
        <div className="drop-home-nav-right">
          <span className="drop-home-nav-label">PRIVATE PROJECT INFRASTRUCTURE</span>
          <a href="https://minimical.online" target="_blank" rel="noreferrer" className="drop-home-nav-link">MINIMICAL ↗</a>
        </div>
      </header>

      <section className="drop-home-hero">
        <div className="drop-home-hero-copy">
          <div className="drop-home-kicker"><span className="drop-live" /> A MINIMICAL TOOL</div>
          <h1>The private space<br />between your project<br />and your files.</h1>
          <p>MINIMICAL DROP is the private project workspace we use with clients to collect, organise and deliver the files that move a project forward.</p>
          <div className="drop-home-actions">
            <a href="https://minimical.online" target="_blank" rel="noreferrer" className="drop-home-primary">Work with Minimical <span>↗</span></a>
            <a href="#how-it-works" className="drop-home-secondary">See how it works <span>↓</span></a>
          </div>
        </div>
        <div className="drop-home-hero-meta">
          <span>01 / PRIVATE BY DESIGN</span>
          <p>Your project gets its own temporary workspace. Access is shared directly by the Minimical team.</p>
        </div>
      </section>

      <section className="drop-home-showcase" aria-label="MINIMICAL DROP workspace preview">
        <div className="drop-window">
          <div className="drop-window-top">
            <div className="drop-window-brand"><DropIcon size={20} /><span>DROP</span></div>
            <div className="drop-window-project">PROJECT / BRAND FILM <span>PRIVATE</span></div>
          </div>
          <div className="drop-window-body">
            <div className="drop-window-intro">
              <div><span>YOUR PROJECT SPACE</span><h2>Everything the project needs.</h2></div>
              <div className="drop-window-storage"><span>STORAGE</span><strong>4.8 GB <i>/ 10 GB</i></strong><em><b /></em></div>
            </div>
            <div className="drop-window-upload"><div className="drop-upload-icon">↑</div><div><strong>Drop files here</strong><span>or choose files from your device</span></div><button>UPLOAD FILES</button></div>
            <div className="drop-window-files">
              <div className="drop-file"><span className="drop-file-icon">▱</span><div><strong>Brand-film_master_v03.mp4</strong><small>1.84 GB · VIDEO</small></div><b>READY</b></div>
              <div className="drop-file"><span className="drop-file-icon">□</span><div><strong>Campaign_Assets</strong><small>24 FILES · FOLDER</small></div><b>OPEN</b></div>
              <div className="drop-file"><span className="drop-file-icon">▤</span><div><strong>Brand_Guidelines.pdf</strong><small>8.4 MB · PDF</small></div><b>READY</b></div>
            </div>
          </div>
        </div>
      </section>

      <section className="drop-home-intro" id="how-it-works">
        <div className="drop-section-index">02 / HOW IT WORKS</div>
        <div><h2>One project.<br />Three simple moments.</h2><p>Drop stays out of the way. It exists to make the exchange around your Minimical project feel as considered as the work itself.</p></div>
      </section>

      <section className="drop-home-steps">
        {steps.map(step => <article key={step.number} className="drop-step"><span>{step.number}</span><h3>{step.title}</h3><p>{step.copy}</p></article>)}
      </section>

      <section className="drop-home-private">
        <div className="drop-private-mark"><DropIcon size={54} /></div>
        <div><span>03 / BUILT FOR MINIMICAL PROJECTS</span><h2>Private when it matters.<br />Quiet when it should be.</h2><p>DROP is operated as part of the Minimical client experience. There is no public sign-up, no marketplace and no extra platform to learn. When you work with us, your project gets a space.</p></div>
      </section>

      <section className="drop-home-cta">
        <span>HAVE A PROJECT IN MIND?</span>
        <h2>Let’s make something<br /><i>worth delivering.</i></h2>
        <a href="https://minimical.online" target="_blank" rel="noreferrer">Visit Minimical <span>↗</span></a>
      </section>

      <footer className="drop-home-footer">
        <span>© 2026 THE MINIMICAL & CO.</span>
        <div><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><a href="https://minimical.online" target="_blank" rel="noreferrer">MINIMICAL ↗</a></div>
        <span>DROP / PRIVATE PROJECT INFRASTRUCTURE</span>
      </footer>
    </main>
  )
}
