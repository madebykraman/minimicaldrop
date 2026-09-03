import Link from 'next/link'

export const metadata = { title: 'Terms — MINIMICAL DROP', robots: { index: true, follow: true } }

export default function Terms() {
  return <main className="legal-main">
    <Link href="/" className="legal-back">← MINIMICAL DROP</Link>
    <header className="legal-head"><div className="eyebrow">MINIMICAL DROP / TERMS</div><h1>Simple terms.<br />Clear boundaries.</h1><p>Last updated September 4, 2026. These terms govern use of DROP when it is provided as part of a Minimical project engagement.</p></header>
    <div className="legal-card">
      <section className="legal-section"><h2>1. Project use</h2><p>DROP is provided by The Minimical & Co. for project-related file exchange and delivery. Access is intended for the client and other people authorised by the client or Minimical for that project.</p></section>
      <section className="legal-section"><h2>2. Your responsibility</h2><p>You are responsible for keeping your project access link private and for only uploading material you are authorised to share. Do not use DROP to upload unlawful, malicious or abusive material, or material that infringes another person's rights.</p></section>
      <section className="legal-section"><h2>3. Project files</h2><p>Files remain subject to the ownership and intellectual-property arrangements applicable to the underlying project. Providing a file through DROP does not by itself transfer ownership or grant rights beyond the project purpose for which it was shared.</p></section>
      <section className="legal-section"><h2>4. Availability and storage</h2><p>DROP depends on third-party hosting, database and storage infrastructure. Minimical aims to keep project spaces available during the applicable engagement, but does not promise uninterrupted availability. Project spaces may expire, be disabled or be archived according to the project arrangement.</p></section>
      <section className="legal-section"><h2>5. Access changes</h2><p>Minimical may disable a project link when a project expires, is archived, requires security intervention or otherwise reaches the end of its agreed access period. If access is needed beyond that period, contact the Minimical team handling the project.</p></section>
      <section className="legal-section"><h2>6. Third-party services</h2><p>DROP currently uses Vercel, Supabase and Google infrastructure to operate hosting, application data and connected file storage. Those providers may apply their own terms to their respective services.</p></section>
      <section className="legal-section"><h2>7. Changes to DROP</h2><p>Minimical may improve, modify or retire parts of DROP as its project workflow evolves. Changes to the tool do not change the commercial terms of an underlying client engagement unless separately agreed.</p></section>
      <section className="legal-section"><h2>8. Contact</h2><p>Questions about a project workspace, access or these terms can be sent to <a href="mailto:contact@minimical.online">contact@minimical.online</a>.</p></section>
    </div>
    <footer className="legal-footer"><span>© 2026 THE MINIMICAL & CO.</span><Link href="/privacy">Privacy →</Link></footer>
  </main>
}
