import WorkspaceV5 from './workspace-v5'
import ProjectStatus from './project-status'
import ClientExperience from './client-experience'
import ClientVisualOverrides from './client-visual-overrides'

export default async function ClientProjectPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  return <><ClientVisualOverrides/><ClientExperience token={token}><ProjectStatus token={token} /><WorkspaceV5 token={token} /></ClientExperience></>
}
