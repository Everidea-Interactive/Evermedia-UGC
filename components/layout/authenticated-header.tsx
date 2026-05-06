'use client'

import { useId, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { LogOut, Menu, X } from 'lucide-react'

import { useLocale } from '@/components/i18n/locale-provider'
import { LanguageSelector } from '@/components/i18n/language-selector'
import { KieCreditsChip } from '@/components/layout/kie-credits-chip'
import type { AuthenticatedUserSummary } from '@/lib/persistence/types'

const desktopNavLinkClass =
  'rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground'

const mobileNavLinkClass =
  'block rounded-xl border border-border/80 px-4 py-3 text-sm font-medium text-foreground transition-colors hover:border-foreground/20 hover:bg-muted/40'

const desktopSectionDividerClass = 'hidden lg:flex lg:items-center lg:border-l lg:border-border/70 lg:pl-4'
const signOutIconButtonClass =
  'inline-flex h-11 w-11 items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:border-foreground/20 hover:bg-muted/40 hover:text-foreground'

type AuthenticatedHeaderProps = {
  user: AuthenticatedUserSummary
}

export function AuthenticatedHeader({ user }: AuthenticatedHeaderProps) {
  const { dictionary } = useLocale()
  const copy = dictionary.shared
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const mobileMenuId = useId()
  const primaryNavItems = [
    { href: '/', label: copy.nav.studio },
    { href: '/library', label: copy.nav.library },
    ...(user.canManageAccounts ? [{ href: '/accounts', label: copy.nav.accounts }] : []),
  ]

  function closeMobileMenu() {
    setIsMobileMenuOpen(false)
  }

  return (
    <header className="border-b border-border/80 bg-background/95 backdrop-blur">
      <div className="mx-auto w-full max-w-[1500px] px-4 sm:px-6">
        <div className="flex items-center justify-between gap-4 py-3 sm:py-3.5">
          <div className="flex min-w-0 items-center gap-4 lg:gap-5">
            <Link
              className="inline-flex min-w-0 items-center gap-2.5 font-display text-lg font-semibold text-foreground"
              href="/"
              onClick={closeMobileMenu}
            >
              <Image
                alt="Evermedia Studio logo"
                className="h-6 w-6 shrink-0"
                height={24}
                priority
                src="/favicon.svg"
                width={24}
              />
              <span className="truncate">Evermedia Studio</span>
            </Link>

            <nav className="hidden items-center gap-2.5 lg:flex">
              {primaryNavItems.map((item) => (
                <Link className={desktopNavLinkClass} href={item.href} key={item.href}>
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3 lg:gap-5">
            <div className="hidden items-center gap-4 lg:flex lg:gap-5">
              <KieCreditsChip />

              <div className={desktopSectionDividerClass}>
                <LanguageSelector />
              </div>

              <div className="flex items-center gap-3.5 border-l border-border/70 pl-4">
                <div className="min-w-0 text-right">
                  <p className="truncate text-sm font-medium text-foreground">
                    {user.email ?? copy.nav.signedIn}
                  </p>
                </div>
                <form action="/api/auth/sign-out" method="post">
                  <button
                    aria-label={copy.nav.signOut}
                    className={signOutIconButtonClass}
                    type="submit"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </form>
              </div>
            </div>

            <button
              aria-controls={mobileMenuId}
              aria-expanded={isMobileMenuOpen}
              aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-border text-foreground transition-colors hover:border-foreground/20 hover:bg-muted/40 lg:hidden"
              onClick={() => {
                setIsMobileMenuOpen((current) => !current)
              }}
              type="button"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {isMobileMenuOpen ? (
          <div
            className="border-t border-border/80 pb-4 pt-4 lg:hidden"
            id={mobileMenuId}
          >
            <div className="flex flex-col gap-4">
              <div className="rounded-2xl border border-border/80 bg-muted/20 px-4 py-3">
                <KieCreditsChip />
              </div>

              <nav className="flex flex-col gap-2">
                {primaryNavItems.map((item) => (
                  <Link
                    className={mobileNavLinkClass}
                    href={item.href}
                    key={`mobile-${item.href}`}
                    onClick={closeMobileMenu}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>

              <div className="rounded-2xl border border-border/80 px-4 py-3">
                <LanguageSelector className="flex items-center justify-between gap-3 text-sm text-muted-foreground" />
              </div>

              <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/80 px-4 py-3">
                <div className="min-w-0">
                  <p className="break-all text-sm font-medium text-foreground">
                    {user.email ?? copy.nav.signedIn}
                  </p>
                </div>

                <form action="/api/auth/sign-out" className="shrink-0" method="post">
                  <button
                    aria-label={copy.nav.signOut}
                    className={signOutIconButtonClass}
                    type="submit"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </header>
  )
}
