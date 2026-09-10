import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'MOD TOOLS — Key Management',
  description: 'License key dashboard for MOD TOOLS',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
