import { redirect } from 'next/navigation'
import { isAdmin } from '@/lib/admin-auth'

/** The public /admin page is the only login entry point.
 * Every operational subpage requires the signed admin session. */
export default async function ProtectedOperationsLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAdmin())) redirect('/admin')
  return children
}
