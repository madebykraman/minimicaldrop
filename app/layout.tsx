import type { Metadata } from 'next'
import { DM_Mono, Manrope, Space_Grotesk } from 'next/font/google'
import appIcon from '@/assets/branding/04_drop_app_icon.png'
import GlobalChrome from '@/components/global-chrome'
import './globals.css'
import './brand.css'
import './home.css'
import './drop.css'
import './delivery.css'
import './admin/admin.css'
import './admin/admin-delivery.css'

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-display', display: 'swap' })
const manrope = Manrope({ subsets: ['latin'], variable: '--font-body', display: 'swap' })
const dmMono = DM_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-mono', display: 'swap' })

export const metadata: Metadata = {
  title: 'MINIMICAL DROP',
  description: 'Private client file delivery and upload portal by Minimical.',
  icons: { icon: [{ url: appIcon.src, sizes: '512x512', type: 'image/png' }], apple: [{ url: appIcon.src, sizes: '180x180', type: 'image/png' }] },
  robots: { index: false, follow: false, nocache: true },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={`${spaceGrotesk.variable} ${manrope.variable} ${dmMono.variable}`}><body><GlobalChrome/>{children}</body></html>
}
