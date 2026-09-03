'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, Clock3, PackageCheck } from 'lucide-react'

type Props = { token: string }
type Data = { project?: { deliveryStatus?: string; clientMessage?: string | null } }

const labels: Record<string, string> = { in_progress: 'IN PROGRESS', ready: 'READY FOR DELIVERY', delivered: 'DELIVERED', archived: 'ARCHIVED' }

export default function ProjectStatus({ token }: Props) {
  const [data, setData] = useState<Data | null>(null)
  useEffect(() => {
    let active = true
    fetch(`/api/projects/${token}`).then(response => response.ok ? response.json() : null).then(value => { if (active) setData(value) }).catch(() => undefined)
    return () => { active = false }
  }, [token])

  const status = data?.project?.deliveryStatus || 'in_progress'
  const message = data?.project?.clientMessage?.trim()
  if (!message && status === 'in_progress') return null
  const Icon = status === 'delivered' ? PackageCheck : status === 'ready' ? CheckCircle2 : Clock3

  return <section aria-label="Project delivery status" style={{ maxWidth: 1180, margin: '0 auto 14px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, border: '1px solid rgba(118,80,173,.28)', borderRadius: 16, background: 'linear-gradient(135deg, rgba(76,43,129,.18), rgba(20,16,28,.86))', color: '#f7f5fa' }}>
    <div style={{ width: 34, height: 34, borderRadius: 10, display: 'grid', placeItems: 'center', background: 'rgba(118,80,173,.22)', color: '#c9b6e8', flex: '0 0 auto' }}><Icon size={17}/></div>
    <div style={{ minWidth: 0 }}>
      <span style={{ display: 'block', fontSize: 10, letterSpacing: '.14em', fontWeight: 700, opacity: .7 }}>{labels[status] || 'PROJECT STATUS'}</span>
      {message && <p style={{ margin: '4px 0 0', fontSize: 14, lineHeight: 1.5 }}>{message}</p>}
    </div>
  </section>
}
