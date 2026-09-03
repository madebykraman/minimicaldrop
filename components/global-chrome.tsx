'use client'

import { usePathname } from 'next/navigation'
import DropLogo from './drop-logo'

export default function GlobalChrome() {
  const pathname = usePathname()
  if (!pathname.startsWith('/admin')) return null
  return <><div className="drop-admin-logo"><DropLogo width={150}/></div><style>{`.p5-admin .p5-brand{visibility:hidden!important}.drop-admin-logo{position:fixed;left:34px;top:21px;width:150px;height:32px;display:flex;align-items:center;z-index:20;pointer-events:none}.drop-admin-logo img{width:150px!important;height:auto!important;object-fit:contain}@media(max-width:700px){.drop-admin-logo{left:18px;top:17px;width:130px}.drop-admin-logo img{width:130px!important}}`}</style></>
}
