import type { Metadata } from 'next'
import { Manrope, Space_Grotesk } from 'next/font/google'

import { LocaleProvider } from '@/components/i18n/locale-provider'
import { getLocale } from '@/lib/i18n/server'

import './globals.css'

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-sans',
})

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
})

export const metadata: Metadata = {
  title: 'Evermedia Studio',
  description:
    'Dark, AI-native workspace for configuring image and video UGC generation flows.',
  icons: {
    icon: '/favicon.svg',
  },
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const locale = await getLocale()

  return (
    <html lang={locale} className="dark" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${manrope.variable} ${spaceGrotesk.variable} font-sans`}
      >
        <LocaleProvider locale={locale}>{children}</LocaleProvider>
      </body>
    </html>
  )
}
