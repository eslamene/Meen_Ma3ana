import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { SpeedInsights } from '@vercel/speed-insights/next'
import './globals.css'
import { Toaster } from 'sonner'
import HeroUIProviderWrapper from '@/components/providers/HeroUIProviderWrapper'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Meen Ma3ana - Donation Platform',
  description: 'Empowering communities through charitable giving',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <HeroUIProviderWrapper>
        {children}
        <Toaster position="top-center" richColors />
        <SpeedInsights />
        </HeroUIProviderWrapper>
      </body>
    </html>
  )
} 