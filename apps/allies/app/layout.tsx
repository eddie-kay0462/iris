import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import { Toaster } from 'sonner'

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist-sans',
})

export const metadata: Metadata = {
  title: '1NRI&UA Allies Dashboard',
  description: 'Sales dashboard for 1NRI and Unlikely Alliances allies.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={geist.variable}>
      <body>
        {children}
        <Toaster position="bottom-right" richColors theme="system" toastOptions={{ duration: 4500 }} />
      </body>
    </html>
  )
}
