import Link from 'next/link'
import DropLogo from '@/components/drop-logo'

export default function Home() {
  return <div className="shell">
    <header className="topbar">
      <Link href="/" className="brand"><DropLogo className="landing-logo" priority /></Link>
      <div className="eyebrow">PRIVATE PROJECT INFRASTRUCTURE</div>
    </header>
    <main className="main">
      <section className="hero">
        <div><div className="eyebrow">MINIMICAL / CLIENT INFRASTRUCTURE</div><h1>Let&apos;s make something <em>worth delivering.</em></h1></div>
        <p>DROP is the private project workspace used by Minimical to move the work that matters, without adding another platform to learn.</p>
      </section>

      <section className="landingCard">
        <div className="landingCardTop">
          <div><div className="landingKicker">Built for Minimical projects</div><h2>Your project gets its own private space.</h2><p>Clients use the link provided by the Minimical team to send files, receive work and keep project assets together. No public file marketplace. No account maze.</p><div className="landingStatus"><i/> Service online</div></div>
          <div className="landingActions"><Link className="landingAction" href="https://minimical.online">Work with Minimical ↗</Link><Link className="landingAction secondary" href="/privacy">Privacy &amp; terms</Link></div>
        </div>
        <div className="landingVisual" aria-label="MINIMICAL DROP workspace preview">
          <div className="landingVisualBar"><span>MINIMICAL DROP / PRIVATE PROJECT SPACE</span><div className="landingVisualDots"><i/><i/><i/></div></div>
          <div className="landingVisualBody"><div className="landingVisualDrop">Drop files here to send them to your project</div><div className="landingVisualRows"><div className="landingVisualRow"><strong>Campaign Master / 04</strong><b>2.4 GB</b></div><div className="landingVisualRow"><strong>Final Deliverables</strong><b>12 FILES</b></div><div className="landingVisualRow"><strong>Brand Assets</strong><b>READY</b></div></div></div>
        </div>
        <div className="landingSteps"><div className="landingStep"><span>01</span><h3>Collect</h3><p>Send source files, references and everything the project needs through one private link.</p></div><div className="landingStep"><span>02</span><h3>Work</h3><p>Minimical keeps the project organised while the files move through the studio workflow.</p></div><div className="landingStep"><span>03</span><h3>Deliver</h3><p>Final files come back through the same project space, ready for you to preview and download.</p></div></div>
      </section>

      <footer className="landingFooter"><div><strong>MINIMICAL DROP</strong><div>A private project workspace by The Minimical &amp; Co.</div></div><div>For clients with an active project, use the private Drop link provided by your Minimical team.</div><div className="landingFooterLinks"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="https://minimical.online">Minimical ↗</Link></div></footer>
    </main>
  </div>
}
