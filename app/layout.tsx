import type { Metadata } from 'next'
import { Manrope, Space_Grotesk } from 'next/font/google'

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
  title: 'Evermedia UGC Studio',
  description:
    'Dark, AI-native workspace for configuring image and video UGC generation flows.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${manrope.variable} ${spaceGrotesk.variable} font-sans`}
      >
        {children}
      </body>
    </html>
  )
}
