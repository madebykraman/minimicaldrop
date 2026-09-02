import Workspace from './workspace'

export default async function ClientProjectPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  return <Workspace token={token} />
}
