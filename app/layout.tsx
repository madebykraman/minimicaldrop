import type { Metadata } from 'next'
import appIcon from '@/assets/branding/04_drop_app_icon.png'
import GlobalChrome from '@/components/global-chrome'
import './globals.css'
import './brand.css'
import './home.css'
import './drop.css'
import './delivery.css'
import './legal.css'
import './admin/admin.css'
import './admin/admin-delivery.css'
import './admin/studio-overview.css'
import './finder-ui.css'
import './macos-polish.css'

export const metadata: Metadata = {
  title: 'MINIMICAL DROP',
  description: 'Private client file delivery and upload portal by Minimical.',
  icons: { icon: [{ url: appIcon.src, sizes: '512x512', type: 'image/png' }], apple: [{ url: appIcon.src, sizes: '180x180', type: 'image/png' }] },
  robots: { index: false, follow: false, nocache: true },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><GlobalChrome/>{children}</body></html>
}
