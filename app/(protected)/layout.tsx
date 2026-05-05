import { AuthenticatedShell } from '@/components/layout/authenticated-shell'
import { getOptionalAuthenticatedUser } from '@/lib/auth/session'
import { getLocale } from '@/lib/i18n/server'

export const dynamic = 'force-dynamic'

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getOptionalAuthenticatedUser()
  const locale = await getLocale()

  if (!user) {
    return <>{children}</>
  }

  return (
    <AuthenticatedShell locale={locale} user={user}>
      {children}
    </AuthenticatedShell>
  )
}
