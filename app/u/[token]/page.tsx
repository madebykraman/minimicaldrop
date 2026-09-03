import WorkspaceV5 from './workspace-v5'

export default async function ClientProjectPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  return <WorkspaceV5 token={token} />
}
