import WorkspaceV5 from './workspace-v5'
import ProjectStatus from './project-status'

export default async function ClientProjectPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  return <><ProjectStatus token={token} /><WorkspaceV5 token={token} /></>
}
