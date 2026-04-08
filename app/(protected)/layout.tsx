import { AuthenticatedShell } from '@/components/layout/authenticated-shell'
import { getOptionalAuthenticatedUser } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getOptionalAuthenticatedUser()

  if (!user) {
    return <>{children}</>
  }

  return <AuthenticatedShell user={user}>{children}</AuthenticatedShell>
}
