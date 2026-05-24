import type { Metadata } from 'next'
import { Inter, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import { AppShell } from '@/components/app-shell'
import { getAllProfileBundles } from '@/lib/db/bundle'

const inter = Inter({ 
  subsets: ["latin"],
  variable: '--font-inter',
});

const geistMono = Geist_Mono({ 
  subsets: ["latin"],
  variable: '--font-geist-mono',
});

export const metadata: Metadata = {
  title: 'Career AI Companion',
  description: 'Coaching di carriera basato su AI per studenti universitari',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const bundles = await getAllProfileBundles()

  return (
    <html lang="it" className={`${inter.variable} ${geistMono.variable} bg-background`}>
      <body className="font-sans antialiased">
        <AppShell initialBundles={bundles}>{children}</AppShell>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
