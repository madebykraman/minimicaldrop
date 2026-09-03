'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, Clock3, PackageCheck } from 'lucide-react'

type Props = { token: string }
type Data = { project?: { deliveryStatus?: string; clientMessage?: string | null } }

const labels: Record<string, string> = {
  in_progress: 'IN PROGRESS',
  ready: 'READY FOR DELIVERY',
  delivered: 'DELIVERED',
  archived: 'ARCHIVED',
}

export default function ProjectStatus({ token }: Props) {
  const [data, setData] = useState<Data | null>(null)

  useEffect(() => {
    let active = true
    fetch(`/api/projects/${token}`)
      .then(response => response.ok ? response.json() : null)
      .then(value => { if (active) setData(value) })
      .catch(() => undefined)
    return () => { active = false }
  }, [token])

  const status = data?.project?.deliveryStatus || 'in_progress'
  const message = data?.project?.clientMessage?.trim()
  if (!message && status === 'in_progress') return null

  const Icon = status === 'delivered' ? PackageCheck : status === 'ready' ? CheckCircle2 : Clock3
  return <section className="v5-status-card" aria-label="Project delivery status">
    <div className="v5-status-icon"><Icon size={17}/></div>
    <div className="v5-status-copy">
      <span>{labels[status] || 'PROJECT STATUS'}</span>
      {message && <p>{message}</p>}
    </div>
  </section>
}
