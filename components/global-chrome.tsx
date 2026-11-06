'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import DropIcon from './drop-icon'
import AdminDelivery from '@/app/admin/admin-delivery'
import StudioOverview from '@/app/admin/studio-overview'

export default function GlobalChrome() {
  const pathname = usePathname()
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    if (!pathname.startsWith('/admin')) {
      setAuthorized(false)
      return
    }
    let cancelled = false
    // A database outage should not make a valid admin session appear logged out.
    fetch('/api/admin/session', { cache: 'no-store' })
      .then(response => {
        if (!cancelled) setAuthorized(response.ok)
      })
      .catch(() => {
        if (!cancelled) setAuthorized(false)
      })
    return () => { cancelled = true }
  }, [pathname])

  if (!pathname.startsWith('/admin') || !authorized) return null

  return <><div className="drop-admin-app-icon" aria-hidden="true"><DropIcon size={22} priority /></div><div className="drop-admin-tools"><StudioOverview /><AdminDelivery /></div></>
}
