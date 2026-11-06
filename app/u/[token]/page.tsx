import WorkspaceV5 from './workspace-v5'
import DeliveryPanel from './delivery-panel'
import ClientExperience from './client-experience'

export default async function ClientProjectPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  return <ClientExperience><WorkspaceV5 token={token} deliveryPanel={<DeliveryPanel token={token} />} /></ClientExperience>
}
