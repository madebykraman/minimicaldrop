'use client'

import { usePathname } from 'next/navigation'
import DropIcon from './drop-icon'
import AdminDelivery from '@/app/admin/admin-delivery'

export default function GlobalChrome() {
  const pathname = usePathname()
  if (!pathname.startsWith('/admin')) return null
  return <><div className="drop-admin-app-icon" aria-hidden="true"><DropIcon size={22} priority /></div><AdminDelivery /></>
}
