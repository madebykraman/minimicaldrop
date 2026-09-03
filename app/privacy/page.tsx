export default function Privacy() {
  return <main className="main" style={{maxWidth:760}}>
    <div className="eyebrow">MINIMICAL DROP / PRIVACY</div>
    <h1 style={{fontSize:'clamp(46px,8vw,82px)',lineHeight:.9,letterSpacing:'-.07em',margin:'14px 0 28px'}}>Privacy, plainly.</h1>
    <section className="workspace" style={{padding:28,lineHeight:1.8,color:'#b8b0c2',fontSize:13}}>
      <p>MINIMICAL DROP is a private client file delivery service operated by Minimical.</p>
      <p>For the studio's Google Drive connection, the service uses Google OAuth to access the connected Drive account and create, read, rename and delete project files and folders. The connected account's refresh token is stored server-side and is never exposed to clients.</p>
      <p>Client project links contain a random access token. Only a one-way hash of that token is stored in the database. Project links can expire or be disabled by the studio.</p>
      <p>Client-uploaded files are transferred directly to the connected Google Drive storage. Minimical does not ask clients for Google Drive credentials.</p>
      <p>Operational records such as project metadata, upload status and audit events are stored in the service database. This information is used only to operate and secure the delivery service.</p>
    </section>
  </main>
}
