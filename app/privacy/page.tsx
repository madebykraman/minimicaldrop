import Link from 'next/link'

export const metadata = { title: 'Privacy — MINIMICAL DROP', robots: { index: true, follow: true } }

export default function Privacy() {
  return <main className="legal-main">
    <Link href="/" className="legal-back">← MINIMICAL DROP</Link>
    <header className="legal-head"><div className="eyebrow">MINIMICAL DROP / PRIVACY</div><h1>Privacy,<br />plainly.</h1><p>Last updated September 4, 2026. This notice describes how Minimical operates DROP as part of its client project workflow.</p></header>
    <div className="legal-card">
      <section className="legal-section"><h2>1. What DROP is</h2><p>MINIMICAL DROP is a private project file workspace operated by The Minimical & Co. It is provided as part of Minimical client engagements for collecting, organising and delivering project files. There is no public client registration.</p></section>
      <section className="legal-section"><h2>2. Information we handle</h2><p>Depending on the project, DROP may process project name, client or company name, client email address, project access information, file names, file sizes, file types, folder structure, upload status and operational activity records. Access links contain random tokens that are used to open the relevant project workspace.</p></section>
      <section className="legal-section"><h2>3. Files and storage</h2><p>Files uploaded through a project workspace are transferred to the storage connected to that project. The current storage provider is Google Drive. Minimical controls the connected Drive account server-side and does not ask clients to provide their Google Drive credentials.</p></section>
      <section className="legal-section"><h2>4. Access and security</h2><p>Project access links are unique to their project and can be disabled or expired by Minimical. Only a one-way hash of the project access token is stored in the application database. Google OAuth credentials and other server secrets are not exposed to project visitors.</p></section>
      <section className="legal-section"><h2>5. Cookies and sessions</h2><p>DROP may use essential cookies for studio authentication and secure session handling. These are operational cookies required to protect the control room and are not used for advertising.</p></section>
      <section className="legal-section"><h2>6. Retention</h2><p>Project workspaces may have an expiry date and can be disabled or archived by Minimical. File retention follows the applicable project arrangement and the storage records maintained by the studio. If you need a file removed or need continued access after a project expires, contact the Minimical team managing your project.</p></section>
      <section className="legal-section"><h2>7. Third-party infrastructure</h2><p>DROP relies on infrastructure providers to operate the service, including Vercel for application hosting, Supabase for application data and Google for connected file storage and OAuth. Their own terms and privacy policies may also apply to the relevant processing.</p></section>
      <section className="legal-section"><h2>8. Contact</h2><p>For privacy, access or file-retention questions, contact The Minimical & Co. at <a href="mailto:contact@minimical.online">contact@minimical.online</a>.</p></section>
    </div>
    <footer className="legal-footer"><span>© 2026 THE MINIMICAL & CO.</span><Link href="/terms">Terms →</Link></footer>
  </main>
}
