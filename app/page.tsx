import Link from 'next/link'

export default function Home() {
  return <div className="shell">
    <header className="topbar"><div className="brand">MINIMICAL <span>DROP</span></div><div className="eyebrow">PRIVATE FILE DELIVERY</div></header>
    <main className="main">
      <section className="hero"><div><div className="eyebrow">MINIMICAL / CLIENT INFRASTRUCTURE</div><h1>Private delivery.<br/>Without the clutter.</h1></div><p>MINIMICAL DROP is the private workspace used to exchange project files with clients. Every delivery space is isolated, temporary and backed by studio storage.</p></section>
      <section className="landingCard">
        <div><div className="landingKicker">Secure project spaces</div><h2>Your project lives somewhere else.</h2><p>Client links open only the project they belong to. Files are transferred directly to the studio storage layer, while Google Drive credentials remain private to Minimical.</p><div className="landingStatus"><i/> Service online</div></div>
        <Link className="landingAction" href="/admin">Open control room</Link>
      </section>
      <footer className="landingFooter"><span>MINIMICAL DROP</span><span>Private project delivery</span></footer>
    </main>
  </div>
}
