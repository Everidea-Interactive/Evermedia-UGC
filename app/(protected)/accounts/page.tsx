import { AccountsManagementPage } from '@/components/accounts/accounts-management-page'
import { listManagedAccounts } from '@/lib/auth/access-repository'
import { requireAccountCapability } from '@/lib/auth/session'
import { getLocale } from '@/lib/i18n/server'

function getBannerCopy(
  _locale: string,
  params: Record<string, string | string[] | undefined>,
) {
  const error = typeof params.error === 'string' ? params.error : null
  const notice = typeof params.notice === 'string' ? params.notice : null

  if (error === 'last_super_admin') {
    return {
      tone: 'error' as const,
      text: 'You cannot remove or disable the last active super admin.',
    }
  }

  if (error === 'missing_service_role') {
    return {
      tone: 'error' as const,
      text: 'Configure SUPABASE_SERVICE_ROLE_KEY before using account management.',
    }
  }

  if (error) {
    return {
      tone: 'error' as const,
      text: 'The account request could not be completed.',
    }
  }

  if (notice === 'created') {
    return {
      tone: 'info' as const,
      text: 'Account created.',
    }
  }

  if (notice === 'password_updated') {
    return {
      tone: 'info' as const,
      text: 'Password updated.',
    }
  }

  if (notice === 'disabled') {
    return {
      tone: 'info' as const,
      text: 'Account disabled.',
    }
  }

  if (notice === 'enabled') {
    return {
      tone: 'info' as const,
      text: 'Account re-enabled.',
    }
  }

  if (notice === 'roles_updated') {
    return {
      tone: 'info' as const,
      text: 'Roles updated.',
    }
  }

  return null
}

export default async function AccountsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireAccountCapability('manage_accounts', '/accounts')

  const [locale, accounts, params] = await Promise.all([
    getLocale(),
    listManagedAccounts(),
    searchParams,
  ])
  const banner = getBannerCopy(locale, params)

  return <AccountsManagementPage accounts={accounts} banner={banner} />
}
