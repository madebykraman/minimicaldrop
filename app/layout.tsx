import type { Metadata } from 'next'
import './globals.css'
import './drop.css'
import './admin/admin.css'

export const metadata: Metadata = {
  title: 'MINIMICAL DROP',
  description: 'Private client file delivery and upload portal by Minimical.',
  robots: { index: false, follow: false, nocache: true },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>
}
