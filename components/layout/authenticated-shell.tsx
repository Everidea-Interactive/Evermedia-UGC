import { AuthenticatedHeader } from '@/components/layout/authenticated-header'
import type { Locale } from '@/lib/i18n'
import type { AuthenticatedUserSummary } from '@/lib/persistence/types'

export function AuthenticatedShell({
  children,
  locale: _locale,
  user,
}: {
  children: React.ReactNode
  locale: Locale
  user: AuthenticatedUserSummary
}) {
  void _locale

  return (
    <div className="min-h-screen bg-background">
      <AuthenticatedHeader user={user} />

      {children}
    </div>
  )
}
