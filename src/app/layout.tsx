import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'REGS XD — Key Management',
  description: 'License key dashboard for REGS XD Explorer',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
