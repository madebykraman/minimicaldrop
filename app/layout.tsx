import type { Metadata } from 'next'
import './globals.css'
import './drop.css'

export const metadata: Metadata = {
  title: 'MINIMICAL DROP',
  description: 'Private client file delivery and upload portal by Minimical.',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>
}
